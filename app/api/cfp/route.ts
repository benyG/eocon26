export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendCFPConfirmation } from "@/lib/email";
import { rateLimit, getIp } from "@/lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_FORMATS = ["talk", "workshop", "panel", "lightning", "autre", "other", ""];

export async function POST(req: NextRequest) {
  if (!rateLimit(`cfp:${getIp(req)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Trop de soumissions, réessayez plus tard." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { name, email, org, country, talk_title, format, abstract, bio, lang_presentation, linkedin, twitter, whatsapp } = body;

    if (!name || !email || !talk_title || !abstract) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }
    if (format && !VALID_FORMATS.includes(format)) {
      return NextResponse.json({ error: "Format invalide" }, { status: 400 });
    }
    if (name.length > 120 || talk_title.length > 200) {
      return NextResponse.json({ error: "Champ trop long" }, { status: 400 });
    }
    if (abstract.length > 5000) {
      return NextResponse.json({ error: "Résumé trop long (max 5000 caractères)" }, { status: 400 });
    }
    if (bio && bio.length > 2000) {
      return NextResponse.json({ error: "Bio trop longue (max 2000 caractères)" }, { status: 400 });
    }

    const submission = await prisma.cFPSubmission.create({
      data: { name, email, org: org?.slice(0, 200), country: country?.slice(0, 100), talkTitle: talk_title, format, abstract, bio, linkedin, twitter, whatsapp, langPresentation: lang_presentation || "fr" },
    });

    sendCFPConfirmation(email, name, talk_title, lang_presentation === "en" ? "en" : "fr").catch(e => console.error("[CFP email]", e));

    return NextResponse.json({ success: true, id: submission.id }, { status: 201 });
  } catch (err) {
    console.error("[CFP]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
