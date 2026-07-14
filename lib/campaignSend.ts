import { prisma } from "@/lib/db";
import { wrapCampaignHtml } from "@/lib/email";
import { parseSegment, resolveRecipients, personalize, pickContent, getReplyTo } from "@/lib/campaignRecipients";
import { Resend } from "resend";

function getFrom(): string {
  return process.env.EMAIL_FROM || "EOCON 2026 <noreply@eyesopensecurity.com>";
}

export interface CampaignSendResult {
  sent: number;
  failed: number;
  total: number;
  campaign: unknown;
}

// Actually send a campaign: resolve recipients from its segment, batch-send via
// Resend, log every recipient, and flip status draft→sending→sent/failed.
// Shared by the interactive send route and the approval-approval handler so the
// two paths stay identical. Throws (with a `.code`) on precondition failures.
export async function executeCampaignSend(campaignId: number): Promise<CampaignSendResult> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) { const e = new Error("Not found") as Error & { code?: string }; e.code = "not_found"; throw e; }
  if (campaign.status === "sent" || campaign.status === "sending") {
    const e = new Error("Campagne déjà envoyée ou en cours") as Error & { code?: string }; e.code = "already_sent"; throw e;
  }

  const seg = parseSegment(campaign.segment);
  const recipients = await resolveRecipients(seg);
  if (!recipients.length) { const e = new Error("Aucun destinataire pour ce segment") as Error & { code?: string }; e.code = "no_recipients"; throw e; }

  const replyTo = getReplyTo(seg);

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "sending", recipientCount: recipients.length, sentCount: 0, failedCount: 0 },
  });

  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  let failed = 0;

  // Resend batch API (up to 100/call) to avoid the rate-limit errors that happen
  // when firing 50 parallel individual sends.
  const BATCH_SIZE = 100;
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    const emails = await Promise.all(batch.map(async (r) => {
      const c = pickContent(campaign, r.lang);
      const html = await wrapCampaignHtml(personalize(c.htmlBody, r), c.lang);
      const subject = personalize(c.subject, r);
      return { from: getFrom(), to: r.email, subject, html, ...(replyTo ? { replyTo } : {}) };
    }));

    try {
      const res = await resend.batch.send(emails);
      await prisma.emailLog.createMany({
        data: batch.map((r, idx) => ({
          campaignId, recipient: r.email, subject: emails[idx].subject, status: "sent",
          resendId: (res.data as Array<{ id: string }> | null)?.[idx]?.id ?? null,
        })),
      });
      sent += batch.length;
    } catch {
      await prisma.emailLog.createMany({
        data: batch.map((r, idx) => ({ campaignId, recipient: r.email, subject: emails[idx].subject, status: "failed" })),
      });
      failed += batch.length;
    }

    if (i + BATCH_SIZE < recipients.length) await new Promise(res => setTimeout(res, 1000));
  }

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: failed === recipients.length ? "failed" : "sent", sentCount: sent, failedCount: failed, sentAt: new Date() },
  });

  return { sent, failed, total: recipients.length, campaign: updated };
}
