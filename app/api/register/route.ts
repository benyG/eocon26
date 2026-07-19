export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendRegistrationTicket, sendWatcherRecruitment } from "@/lib/email";
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
    const { email, org, country, ticketType, lang_expression, linkedin, whatsapp, ctfCompetitorName, ctfTeamName } = body;
    let { fname, lname } = body;

    if (!email || !ticketType) {
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

    // Pre-registration = the visitor registers interest (notified on launch). It applies
    // when nothing is on sale at all, OR when the visitor explicitly submits the
    // `pre_registration` sentinel. The sentinel lets the CTF-only ticket sell on its own
    // while the general audience keeps pre-registering (their door has no ticket yet).
    const dbTicketTypes = await prisma.ticketType.findMany({ where: { isVisible: true }, select: { slug: true } });
    const preRegistration = ticketType === "pre_registration" || dbTicketTypes.length === 0;

    // When it's a real purchase, the selected type must be a visible ticket.
    if (!preRegistration && !dbTicketTypes.map(t => t.slug).includes(ticketType)) {
      return NextResponse.json({ error: "Type de billet invalide" }, { status: 400 });
    }
    if (String(ticketType).length > 80) {
      return NextResponse.json({ error: "Type de billet invalide" }, { status: 400 });
    }

    // Resolve the ticket type (also used for pricing). A "CTF-only" ticket grants
    // CTF access but neither sessions nor workshops — for those, the identity is the
    // CTF handle, so first/last name are not collected and are derived here.
    const ticketTypeRow = preRegistration ? null : await prisma.ticketType.findUnique({ where: { slug: ticketType } });
    const isCtfOnly = !!ticketTypeRow && ticketTypeRow.includesCTF && !ticketTypeRow.includesSessions && !ticketTypeRow.includesWorkshops;
    const hasCtfHandle = !!(ctfCompetitorName && String(ctfCompetitorName).trim());
    // Identity via the CTF handle for a CTF-only ticket sale, OR a CTF-door
    // pre-registration (interest captured with a handle but no first/last name).
    if (isCtfOnly || (preRegistration && hasCtfHandle && (!fname || !lname))) {
      if (!hasCtfHandle) {
        return NextResponse.json({ error: "Pseudo CTF requis" }, { status: 400 });
      }
      fname = String(ctfCompetitorName).slice(0, 80);
      lname = ctfTeamName ? String(ctfTeamName).slice(0, 80) : "—";
    } else if (!fname || !lname) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }
    if (String(fname).length > 80 || String(lname).length > 80) {
      return NextResponse.json({ error: "Nom trop long" }, { status: 400 });
    }

    const rawRef = generateTicketRef();
    const ticketRef = formatTicketRef(rawRef);
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

    // Auto-subscribe every registrant (incl. pre-registrations) to the newsletter.
    // Idempotent by email; never overwrites an existing subscriber, and a failure
    // here must not break the registration.
    try {
      await prisma.newsletterSubscriber.upsert({
        where: { email },
        create: {
          email,
          firstName: fname.slice(0, 80),
          lastName: lname.slice(0, 80),
          company: org?.slice(0, 200) || undefined,
          linkedin: linkedin?.slice(0, 191) || undefined,
          source: "registration",
        },
        update: {},
      });
    } catch (e) {
      console.error("[Register newsletter subscribe]", e);
    }

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
      // CTF access → also send The Watcher's initiation transmission (auto).
      if (ticketTypeRow?.includesCTF) {
        sendWatcherRecruitment(email, ctfCompetitorName || fname, lang_expression === "en" ? "en" : "fr")
          .catch(e => console.error("[Watcher recruitment email]", e));
      }
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
