import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

// Turns a "pending_setup" email plan item into a real Campaign draft, using the
// content snapshot stored on the item. The team still reviews/edits and sends
// it from Communication → Campagnes as usual — this only creates the draft.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("campaigns", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = parseInt(params.id);

  const item = await prisma.commPlanItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (item.channelType !== "email") return NextResponse.json({ error: "Cet item n'est pas un email" }, { status: 400 });
  if (item.campaignId) return NextResponse.json({ error: "Campagne déjà créée pour cet item" }, { status: 409 });
  if (!item.emailSubjectFr) return NextResponse.json({ error: "Aucun contenu email sur cet item" }, { status: 400 });

  const campaign = await prisma.campaign.create({
    data: {
      name: `[Plan] ${item.title}`,
      subject: item.emailSubjectFr,
      subjectEn: item.emailSubjectEn,
      htmlBody: item.emailBodyFr || "",
      htmlBodyEn: item.emailBodyEn,
      // emailSegment already holds the ready-to-store JSON (e.g. {"audience":"registrations","hasCtf":true}).
      segment: item.emailSegment || JSON.stringify({ audience: "newsletter" }),
      status: "draft",
    },
  });

  const updated = await prisma.commPlanItem.update({
    where: { id },
    data: { campaignId: campaign.id, status: "scheduled" },
  });

  return NextResponse.json({ item: updated, campaign });
}
