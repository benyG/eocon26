import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("pilotage", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const meetings = await prisma.steeringMeeting.findMany({ orderBy: { scheduledAt: "asc" } });
  return NextResponse.json(meetings);
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("pilotage", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { title, type, subTeam, scheduledAt, location, agenda, attendees } = body;
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
    },
  });
  logAction(req, "CREATE", "pilotage", meeting.id, { meeting: title });
  return NextResponse.json(meeting, { status: 201 });
}
