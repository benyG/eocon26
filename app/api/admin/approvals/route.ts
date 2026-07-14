import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { getCurrentAdminFlags } from "@/lib/approvals";

export const dynamic = "force-dynamic";

// List approval requests. Visible to communication/campaigns readers and to any
// designated approver. Each request is enriched with a small snapshot of the
// held resource so the approver can review it without extra round-trips.
export async function GET(req: NextRequest) {
  const flags = await getCurrentAdminFlags();
  const canView = !!flags && (flags.isApprover || (await hasPermission("communication", "read")) || (await hasPermission("campaigns", "read")));
  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status"); // e.g. "pending"

  const requests = await prisma.approvalRequest.findMany({
    where: statusFilter ? { status: statusFilter } : {},
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  const socialIds = requests.filter(r => r.targetType === "SocialPost").map(r => r.targetId);
  const campaignIds = requests.filter(r => r.targetType === "Campaign").map(r => r.targetId);

  const [posts, campaigns] = await Promise.all([
    socialIds.length
      ? prisma.socialPost.findMany({ where: { id: { in: socialIds } }, select: { id: true, platform: true, lang: true, content: true, imageUrl: true, scheduledAt: true, status: true } })
      : Promise.resolve([]),
    campaignIds.length
      ? prisma.campaign.findMany({ where: { id: { in: campaignIds } }, select: { id: true, name: true, subject: true, status: true, segment: true } })
      : Promise.resolve([]),
  ]);
  const postMap = new Map(posts.map(p => [p.id, p]));
  const campMap = new Map(campaigns.map(c => [c.id, c]));

  const enriched = requests.map(r => ({
    ...r,
    target: r.targetType === "SocialPost" ? postMap.get(r.targetId) ?? null : campMap.get(r.targetId) ?? null,
  }));

  return NextResponse.json({ requests: enriched, canApprove: !!flags?.isApprover });
}
