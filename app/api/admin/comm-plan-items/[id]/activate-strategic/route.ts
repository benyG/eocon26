import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

const SETTING_KEY = "strategic_channels";

// Turns a "pending_setup" targeted-publication item into "in progress": bumps
// the channel's status in the strategic-plan tracker (same storage the Plan
// Stratégique page reads/writes) so the two stay in sync, and marks the plan
// item as scheduled. Configuration/execution still happens in Plan Stratégique.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("strategic-plan", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = parseInt(params.id);

  const item = await prisma.commPlanItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (item.channelType !== "targeted") return NextResponse.json({ error: "Cet item n'est pas une publication ciblée" }, { status: 400 });
  if (!item.strategicChannelKey) return NextResponse.json({ error: "Aucun canal associé à cet item" }, { status: 400 });

  const setting = await prisma.eventSetting.findUnique({ where: { key: SETTING_KEY } });
  const data = setting ? JSON.parse(setting.value) : { statuses: {}, urls: {}, custom: [], hidden: [] };
  data.statuses = data.statuses || {};
  // Never downgrade a channel that's already further along than "todo".
  if (!data.statuses[item.strategicChannelKey] || data.statuses[item.strategicChannelKey] === "todo") {
    data.statuses[item.strategicChannelKey] = "in-progress";
  }
  await prisma.eventSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(data) },
    create: { key: SETTING_KEY, value: JSON.stringify(data) },
  });

  const updated = await prisma.commPlanItem.update({ where: { id }, data: { status: "scheduled" } });
  return NextResponse.json(updated);
}
