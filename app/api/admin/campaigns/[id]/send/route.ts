import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { executeCampaignSend } from "@/lib/campaignSend";
import { getCurrentAdminFlags, createApprovalRequest } from "@/lib/approvals";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("campaigns", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = parseInt(params.id);

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (campaign.status === "sent" || campaign.status === "sending") {
    return NextResponse.json({ error: "Campagne déjà envoyée ou en cours" }, { status: 409 });
  }
  if (campaign.status === "pending_approval") {
    return NextResponse.json({ error: "Campagne déjà soumise à validation" }, { status: 409 });
  }

  // Validation constraint: hold the campaign for approval instead of sending.
  const flags = await getCurrentAdminFlags();
  if (flags?.requiresApproval) {
    await prisma.campaign.update({ where: { id }, data: { status: "pending_approval" } });
    await createApprovalRequest({
      kind: "campaign",
      action: "send",
      targetType: "Campaign",
      targetId: id,
      title: `Campagne « ${campaign.name} »`,
      requestedBy: flags.email,
    });
    return NextResponse.json({ held: true, message: "Soumis à validation avant envoi." }, { status: 202 });
  }

  try {
    const result = await executeCampaignSend(id);
    return NextResponse.json(result);
  } catch (err) {
    const e = err as Error & { code?: string };
    const status = e.code === "no_recipients" ? 400 : e.code === "already_sent" ? 409 : e.code === "not_found" ? 404 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
