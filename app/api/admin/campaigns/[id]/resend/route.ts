import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { wrapCampaignHtml } from "@/lib/email";
import { parseSegment, resolveRecipients, personalize, pickContent, getReplyTo } from "@/lib/campaignRecipients";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function getFrom(): string {
  return process.env.EMAIL_FROM || "EOCON <noreply@eyesopensecurity.com>";
}

// Re-send an already-sent campaign to a filtered subset:
//   mode=undelivered → recipients with status="failed" or no log entry (never successfully sent)
//   mode=unclicked   → recipients with status="sent" but no click recorded
//
// Note: deliveredAt is only set when a Resend delivery webhook fires. Without webhooks
// configured, it stays null even for successfully sent emails, so we use status="failed"
// as the criterion for "undelivered" instead of checking deliveredAt.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("campaigns", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = parseInt(params.id);
  const { mode } = await req.json().catch(() => ({ mode: "undelivered" }));
  if (mode !== "undelivered" && mode !== "unclicked") {
    return NextResponse.json({ error: "mode invalide" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (campaign.status !== "sent") {
    return NextResponse.json({ error: "La campagne doit avoir été envoyée avant un renvoi" }, { status: 409 });
  }

  // Build per-recipient state from the logs.
  // A recipient is considered "sent" if their latest log entry has status="sent".
  // We take the latest log per recipient to handle multiple send attempts.
  const logs = await prisma.emailLog.findMany({
    where: { campaignId: id },
    orderBy: { id: "asc" },
    select: { recipient: true, status: true, clickedAt: true },
  });

  // Keep only the latest log entry per recipient.
  const latestLog = new Map<string, { status: string; clickedAt: Date | null }>();
  for (const l of logs) {
    latestLog.set(l.recipient.toLowerCase(), { status: l.status, clickedAt: l.clickedAt });
  }

  // Re-resolve the full segment to get names/orgs for personalization.
  const seg = parseSegment(campaign.segment);
  const all = await resolveRecipients(seg);

  // Filter to the targeted subset.
  const recipients = all.filter((r) => {
    const email = r.email.toLowerCase();
    const log = latestLog.get(email);
    if (mode === "undelivered") {
      // Target: failed sends or recipients not yet in the log at all.
      return !log || log.status === "failed";
    } else {
      // mode === "unclicked": successfully sent but never clicked.
      return log?.status === "sent" && !log.clickedAt;
    }
  });

  if (!recipients.length) {
    return NextResponse.json({ error: "Aucun destinataire à recontacter pour ce filtre" }, { status: 400 });
  }

  const replyTo = getReplyTo(seg);
  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0, failed = 0;

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
      await Promise.all(batch.map(async (r, idx) => {
        const resendId = (res.data as Array<{ id: string }> | null)?.[idx]?.id ?? null;
        await prisma.emailLog.create({
          data: { campaignId: id, recipient: r.email, subject: emails[idx].subject, status: "sent", resendId },
        });
        sent++;
      }));
    } catch {
      await Promise.all(batch.map(async (r, idx) => {
        await prisma.emailLog.create({
          data: { campaignId: id, recipient: r.email, subject: emails[idx].subject, status: "failed" },
        });
        failed++;
      }));
    }

    if (i + BATCH_SIZE < recipients.length) await new Promise(res => setTimeout(res, 1000));
  }

  return NextResponse.json({ sent, failed, total: recipients.length, mode });
}
