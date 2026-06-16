import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

function getFrom(): string {
  return process.env.EMAIL_FROM || "EOCON 2026 <noreply@eyesopensecurity.com>";
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("communication", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { templateId } = await req.json();

  const template = await prisma.emailTemplate.findUnique({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  let emails: string[] = [];
  if (template.segment === "all" || template.segment === "registered") {
    const regs = await prisma.registration.findMany({ select: { email: true } });
    emails = Array.from(new Set(regs.map(r => r.email)));
  } else if (template.segment === "newsletter") {
    const subs = await prisma.newsletterSubscriber.findMany({ select: { email: true } });
    emails = subs.map(s => s.email);
  } else if (template.segment === "cfp_accepted") {
    const cfps = await prisma.cFPSubmission.findMany({ where: { status: "accepted" }, select: { email: true } });
    emails = cfps.map(c => c.email);
  } else if (template.segment === "volunteers") {
    const vols = await prisma.volunteerApplication.findMany({ where: { status: "accepted" }, select: { email: true } });
    emails = vols.map(v => v.email);
  }

  if (!emails.length) return NextResponse.json({ error: "No recipients found" }, { status: 400 });

  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  let failed = 0;

  const chunks: string[][] = [];
  for (let i = 0; i < emails.length; i += 50) chunks.push(emails.slice(i, i + 50));

  for (const chunk of chunks) {
    for (const email of chunk) {
      try {
        await resend.emails.send({ from: getFrom(), to: email, subject: template.subject, html: template.htmlBody });
        await prisma.emailLog.create({ data: { templateId, recipient: email, subject: template.subject, status: "sent" } });
        sent++;
      } catch {
        await prisma.emailLog.create({ data: { templateId, recipient: email, subject: template.subject, status: "failed" } });
        failed++;
      }
    }
  }

  await prisma.emailTemplate.update({ where: { id: templateId }, data: { sentAt: new Date() } });
  return NextResponse.json({ sent, failed, total: emails.length });
}
