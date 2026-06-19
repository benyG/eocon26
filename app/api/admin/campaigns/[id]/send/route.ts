import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { wrapCampaignHtml } from "@/lib/email";
import { parseSegment, resolveRecipients, personalize } from "@/lib/campaignRecipients";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
// Sending can take a while for large lists.
export const maxDuration = 300;

function getFrom(): string {
  return process.env.EMAIL_FROM || "EOCON 2026 <noreply@eyesopensecurity.com>";
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("campaigns", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = parseInt(params.id);

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (campaign.status === "sent" || campaign.status === "sending") {
    return NextResponse.json({ error: "Campagne déjà envoyée ou en cours" }, { status: 409 });
  }

  const recipients = await resolveRecipients(parseSegment(campaign.segment));
  if (!recipients.length) return NextResponse.json({ error: "Aucun destinataire pour ce segment" }, { status: 400 });

  await prisma.campaign.update({
    where: { id },
    data: { status: "sending", recipientCount: recipients.length, sentCount: 0, failedCount: 0 },
  });

  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  let failed = 0;

  // Throttle: 50 per batch, brief pause between batches to respect rate limits.
  for (let i = 0; i < recipients.length; i += 50) {
    const batch = recipients.slice(i, i + 50);
    await Promise.all(batch.map(async (r) => {
      const html = wrapCampaignHtml(personalize(campaign.htmlBody, r));
      const subject = personalize(campaign.subject, r);
      try {
        const res = await resend.emails.send({ from: getFrom(), to: r.email, subject, html });
        await prisma.emailLog.create({ data: { campaignId: id, recipient: r.email, subject, status: "sent", resendId: res.data?.id ?? null } });
        sent++;
      } catch {
        await prisma.emailLog.create({ data: { campaignId: id, recipient: r.email, subject, status: "failed" } });
        failed++;
      }
    }));
    if (i + 50 < recipients.length) await new Promise(res => setTimeout(res, 600));
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data: { status: failed === recipients.length ? "failed" : "sent", sentCount: sent, failedCount: failed, sentAt: new Date() },
  });

  return NextResponse.json({ sent, failed, total: recipients.length, campaign: updated });
}
