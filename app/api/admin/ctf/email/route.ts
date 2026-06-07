import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const FROM = process.env.EMAIL_FROM || "EOCON 2026 <noreply@eyesopensecurity.com>";
const REPLY_TO = "contact@eyesopensecurity.com";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { registrationId, templateKey } = await req.json() as { registrationId: number; templateKey: string };

  const reg = await prisma.registration.findUnique({ where: { id: registrationId } });
  if (!reg) return NextResponse.json({ error: "Registration not found" }, { status: 404 });

  const lang = reg.langExpression === "en" ? "en" : "fr";

  // Fetch template from EventSetting
  const settingKey = `emailTemplate_${templateKey}`;
  const setting = await prisma.eventSetting.findUnique({ where: { key: settingKey } });
  if (!setting) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  let tpl: { subjectFr: string; subjectEn: string; bodyFr: string; bodyEn: string };
  try { tpl = JSON.parse(setting.value); } catch {
    return NextResponse.json({ error: "Invalid template JSON" }, { status: 500 });
  }

  const subject = lang === "en" ? tpl.subjectEn : tpl.subjectFr;
  const body = lang === "en" ? tpl.bodyEn : tpl.bodyFr;

  // Replace vars
  const vars: Record<string, string> = {
    fname: reg.fname,
    lname: reg.lname,
    email: reg.email,
    ctfCompetitorName: reg.ctfCompetitorName || "",
    ctfTeamName: reg.ctfTeamName || "",
  };

  const rendered = body.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");
  const renderedSubject = subject.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || "");

  const resend = new Resend(process.env.RESEND_API_KEY || "");
  await resend.emails.send({ from: FROM, to: reg.email, subject: renderedSubject, html: rendered, replyTo: REPLY_TO });

  return NextResponse.json({ ok: true });
}
