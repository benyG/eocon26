import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { wrapCampaignHtml } from "@/lib/email";
import { parseSegment, resolveRecipients, personalize, pickContent, getReplyTo } from "@/lib/campaignRecipients";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
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

  const seg = parseSegment(campaign.segment);
  const recipients = await resolveRecipients(seg);
  if (!recipients.length) return NextResponse.json({ error: "Aucun destinataire pour ce segment" }, { status: 400 });

  const replyTo = getReplyTo(seg);

  await prisma.campaign.update({
    where: { id },
    data: { status: "sending", recipientCount: recipients.length, sentCount: 0, failedCount: 0 },
  });

  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  let failed = 0;

  // Use Resend batch API (up to 100 per call, single HTTP request) to avoid rate-limit
  // errors that happen when firing 50 parallel individual sends.
  const BATCH_SIZE = 100;
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    // Build all email objects for this batch (personalization + HTML wrapping).
    const emails = await Promise.all(batch.map(async (r) => {
      const c = pickContent(campaign, r.lang);
      const html = await wrapCampaignHtml(personalize(c.htmlBody, r), c.lang);
      const subject = personalize(c.subject, r);
      return { from: getFrom(), to: r.email, subject, html, ...(replyTo ? { replyTo } : {}) };
    }));

    try {
      const res = await resend.batch.send(emails);
      // Log all recipients in a single query (one connection) — firing 100 concurrent
      // creates exhausts the pool (P2024).
      await prisma.emailLog.createMany({
        data: batch.map((r, idx) => ({
          campaignId: id, recipient: r.email, subject: emails[idx].subject, status: "sent",
          resendId: (res.data as Array<{ id: string }> | null)?.[idx]?.id ?? null,
        })),
      });
      sent += batch.length;
    } catch {
      await prisma.emailLog.createMany({
        data: batch.map((r, idx) => ({ campaignId: id, recipient: r.email, subject: emails[idx].subject, status: "failed" })),
      });
      failed += batch.length;
    }

    // Brief pause between batches to stay within Resend's per-second limits.
    if (i + BATCH_SIZE < recipients.length) await new Promise(res => setTimeout(res, 1000));
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data: { status: failed === recipients.length ? "failed" : "sent", sentCount: sent, failedCount: failed, sentAt: new Date() },
  });

  return NextResponse.json({ sent, failed, total: recipients.length, campaign: updated });
}
