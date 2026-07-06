import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendSponsorFollowupReminder } from "@/lib/email";
import { nextFollowup, ACTIVE_FOLLOWUP_STATUSES, parseStages } from "@/lib/sponsorFollowup";
import { getNextSponsorDeadline } from "@/lib/sponsorBilling";

export const dynamic = "force-dynamic";

// External cron: GET /api/cron/sponsor-followups?secret=CRON_SECRET (run hourly/daily).
// Sends the next due J+2/J+5/J+10/J+15 reminder to each prospect's assignee, then
// advances the followupStage CSV and schedules the following step.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const deadline = await getNextSponsorDeadline(now);
  const deadlineNote = deadline
    ? `Deadline ${deadline.labelFr} dans ${deadline.daysLeft} jour(s) — verrouillez ce partenariat à temps.`
    : undefined;

  const due = await prisma.sponsorProspect.findMany({
    where: {
      status: { in: ACTIVE_FOLLOWUP_STATUSES },
      nextFollowupAt: { not: null, lte: now },
      assigneeId: { not: null },
    },
    include: { assignee: true },
  });

  const results = { sent: 0, skipped: 0, completed: 0 };

  for (const p of due) {
    const current = nextFollowup(p.contactedAt, p.followupStage);
    if (!current) { // cadence exhausted — stop chasing
      await prisma.sponsorProspect.update({ where: { id: p.id }, data: { nextFollowupAt: null } });
      results.completed++;
      continue;
    }
    const assigneeEmail = p.assignee?.email;
    if (!assigneeEmail) { results.skipped++; continue; }

    try {
      await sendSponsorFollowupReminder(
        assigneeEmail,
        p.assignee?.name || "",
        { id: p.id, org: p.org, contact: p.contact, email: p.email, package: p.package, status: p.status },
        current.stage,
        deadlineNote,
      );
      const sentStages = [...parseStages(p.followupStage), current.stage];
      const upcoming = nextFollowup(p.contactedAt, sentStages.join(","));
      await prisma.sponsorProspect.update({
        where: { id: p.id },
        data: { followupStage: sentStages.join(","), nextFollowupAt: upcoming?.dueAt ?? null },
      });
      results.sent++;
    } catch (e) {
      console.error("[sponsor-followups]", p.id, e);
      results.skipped++;
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
