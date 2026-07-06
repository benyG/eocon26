import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { buildDocument } from "@/lib/buildDocument";
import { docType } from "@/lib/documentTemplates";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

// Email a generated document (as PDF attachment) to a prospect / sponsor / supplier.
export async function POST(req: NextRequest, { params }: { params: { type: string } }) {
  if (!(await hasPermission("documents", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const dt = docType(params.type);
  if (!dt) return NextResponse.json({ error: "Unknown document type" }, { status: 400 });

  const { sponsorId, prospectId, lang: langIn, recipient, subject, message } = await req.json();
  const lang = langIn === "en" ? "en" : "fr";

  let doc;
  try {
    doc = await buildDocument({ type: params.type, sponsorId, prospectId, lang });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Generation failed" }, { status: 400 });
  }

  const to = (recipient || doc.recipientEmail || "").trim();
  if (!to) return NextResponse.json({ error: "No recipient email" }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Email service not configured" }, { status: 503 });

  const name = lang === "en" ? dt.nameEn : dt.nameFr;
  const subj = (subject || `EOCON 2026 — ${name}`).trim();
  const bodyText = (message || (lang === "en"
    ? `Hello,\n\nPlease find attached the ${name} for EOCON 2026.\n\nBest regards,\nEOCON 2026 Partnerships`
    : `Bonjour,\n\nVeuillez trouver ci-joint le document « ${name} » pour EOCON 2026.\n\nCordialement,\nL'équipe Partenariats EOCON 2026`)).toString();
  const html = `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#111;padding:24px;white-space:pre-wrap;">${bodyText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body></html>`;
  const from = process.env.EMAIL_FROM_SPONSORS || "EOCON 2026 <sponsors@eyesopensecurity.com>";

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from, to, subject: subj, html, replyTo: "sponsors@eyesopensecurity.com",
      attachments: [{ filename: doc.filename, content: doc.buffer }],
    });
  } catch (e) {
    console.error("[documents send]", e);
    return NextResponse.json({ error: "Send failed" }, { status: 502 });
  }

  await prisma.emailLog.create({ data: { recipient: to, subject: subj, status: "sent" } }).catch(() => {});
  logAction(req, "CREATE", "document", params.type, { sent: true, to, lang });
  return NextResponse.json({ success: true, to, docNumber: doc.docNumber });
}
