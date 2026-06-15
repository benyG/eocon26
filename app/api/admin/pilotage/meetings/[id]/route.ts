import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(params.id);
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const f of ["title", "type", "subTeam", "location", "agenda", "attendees", "reminderStage"]) {
    if (body[f] !== undefined) data[f] = body[f];
  }
  if (body.scheduledAt !== undefined) data.scheduledAt = new Date(body.scheduledAt);
  const updated = await prisma.steeringMeeting.update({ where: { id }, data });
  logAction(req, "UPDATE", "pilotage", id, { meeting: updated.title });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(params.id);
  await prisma.steeringMeeting.delete({ where: { id } });
  logAction(req, "DELETE", "pilotage", id);
  return NextResponse.json({ success: true });
}
