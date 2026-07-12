import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { PLAN_STRATEGIC_ITEMS } from "@/lib/commPlanSeed";

export const dynamic = "force-dynamic";

// Places every priority-1 targeted-publication channel on the unified calendar,
// dated to the phase it belongs to (one spearhead at a time — no all-channels-
// at-once). Purely ADDITIVE: dedup by (title, date), never deletes.
export async function POST(req: NextRequest) {
  if (!(await hasPermission("strategic-plan", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.commPlanItem.findMany({
    where: { channelType: "targeted" },
    select: { title: true, date: true },
  });
  const existingKeys = new Set(existing.map((e) => `${e.title}::${e.date.toISOString().slice(0, 10)}`));

  const toCreate = PLAN_STRATEGIC_ITEMS.filter((c) => !existingKeys.has(`${c.platform}::${c.date}`));

  if (toCreate.length) {
    await prisma.commPlanItem.createMany({
      data: toCreate.map((c) => ({
        date: new Date(`${c.date}T09:00:00`),
        channelType: "targeted",
        title: c.platform,
        axis: c.category,
        phase: c.phase,
        status: "pending_setup",
        strategicChannelKey: c.platform,
      })),
    });
  }

  return NextResponse.json({ added: toCreate.length, skipped: PLAN_STRATEGIC_ITEMS.length - toCreate.length, total: PLAN_STRATEGIC_ITEMS.length });
}
