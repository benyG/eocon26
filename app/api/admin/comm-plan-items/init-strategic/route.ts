import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { PLAN_STRATEGIC_ITEMS } from "@/lib/commPlanSeed";

export const dynamic = "force-dynamic";

// Places every priority-1 targeted-publication channel on the unified calendar,
// dated to the phase it belongs to and STAGGERED across several days (one
// spearhead at a time, but never all channels dumped on a single day).
//
// Matched by title (the platform name is stable/unique). Never touches an item
// once it has left "pending_setup" (configured/done/skipped) — only items still
// awaiting configuration are corrected in place if the source data changed
// (e.g. this exact date-spreading fix). Never deletes.
export async function POST(req: NextRequest) {
  if (!(await hasPermission("strategic-plan", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.commPlanItem.findMany({
    where: { channelType: "targeted" },
    select: { id: true, title: true, date: true, phase: true, axis: true, status: true },
  });
  const byTitle = new Map(existing.map((e) => [e.title, e]));

  let added = 0;
  let corrected = 0;
  let skipped = 0;

  for (const c of PLAN_STRATEGIC_ITEMS) {
    const found = byTitle.get(c.platform);
    if (!found) {
      await prisma.commPlanItem.create({
        data: {
          date: new Date(`${c.date}T09:00:00`),
          channelType: "targeted",
          title: c.platform,
          axis: c.category,
          phase: c.phase,
          status: "pending_setup",
          strategicChannelKey: c.platform,
        },
      });
      added++;
      continue;
    }
    if (found.status !== "pending_setup") { skipped++; continue; } // already acted on — leave untouched
    const currentDate = found.date.toISOString().slice(0, 10);
    if (currentDate !== c.date || found.phase !== c.phase || found.axis !== c.category) {
      await prisma.commPlanItem.update({
        where: { id: found.id },
        data: { date: new Date(`${c.date}T09:00:00`), phase: c.phase, axis: c.category },
      });
      corrected++;
    } else {
      skipped++;
    }
  }

  return NextResponse.json({ added, corrected, skipped, total: PLAN_STRATEGIC_ITEMS.length });
}
