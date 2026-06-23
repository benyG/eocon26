import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  sendPilotageDeadlineReminder,
  sendPilotageEscalation,
  sendPilotageMeetingReminder,
} from "@/lib/email";

// External cron: GET /api/cron/pilotage-reminders?secret=CRON_SECRET
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const coordoSetting = await prisma.eventSetting.findUnique({ where: { key: "pilotage_coordo_email" } });
  const coordoEmail = coordoSetting?.value || "contact@eyesopensecurity.com";

  const now = new Date();
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dayDiff = (d: Date) => {
    const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return Math.round((day - startOfToday) / 86400000);
  };
  const stagesOf = (csv: string | null) => (csv ? csv.split(",").map((s) => s.trim()).filter(Boolean) : []);

  const results = { taskReminders: 0, escalations: 0, meetingReminders: 0 };

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const tasks = await prisma.steeringTask.findMany({
    where: { status: { not: "done" }, dueDate: { not: null } },
  });
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const diff = dayDiff(task.dueDate);
    const sent = stagesOf(task.reminderStage);
    let stage: string | null = null;
    if (diff === 3) stage = "J-3";
    else if (diff === 1) stage = "J-1";
    else if (diff === 0) stage = "J0";
    else if (diff < 0) stage = "overdue";
    if (!stage || sent.includes(stage)) continue;

    try {
      if (stage === "overdue") {
        await sendPilotageEscalation(coordoEmail, task);
        results.escalations++;
      } else if (task.assigneeEmail) {
        await sendPilotageDeadlineReminder(task.assigneeEmail, task.assigneeName || "", task, stage);
        results.taskReminders++;
      }
      await prisma.steeringTask.update({
        where: { id: task.id },
        data: { reminderStage: [...sent, stage].join(",") },
      });
    } catch (e) {
      console.error("[pilotage cron task]", task.id, e);
    }
  }

  // ── Meetings ─────────────────────────────────────────────────────────────────
  const meetings = await prisma.steeringMeeting.findMany({
    where: { scheduledAt: { gte: new Date(startOfToday) } },
  });
  for (const meeting of meetings) {
    const diff = dayDiff(meeting.scheduledAt);
    const msUntil = meeting.scheduledAt.getTime() - now.getTime();
    const sent = stagesOf(meeting.reminderStage);
    let stage: string | null = null;
    if (msUntil > 0 && msUntil <= 2 * 3600 * 1000) stage = "H-2";
    else if (diff === 1) stage = "J-1";
    else if (diff === 0 && !sent.includes("J0")) stage = "J0";
    if (!stage || sent.includes(stage)) continue;

    // Recipients: emails found in attendees, otherwise the Coordo.
    const emails = (meeting.attendees || "").match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || [];
    const recipients = emails.length ? emails : [coordoEmail];

    try {
      for (const to of recipients) {
        await sendPilotageMeetingReminder(to, meeting, stage);
        results.meetingReminders++;
      }
      await prisma.steeringMeeting.update({
        where: { id: meeting.id },
        data: { reminderStage: [...sent, stage].join(",") },
      });
    } catch (e) {
      console.error("[pilotage cron meeting]", meeting.id, e);
    }
  }

  return NextResponse.json(results);
}
