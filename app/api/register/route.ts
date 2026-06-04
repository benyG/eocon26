export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendRegistrationPending } from "@/lib/email";
import { generateTicketRef, formatTicketRef } from "@/lib/ticketRef";
import { rateLimit, getIp } from "@/lib/rateLimit";
import { getEventSettings } from "@/lib/settings";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_TICKET_TYPES = ["standard", "student", "vip", "sponsor", "online", "early-bird"];

export async function POST(req: NextRequest) {
  if (!rateLimit(`register:${getIp(req)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Trop de soumissions, réessayez plus tard." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { fname, lname, email, org, country, ticketType, lang_expression, linkedin, whatsapp } = body;

    if (!fname || !lname || !email || !ticketType) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }
    if (!VALID_TICKET_TYPES.includes(ticketType)) {
      return NextResponse.json({ error: "Type de billet invalide" }, { status: 400 });
    }
    if (fname.length > 80 || lname.length > 80) {
      return NextResponse.json({ error: "Nom trop long" }, { status: 400 });
    }

    const rawRef = generateTicketRef();
    const ticketRef = formatTicketRef(rawRef);
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
      },
    });

    const settings = await getEventSettings().catch(() => ({} as Record<string, string>));
    const paymentUrl = settings.url_inscription || "https://eyesopensecurity.com/#inscription";

    sendRegistrationPending(email, fname, lname, ticketType, ticketRef, paymentUrl).catch(e =>
      console.error("[Register email]", e),
    );

    return NextResponse.json({ success: true, id: registration.id }, { status: 201 });
  } catch (err) {
    console.error("[Register]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
