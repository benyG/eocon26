export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendRegistrationTicket } from "@/lib/email";
import { generateTicketRef, formatTicketRef } from "@/lib/ticketRef";
import { checkRateLimit, getIp } from "@/lib/rateLimit";
import { signPaymentToken } from "@/lib/paymentToken";
import { getEventSettings } from "@/lib/settings";
import { evaluateCfpWindow } from "@/lib/cfpWindow";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  if (!(await checkRateLimit(`register:${getIp(req)}`, 5, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de soumissions, réessayez plus tard." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { fname, lname, email, org, country, ticketType, lang_expression, linkedin, whatsapp, ctfCompetitorName, ctfTeamName } = body;

    if (!fname || !lname || !email || !ticketType) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    // Check registration window
    const regSettings = await getEventSettings().catch(() => ({} as Record<string, string>));
    const regWin = evaluateCfpWindow(regSettings.registration_open_date || "", regSettings.registration_close_date || "");
    const registrationClosed = regWin.hasWindow && !regWin.open;
    if (registrationClosed) {
      return NextResponse.json({ error: "Les inscriptions sont closes pour le moment." }, { status: 403 });
    }

    // Pre-registration mode: no ticket is on sale (none marked visible). The user
    // registers their interest and will be notified once tickets are activated.
    const dbTicketTypes = await prisma.ticketType.findMany({ where: { isVisible: true }, select: { slug: true } });
    const preRegistration = dbTicketTypes.length === 0;

    // When tickets are on sale, the selected type must be a real visible ticket.
    // In pre-registration mode any selected tier label is accepted (interest only).
    if (!preRegistration && !dbTicketTypes.map(t => t.slug).includes(ticketType)) {
      return NextResponse.json({ error: "Type de billet invalide" }, { status: 400 });
    }
    if (fname.length > 80 || lname.length > 80) {
      return NextResponse.json({ error: "Nom trop long" }, { status: 400 });
    }
    if (String(ticketType).length > 80) {
      return NextResponse.json({ error: "Type de billet invalide" }, { status: 400 });
    }

    const rawRef = generateTicketRef();
    const ticketRef = formatTicketRef(rawRef);

    // Resolve the active price (early-bird aware) for the selected ticket type.
    const ticketTypeRow = await prisma.ticketType.findUnique({ where: { slug: ticketType } });
    const now = new Date();
    const earlyBirdActive = !!(ticketTypeRow?.earlyBirdUntil && ticketTypeRow.earlyBirdUntil > now && ticketTypeRow.earlyBirdPriceFr);
    const amount = ticketTypeRow
      ? (earlyBirdActive ? (ticketTypeRow.earlyBirdPriceFr ?? ticketTypeRow.priceFr) : ticketTypeRow.priceFr)
      : 0;
    const isFree = !preRegistration && amount === 0;

    const registration = await prisma.registration.create({
      data: {
        fname: fname.slice(0, 80),
        lname: lname.slice(0, 80),
        email,
        org: org?.slice(0, 200),
        country: country?.slice(0, 100),
        ticketType,
        langExpression: lang_expression || "fr",
        ticketRef: rawRef,
        linkedin: linkedin?.slice(0, 191) || null,
        whatsapp: whatsapp?.slice(0, 191) || null,
        ctfCompetitorName: ctfCompetitorName?.slice(0, 191) || null,
        ctfTeamName: ctfTeamName?.slice(0, 30) || null,
        // No tickets on sale → pre_registered. Otherwise await payment (or confirm if free).
        status: preRegistration ? "pre_registered" : (isFree ? "paid" : "payment_pending"),
        ...(isFree ? { paymentProvider: "free", paidAt: new Date() } : {}),
      },
    });

    // ── No tickets on sale: send the "notify me when tickets are available" email ──
    if (preRegistration) {
      const isFr = lang_expression !== "en";
      const subject = isFr ? "✅ Pré-inscription EOCON 2026 confirmée" : "✅ EOCON 2026 Pre-registration confirmed";
      const body = isFr
        ? `<p>Bonjour <strong style="color:#00ff9d">${fname} ${lname}</strong>,</p>
           <p>Votre pré-inscription à EOCON 2026 a bien été enregistrée. Vous serez notifié(e) par email dès la mise en vente des billets.</p>
           <p style="color:#888;font-size:12px;">EOCON 2026 · Hotel Onomo, Douala · 28 Novembre 2026</p>`
        : `<p>Hello <strong style="color:#00ff9d">${fname} ${lname}</strong>,</p>
           <p>Your pre-registration for EOCON 2026 has been recorded. You will be notified by email when tickets go on sale.</p>
           <p style="color:#888;font-size:12px;">EOCON 2026 · Hotel Onomo, Douala · 28 November 2026</p>`;
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY || "");
      const FROM = process.env.EMAIL_FROM || "EOCON 2026 <noreply@eyesopensecurity.com>";
      resend.emails.send({
        from: FROM,
        to: email,
        subject,
        html: `<!DOCTYPE html><html><body style="background:#030408;color:#fff;font-family:'Courier New',monospace;padding:32px;">${body}</body></html>`,
      }).catch(e => console.error("[Pre-register email]", e));

      return NextResponse.json({ success: true, id: registration.id, preRegistered: true }, { status: 201 });
    }

    // ── Tickets on sale ──
    // Free ticket → confirmed immediately, send the ticket/badge email.
    // Paid ticket → no email here; the user is sent to the in-app payment step and
    // the confirmation email is only sent once the payment is validated.
    if (isFree) {
      sendRegistrationTicket(email, fname, lname, ticketType, registration.id, ticketRef, lang_expression === "en" ? "en" : "fr")
        .catch(e => console.error("[Register free ticket email]", e));
    }
    return NextResponse.json(
      { success: true, id: registration.id, ticketRef, ticketType, amount, isFree, paymentToken: signPaymentToken(registration.id) },
      { status: 201 },
    );
  } catch (err) {
    console.error("[Register]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
