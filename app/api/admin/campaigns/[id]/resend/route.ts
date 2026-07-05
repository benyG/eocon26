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
//   mode=undelivered → recipients whose email was never delivered (no delivered log)
//   mode=unclicked   → recipients delivered but who never clicked a link
// Personalization is preserved by re-resolving the segment and intersecting by email.
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

  // Build per-recipient delivery/click state from the logs.
  const logs = await prisma.emailLog.findMany({
    where: { campaignId: id },
    select: { recipient: true, deliveredAt: true, clickedAt: true },
  });
  const delivered = new Set<string>(), clicked = new Set<string>(), known = new Set<string>();
  for (const l of logs) {
    const r = l.recipient.toLowerCase();
    known.add(r);
    if (l.deliveredAt) delivered.add(r);
    if (l.clickedAt) clicked.add(r);
  }

  // Target set of emails to retarget.
  const targets = new Set<string>();
  for (const r of Array.from(known)) {
    if (mode === "undelivered" && !delivered.has(r)) targets.add(r);
    if (mode === "unclicked" && delivered.has(r) && !clicked.has(r)) targets.add(r);
  }
  if (targets.size === 0) {
    return NextResponse.json({ error: "Aucun destinataire à recontacter pour ce filtre" }, { status: 400 });
  }

  // Re-resolve recipients (with names/org) and keep only the targeted emails.
  const seg = parseSegment(campaign.segment);
  const all = await resolveRecipients(seg);
  const recipients = all.filter(r => targets.has(r.email.toLowerCase()));
  if (!recipients.length) {
    return NextResponse.json({ error: "Aucun destinataire à recontacter pour ce filtre" }, { status: 400 });
  }

  const replyTo = getReplyTo(seg);

  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0, failed = 0;
  for (let i = 0; i < recipients.length; i += 50) {
    const batch = recipients.slice(i, i + 50);
    await Promise.all(batch.map(async (r) => {
      const c = pickContent(campaign, r.lang);
      const html = await wrapCampaignHtml(personalize(c.htmlBody, r), c.lang);
      const subject = personalize(c.subject, r);
      try {
        const res = await resend.emails.send({ from: getFrom(), to: r.email, subject, html, ...(replyTo ? { replyTo } : {}) });
        await prisma.emailLog.create({ data: { campaignId: id, recipient: r.email, subject, status: "sent", resendId: res.data?.id ?? null } });
        sent++;
      } catch {
        await prisma.emailLog.create({ data: { campaignId: id, recipient: r.email, subject, status: "failed" } });
        failed++;
      }
    }));
    if (i + 50 < recipients.length) await new Promise(res => setTimeout(res, 600));
  }

  return NextResponse.json({ sent, failed, total: recipients.length, mode });
}
