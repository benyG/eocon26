import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";
import { sendPilotageMeetingInvitation } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET() {
  const canRead = (await hasPermission("pilotage", "read")) || (await hasPermission("pilotage-meetings", "read")) || (await hasPermission("pilotage-meetings", "write"));
  if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const meetings = await prisma.steeringMeeting.findMany({ orderBy: { scheduledAt: "asc" } });
  return NextResponse.json(meetings);
}

async function canWriteMeetings(): Promise<boolean> {
  return (await hasPermission("pilotage", "write")) || (await hasPermission("pilotage-meetings", "write"));
}

export async function POST(req: NextRequest) {
  if (!(await canWriteMeetings())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { title, type, subTeam, scheduledAt, location, agenda, attendees, convenerEmail, convenerName } = body;
  if (!title || !scheduledAt) return NextResponse.json({ error: "title et scheduledAt requis" }, { status: 400 });
  const meeting = await prisma.steeringMeeting.create({
    data: {
      title,
      type: type || "collective",
      subTeam: subTeam || null,
      scheduledAt: new Date(scheduledAt),
      location: location || null,
      agenda: agenda || null,
      attendees: attendees || null,
      convenerEmail: convenerEmail || null,
      convenerName: convenerName || null,
    },
  });
  logAction(req, "CREATE", "pilotage", meeting.id, { meeting: title });

  // Send invitation to all attendees + convener
  const emailsInAttendees: string[] = (attendees || "").match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || [];
  const allRecipients = new Set<string>(emailsInAttendees);
  if (convenerEmail) allRecipients.add(convenerEmail);
  await Promise.allSettled(Array.from(allRecipients).map(to => sendPilotageMeetingInvitation(to, meeting)));

  return NextResponse.json(meeting, { status: 201 });
}
