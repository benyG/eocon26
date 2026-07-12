import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { PLAN_EMAIL_ITEMS } from "@/lib/commPlanSeed";

export const dynamic = "force-dynamic";

// Places every planned email touchpoint on the unified calendar as
// "pending_setup" — no Campaign is created yet, the team configures/validates
// each one from the calendar (or in bulk from Campagnes).
//
// Matched by title. Never touches an item once it has left "pending_setup"
// (a Campaign draft was created for it) — only items still awaiting
// configuration are corrected in place if the source data changed (new/edited
// items, e.g. the speaker/volunteer/CTF broadcasts added to close domain
// gaps). Never deletes.
export async function POST(req: NextRequest) {
  if (!(await hasPermission("campaigns", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.commPlanItem.findMany({
    where: { channelType: "email" },
    select: { id: true, title: true, date: true, axis: true, status: true, emailSubjectFr: true, emailSegment: true },
  });
  const byTitle = new Map(existing.map((e) => [e.title, e]));

  let added = 0;
  let corrected = 0;
  let skipped = 0;

  for (const e of PLAN_EMAIL_ITEMS) {
    const found = byTitle.get(e.title);
    if (!found) {
      await prisma.commPlanItem.create({
        data: {
          date: new Date(`${e.date}T09:00:00`),
          channelType: "email",
          title: e.title,
          axis: e.axis,
          status: "pending_setup",
          emailSubjectFr: e.subjectFr, emailSubjectEn: e.subjectEn,
          emailBodyFr: e.bodyFr, emailBodyEn: e.bodyEn,
          emailSegment: e.segment,
        },
      });
      added++;
      continue;
    }
    if (found.status !== "pending_setup") { skipped++; continue; } // a draft already exists — leave untouched
    const currentDate = found.date.toISOString().slice(0, 10);
    const drifted = currentDate !== e.date || found.axis !== e.axis || found.emailSubjectFr !== e.subjectFr || found.emailSegment !== e.segment;
    if (drifted) {
      await prisma.commPlanItem.update({
        where: { id: found.id },
        data: {
          date: new Date(`${e.date}T09:00:00`), axis: e.axis,
          emailSubjectFr: e.subjectFr, emailSubjectEn: e.subjectEn,
          emailBodyFr: e.bodyFr, emailBodyEn: e.bodyEn,
          emailSegment: e.segment,
        },
      });
      corrected++;
    } else {
      skipped++;
    }
  }

  return NextResponse.json({ added, corrected, skipped, total: PLAN_EMAIL_ITEMS.length });
}
