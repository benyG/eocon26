export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendRegistrationPending } from "@/lib/email";
import { generateTicketRef, formatTicketRef } from "@/lib/ticketRef";
import { rateLimit, getIp } from "@/lib/rateLimit";
import { getEventSettings } from "@/lib/settings";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FALLBACK_TICKET_TYPES = ["standard", "student", "vip", "sponsor", "online", "early-bird"];

export async function POST(req: NextRequest) {
  if (!rateLimit(`register:${getIp(req)}`, 5, 60 * 60 * 1000)) {
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
    // Validate ticket type against DB or fallback list
    const dbTicketTypes = await prisma.ticketType.findMany({ where: { isVisible: true }, select: { slug: true } });
    const validSlugs = dbTicketTypes.length > 0 ? dbTicketTypes.map(t => t.slug) : FALLBACK_TICKET_TYPES;
    if (!validSlugs.includes(ticketType)) {
      return NextResponse.json({ error: "Type de billet invalide" }, { status: 400 });
    }
    if (fname.length > 80 || lname.length > 80) {
      return NextResponse.json({ error: "Nom trop long" }, { status: 400 });
    }

    const settings = await getEventSettings().catch(() => ({} as Record<string, string>));
    const officeOpen = settings.ticketOfficeOpen === "true";
    const lang: "fr" | "en" = lang_expression === "en" ? "en" : "fr";
    const isFr = lang === "fr";

    const rawRef = generateTicketRef();
    const ticketRef = formatTicketRef(rawRef);
    const registrationStatus = officeOpen ? "pending" : "pre_registered";

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
        status: registrationStatus,
        linkedin: linkedin?.slice(0, 191) || null,
        whatsapp: whatsapp?.slice(0, 191) || null,
        ctfCompetitorName: ctfCompetitorName?.slice(0, 191) || null,
        ctfTeamName: ctfTeamName?.slice(0, 30) || null,
      },
    });

    const paymentUrl = settings.url_inscription || "https://eyesopensecurity.com/#inscription";

    if (officeOpen) {
      sendRegistrationPending(email, fname, lname, ticketType, ticketRef, paymentUrl, lang).catch(e =>
        console.error("[Register email]", e),
      );
    } else {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY || "");
      const FROM = process.env.EMAIL_FROM || "EOCON 2026 <noreply@eyesopensecurity.com>";
      const subject = isFr ? "✅ Pré-inscription EOCON 2026 confirmée" : "✅ EOCON 2026 pre-registration confirmed";
      const html = isFr
        ? `<!DOCTYPE html><html><body style="background:#030408;color:#fff;font-family:'Courier New',monospace;padding:32px;"><p>Bonjour <strong style="color:#00ff9d">${fname} ${lname}</strong>,</p><p>Vous êtes pré-inscrit(e) à EOCON 2026. Le guichet est actuellement fermé.</p><p>Vous serez notifié(e) par email dès l'ouverture du guichet pour finaliser votre inscription.</p><p style="color:#888;font-size:12px;">EOCON 2026 · Hotel Onomo, Douala · 28 Novembre 2026</p></body></html>`
        : `<!DOCTYPE html><html><body style="background:#030408;color:#fff;font-family:'Courier New',monospace;padding:32px;"><p>Hello <strong style="color:#00ff9d">${fname} ${lname}</strong>,</p><p>You are pre-registered for EOCON 2026. The ticket office is currently closed.</p><p>You will be notified by email as soon as tickets become available.</p><p style="color:#888;font-size:12px;">EOCON 2026 · Hotel Onomo, Douala · 28 November 2026</p></body></html>`;
      resend.emails.send({ from: FROM, to: email, subject, html }).catch(e => console.error("[Register pre-reg email]", e));
    }

    return NextResponse.json({ success: true, id: registration.id, status: registrationStatus }, { status: 201 });
  } catch (err) {
    console.error("[Register]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
