import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";
import { followupResetFields, ACTIVE_FOLLOWUP_STATUSES } from "@/lib/sponsorFollowup";

export const dynamic = "force-dynamic";

// Sponsorship deck files, committed under /docs/ and read at runtime.
const DECK_FILES = [
  "EOCON_Deck_Sponsoring_FR.pdf",
  "EOCON_Sponsorship_Deck_EN.pdf",
];

// Send a (chosen) email to a sponsor prospect, optionally attaching the decks.
export async function POST(req: NextRequest) {
  const canWrite = (await hasPermission("prospection", "write")) || (await hasPermission("sponsor-pipeline", "write"));
  if (!canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const from = process.env.EMAIL_FROM_SPONSORS || "EOCON 2026 <sponsors@eyesopensecurity.com>";
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
      replyTo: process.env.EMAIL_REPLYTO_SPONSORS || "eocon@examboot.net",
      attachments: attachments.map(a => ({ filename: a.filename, content: a.content })),
    });
  } catch (e) {
    console.error("[prospect send-email]", e);
    return NextResponse.json({ error: "Échec de l'envoi" }, { status: 502 });
  }

  // Move fresh prospects to "contacted", and (re)start the follow-up cadence whenever
  // we reach out to an active-stage prospect so the J+2/J+5/J+10/J+15 clock is fresh.
  const movesToContacted = markContacted && (prospect.status === "prospect" || prospect.status === "demande");
  const effectiveStatus = movesToContacted ? "contacted" : prospect.status;
  const updateData: Record<string, unknown> = {};
  if (movesToContacted) updateData.status = "contacted";
  if (ACTIVE_FOLLOWUP_STATUSES.includes(effectiveStatus)) {
    Object.assign(updateData, followupResetFields(new Date(), prospect.contactedAt));
  }
  if (Object.keys(updateData).length > 0) {
    await prisma.sponsorProspect.update({ where: { id: prospect.id }, data: updateData });
  }

  logAction(req, "UPDATE", "sponsor", prospect.id, { sentEmail: true, attached: attachments.length });
  return NextResponse.json({ success: true, attached: attachments.length });
}
