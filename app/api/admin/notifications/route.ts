import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionEmail } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

const DUE_SOON_DAYS = 3;

export async function GET() {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const dueSoonCutoff = new Date(now.getTime() + DUE_SOON_DAYS * 24 * 60 * 60 * 1000);

  // Tasks assigned to this user: due soon or overdue
  const tasks = await prisma.steeringTask.findMany({
    where: {
      assigneeEmail: email,
      status: { notIn: ["done"] },
      dueDate: { not: null },
    },
    select: { id: true, title: true, dueDate: true, status: true },
  });

  const upserts: Promise<unknown>[] = [];

  for (const task of tasks) {
    if (!task.dueDate) continue;
    const isOverdue = task.dueDate < now;
    const isDueSoon = !isOverdue && task.dueDate <= dueSoonCutoff;
    if (!isOverdue && !isDueSoon) continue;

    const type = isOverdue ? "task_overdue" : "task_due_soon";
    const daysLeft = Math.ceil((task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const title = isOverdue
      ? `Tâche en retard : ${task.title}`
      : `Tâche bientôt échue : ${task.title}`;
    const body = isOverdue
      ? `La tâche "${task.title}" était due le ${task.dueDate.toLocaleDateString("fr-FR")} et est en retard.`
      : `La tâche "${task.title}" est due dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""} (${task.dueDate.toLocaleDateString("fr-FR")}).`;

    upserts.push(
      prisma.adminNotification.upsert({
        where: { recipientEmail_refType_refId: { recipientEmail: email, refType: "task", refId: task.id } },
        create: { recipientEmail: email, type, refType: "task", refId: task.id, title, body },
        update: { type, title, body, readAt: null },
      })
    );
  }

  // Meetings where this user is convener and scheduled within the next 24h
  const meetingCutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const meetings = await prisma.steeringMeeting.findMany({
    where: {
      convenerEmail: email,
      scheduledAt: { gte: now, lte: meetingCutoff },
    },
    select: { id: true, title: true, scheduledAt: true, location: true },
  });

  for (const meeting of meetings) {
    const hoursLeft = Math.round((meeting.scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60));
    const title = `Réunion imminente : ${meeting.title}`;
    const body = `La réunion "${meeting.title}" est prévue dans ${hoursLeft}h (${meeting.scheduledAt.toLocaleString("fr-FR")})${meeting.location ? ` — ${meeting.location}` : ""}.`;

    upserts.push(
      prisma.adminNotification.upsert({
        where: { recipientEmail_refType_refId: { recipientEmail: email, refType: "meeting", refId: meeting.id } },
        create: { recipientEmail: email, type: "meeting_upcoming", refType: "meeting", refId: meeting.id, title, body },
        update: { title, body, readAt: null },
      })
    );
  }

  // Also notify attendees of upcoming meetings
  const allUpcomingMeetings = await prisma.steeringMeeting.findMany({
    where: { scheduledAt: { gte: now, lte: meetingCutoff } },
    select: { id: true, title: true, scheduledAt: true, location: true, attendees: true },
  });

  for (const meeting of allUpcomingMeetings) {
    if (!meeting.attendees) continue;
    let attendeeList: { email?: string }[] = [];
    try { attendeeList = JSON.parse(meeting.attendees); } catch { continue; }
    const isAttendee = attendeeList.some(a => a.email === email);
    if (!isAttendee) continue;

    const hoursLeft = Math.round((meeting.scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60));
    const title = `Réunion dans ${hoursLeft}h : ${meeting.title}`;
    const body = `Vous avez été convoqué(e) à la réunion "${meeting.title}" prévue à ${meeting.scheduledAt.toLocaleString("fr-FR")}${meeting.location ? ` — ${meeting.location}` : ""}.`;

    upserts.push(
      prisma.adminNotification.upsert({
        where: { recipientEmail_refType_refId: { recipientEmail: email, refType: "meeting", refId: meeting.id } },
        create: { recipientEmail: email, type: "meeting_upcoming", refType: "meeting", refId: meeting.id, title, body },
        update: { title, body },
      })
    );
  }

  await Promise.allSettled(upserts);

  const notifications = await prisma.adminNotification.findMany({
    where: { recipientEmail: email },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = notifications.filter(n => !n.readAt).length;
  return NextResponse.json({ notifications, unreadCount });
}

export async function POST() {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.adminNotification.updateMany({
    where: { recipientEmail: email, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
