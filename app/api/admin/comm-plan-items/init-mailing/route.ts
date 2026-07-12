import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { PLAN_EMAIL_ITEMS } from "@/lib/commPlanSeed";

export const dynamic = "force-dynamic";

// Places every planned email touchpoint on the unified calendar as
// "pending_setup" — no Campaign is created yet, the team configures/validates
// each one from the calendar (or in bulk from Campagnes). Purely ADDITIVE:
// dedup by (title, date), never deletes, safe to re-run if the plan evolves.
export async function POST(req: NextRequest) {
  if (!(await hasPermission("campaigns", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.commPlanItem.findMany({
    where: { channelType: "email" },
    select: { title: true, date: true },
  });
  const existingKeys = new Set(existing.map((e) => `${e.title}::${e.date.toISOString().slice(0, 10)}`));

  const toCreate = PLAN_EMAIL_ITEMS.filter((e) => !existingKeys.has(`${e.title}::${e.date}`));

  if (toCreate.length) {
    await prisma.commPlanItem.createMany({
      data: toCreate.map((e) => ({
        date: new Date(`${e.date}T09:00:00`),
        channelType: "email",
        title: e.title,
        axis: e.axis,
        status: "pending_setup",
        emailSubjectFr: e.subjectFr, emailSubjectEn: e.subjectEn,
        emailBodyFr: e.bodyFr, emailBodyEn: e.bodyEn,
        emailSegment: e.segment,
      })),
    });
  }

  return NextResponse.json({ added: toCreate.length, skipped: PLAN_EMAIL_ITEMS.length - toCreate.length, total: PLAN_EMAIL_ITEMS.length });
}
