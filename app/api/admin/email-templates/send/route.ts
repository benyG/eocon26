import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { wrapCampaignHtml } from "@/lib/email";
import { resolveRecipients, personalize, pickContent, getReplyTo, type CampaignSegment } from "@/lib/campaignRecipients";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function getFrom(): string {
  return process.env.EMAIL_FROM || "EOCON 2026 <noreply@eyesopensecurity.com>";
}

// Map the template's coarse segment string to a CampaignSegment audience so the
// quick-send path uses the same bilingual + personalized + wrapped pipeline as
// full campaigns (each recipient gets the FR/EN version matching their language).
function segmentToAudience(segment: string): CampaignSegment {
  switch (segment) {
    case "newsletter": return { audience: "newsletter" };
    case "cfp_accepted": return { audience: "cfp_accepted" };
    case "volunteers": return { audience: "volunteers" };
    default: return { audience: "registrations" }; // all | registered
  }
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("communication", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { templateId } = await req.json();

  const template = await prisma.emailTemplate.findUnique({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const seg = segmentToAudience(template.segment);
  const recipients = await resolveRecipients(seg);
  if (!recipients.length) return NextResponse.json({ error: "No recipients found" }, { status: 400 });

  const replyTo = getReplyTo(seg);

  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recipients.length; i += 50) {
    const batch = recipients.slice(i, i + 50);
    await Promise.all(batch.map(async (r) => {
      const c = pickContent(template, r.lang);
      const html = wrapCampaignHtml(personalize(c.htmlBody, r), c.lang);
      const subject = personalize(c.subject, r);
      try {
        const res = await resend.emails.send({ from: getFrom(), to: r.email, subject, html, ...(replyTo ? { replyTo } : {}) });
        await prisma.emailLog.create({ data: { templateId, recipient: r.email, subject, status: "sent", resendId: res.data?.id ?? null } });
        sent++;
      } catch {
        await prisma.emailLog.create({ data: { templateId, recipient: r.email, subject, status: "failed" } });
        failed++;
      }
    }));
    if (i + 50 < recipients.length) await new Promise(res => setTimeout(res, 600));
  }

  await prisma.emailTemplate.update({ where: { id: templateId }, data: { sentAt: new Date() } });
  return NextResponse.json({ sent, failed, total: recipients.length });
}
