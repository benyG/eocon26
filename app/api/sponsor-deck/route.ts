import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { rateLimit, getIp } from "@/lib/rateLimit";
import { cleanText, cleanOptional, cleanEmail, cleanPhone } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

// Sponsorship deck files, committed under /docs/ and read at runtime.
const DECK_FILES = [
  "EOCON_Deck_Sponsoring_FR.pdf",
  "EOCON_Sponsorship_Deck_EN.pdf",
];

export async function POST(req: NextRequest) {
  if (!rateLimit(`deck:${getIp(req)}`, 8, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Trop de requêtes, réessayez plus tard." }, { status: 429 });
  }
  const body = await req.json();
  const org = cleanText(body.org, 200);
  const email = cleanEmail(body.email);
  const lang = body.lang === "en" ? "en" : "fr";
  if (!org) return NextResponse.json({ error: "Organisation requise" }, { status: 400 });
  if (!email) return NextResponse.json({ error: "Email valide requis" }, { status: 400 });

  // Same processing as the "Devenir sponsor" form: record the prospect.
  const prospect = await prisma.sponsorProspect.create({
    data: {
      org,
      contact: cleanOptional(body.contact, 120),
      email,
      phone: cleanPhone(body.phone),
      package: null,
      notes: "Demande du dossier de sponsoring",
      status: "demande",
    },
  });

  // Read the deck files (attach whichever exist; the request still succeeds).
  const dir = path.join(process.cwd(), "docs");
  const attachments: { filename: string; content: Buffer }[] = [];
  for (const filename of DECK_FILES) {
    try {
      const content = await fs.readFile(path.join(dir, filename));
      attachments.push({ filename, content });
    } catch (e) {
      console.error("[sponsor-deck] missing attachment", filename, e);
    }
  }

  // Email the deck to the requester.
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const isFr = lang !== "en";
    const from = process.env.EMAIL_FROM || "EOCON 2026 <noreply@eyesopensecurity.com>";
    const subject = isFr
      ? "📂 Dossier de sponsoring EOCON 2026"
      : "📂 EOCON 2026 Sponsorship Deck";
    const body = isFr
      ? `<p>Bonjour <strong style="color:#00ff9d">${org.trim()}</strong>,</p>
         <p>Merci pour votre intérêt à soutenir EOCON 2026. Vous trouverez en pièce jointe notre dossier de sponsoring (versions française et anglaise).</p>
         <p>Notre équipe partenariats reste à votre disposition pour échanger sur la formule la plus adaptée.</p>
         <p style="color:#888;font-size:12px;">EOCON 2026 · Hotel Onomo, Douala · 28 Novembre 2026</p>`
      : `<p>Hello <strong style="color:#00ff9d">${org.trim()}</strong>,</p>
         <p>Thank you for your interest in supporting EOCON 2026. Please find attached our sponsorship deck (French and English versions).</p>
         <p>Our partnerships team is available to discuss the package that best fits your goals.</p>
         <p style="color:#888;font-size:12px;">EOCON 2026 · Hotel Onomo, Douala · November 28, 2026</p>`;
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from,
        to: email,
        subject,
        html: `<!DOCTYPE html><html><body style="background:#030408;color:#fff;font-family:'Courier New',monospace;padding:32px;">${body}</body></html>`,
        attachments: attachments.map(a => ({ filename: a.filename, content: a.content })),
      });
    } catch (e) {
      console.error("[sponsor-deck] email", e);
    }
  }

  return NextResponse.json({ success: true, id: prospect.id, attached: attachments.length }, { status: 201 });
}
