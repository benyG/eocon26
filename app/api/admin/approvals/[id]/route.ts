import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentAdminFlags } from "@/lib/approvals";
import { executeCampaignSend } from "@/lib/campaignSend";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // approving a campaign triggers the actual send

// Approve or reject a held communication.
//  - approve social "schedule"  → post back to "scheduled" (keeps its scheduledAt)
//  - approve social "publish"   → post to "scheduled" at now (cron publishes it within a minute)
//  - approve campaign "send"    → runs the real send immediately
//  - reject (either)            → resource back to "draft"
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const flags = await getCurrentAdminFlags();
  if (!flags?.isApprover) return NextResponse.json({ error: "Réservé aux approbateurs" }, { status: 403 });

  const id = parseInt(params.id);
  const { decision, note } = await req.json() as { decision: "approve" | "reject"; note?: string };
  if (decision !== "approve" && decision !== "reject") {
    return NextResponse.json({ error: "Décision invalide" }, { status: 400 });
  }

  const request = await prisma.approvalRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.status !== "pending") return NextResponse.json({ error: "Déjà traité" }, { status: 409 });

  const reviewer = flags.email || "approbateur";

  // Clear the bell notifications tied to this request for everyone.
  const clearNotifications = () =>
    prisma.adminNotification.updateMany({ where: { refType: "approval", refId: id }, data: { readAt: new Date() } }).catch(() => {});

  if (decision === "reject") {
    if (request.targetType === "SocialPost") {
      await prisma.socialPost.update({ where: { id: request.targetId }, data: { status: "draft" } });
    } else {
      await prisma.campaign.update({ where: { id: request.targetId }, data: { status: "draft" } });
    }
    const updated = await prisma.approvalRequest.update({
      where: { id },
      data: { status: "rejected", reviewedBy: reviewer, reviewedAt: new Date(), note: note || null },
    });
    await clearNotifications();
    logAction(req, "UPDATE", "approval", id, { decision: "reject" });
    return NextResponse.json({ request: updated });
  }

  // Approve — atomically claim the request first so two approvers acting at the
  // same instant can't both execute it (which for a campaign would double-send).
  const claim = await prisma.approvalRequest.updateMany({
    where: { id, status: "pending" },
    data: { status: "approved", reviewedBy: reviewer, reviewedAt: new Date(), note: note || null },
  });
  if (claim.count === 0) return NextResponse.json({ error: "Déjà traité" }, { status: 409 });

  try {
    if (request.targetType === "SocialPost") {
      let scheduledAt = new Date();
      if (request.action === "schedule") {
        // Prefer the payload date; fall back to the post's own scheduledAt.
        let payloadDate: string | undefined;
        try { payloadDate = request.payload ? (JSON.parse(request.payload) as { scheduledAt?: string }).scheduledAt : undefined; } catch { /* ignore */ }
        const post = await prisma.socialPost.findUnique({ where: { id: request.targetId }, select: { scheduledAt: true } });
        scheduledAt = payloadDate ? new Date(payloadDate) : (post?.scheduledAt ?? new Date());
      }
      await prisma.socialPost.update({ where: { id: request.targetId }, data: { status: "scheduled", scheduledAt } });
    } else {
      // Campaign — run the real send now.
      await executeCampaignSend(request.targetId);
    }
  } catch (err) {
    const e = err as Error & { code?: string };
    // Revert the claim so the request can be retried after fixing the cause.
    await prisma.approvalRequest.update({
      where: { id },
      data: { status: "pending", reviewedBy: null, reviewedAt: null, note: null },
    }).catch(() => {});
    return NextResponse.json({ error: `Échec de l'exécution : ${e.message}` }, { status: 500 });
  }

  await clearNotifications();
  logAction(req, "UPDATE", "approval", id, { decision: "approve" });
  const updated = await prisma.approvalRequest.findUnique({ where: { id } });
  return NextResponse.json({ request: updated });
}
