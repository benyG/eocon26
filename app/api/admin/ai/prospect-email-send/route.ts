import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await hasPermission("prospection", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { to, subject, body, org } = await req.json() as { to: string; subject: string; body: string; org: string };
  if (!to || !subject || !body) return NextResponse.json({ error: "to, subject, body requis" }, { status: 400 });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromAddress = process.env.EMAIL_FROM_SPEAKERS || "EOCON 2026 <speakers@eyesopensecurity.com>";

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: [to],
    replyTo: "speakers@eyesopensecurity.com",
    subject,
    text: body,
    html: `<pre style="font-family:sans-serif;white-space:pre-wrap;font-size:14px;line-height:1.6">${body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`,
    tags: [{ name: "type", value: "prospect" }, { name: "org", value: (org || "").slice(0, 64) }],
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  logAction(req, "EMAIL_SENT", "speaker-prospect", null, { to, org, subject });
  return NextResponse.json({ success: true });
}
