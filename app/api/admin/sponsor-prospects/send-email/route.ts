import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

// Sponsorship deck files, committed under /docs/ and read at runtime.
const DECK_FILES = [
  "EOCON26_Deck_Sponsoring_FR.pptx",
  "EOCON26_Sponsorship_Deck_EN.pdf",
];

// Send a (chosen) email to a sponsor prospect, optionally attaching the decks.
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, subject, body, attachDecks, markContacted } = await req.json();
  if (!id || !subject || !body) {
    return NextResponse.json({ error: "id, subject et body requis" }, { status: 400 });
  }

  const prospect = await prisma.sponsorProspect.findUnique({ where: { id: Number(id) } });
  if (!prospect) return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });
  if (!prospect.email) return NextResponse.json({ error: "Ce prospect n'a pas d'adresse email" }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Service email non configuré" }, { status: 503 });

  // Attach decks if requested (attach whichever exist).
  const attachments: { filename: string; content: Buffer }[] = [];
  if (attachDecks) {
    const dir = path.join(process.cwd(), "docs");
    for (const filename of DECK_FILES) {
      try {
        attachments.push({ filename, content: await fs.readFile(path.join(dir, filename)) });
      } catch (e) {
        console.error("[prospect send-email] missing attachment", filename, e);
      }
    }
  }

  const from = process.env.EMAIL_FROM || "EOCON 2026 <noreply@eyesopensecurity.com>";
  // The body is plain text (AI output) — wrap it minimally, preserving line breaks.
  const html = `<!DOCTYPE html><html><body style="background:#030408;color:#fff;font-family:'Courier New',monospace;padding:32px;white-space:pre-wrap;">${String(body)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body></html>`;

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: prospect.email,
      subject,
      html,
      attachments: attachments.map(a => ({ filename: a.filename, content: a.content })),
    });
  } catch (e) {
    console.error("[prospect send-email]", e);
    return NextResponse.json({ error: "Échec de l'envoi" }, { status: 502 });
  }

  if (markContacted && (prospect.status === "prospect" || prospect.status === "demande")) {
    await prisma.sponsorProspect.update({ where: { id: prospect.id }, data: { status: "contacted" } });
  }

  logAction(req, "UPDATE", "sponsor", prospect.id, { sentEmail: true, attached: attachments.length });
  return NextResponse.json({ success: true, attached: attachments.length });
}
