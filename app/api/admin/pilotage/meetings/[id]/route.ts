import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";
import { sendPilotageMeetingInvitation } from "@/lib/email";

export const dynamic = "force-dynamic";

function extractEmails(json: string | null | undefined): Set<string> {
  const matches = (json || "").match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || [];
  return new Set<string>(matches);
}

async function canWriteMeetings(): Promise<boolean> {
  return (await hasPermission("pilotage", "write")) || (await hasPermission("pilotage-meetings", "write"));
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await canWriteMeetings())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = Number(params.id);
  const body = await req.json();

  // Snapshot before update to detect newly added participants
  const before = await prisma.steeringMeeting.findUnique({ where: { id } });
  const prevEmails = extractEmails(before?.attendees);
  if (before?.convenerEmail) prevEmails.add(before.convenerEmail);

  const data: Record<string, unknown> = {};
  for (const f of ["title", "type", "subTeam", "location", "agenda", "attendees", "convenerEmail", "convenerName", "reminderStage"]) {
    if (body[f] !== undefined) data[f] = body[f];
  }
  if (body.scheduledAt !== undefined) data.scheduledAt = new Date(body.scheduledAt);
  const updated = await prisma.steeringMeeting.update({ where: { id }, data });
  logAction(req, "UPDATE", "pilotage", id, { meeting: updated.title });

  // Send invitations only to newly added participants
  const newEmails = extractEmails(updated.attendees);
  if (updated.convenerEmail) newEmails.add(updated.convenerEmail);
  const added = Array.from(newEmails).filter(e => !prevEmails.has(e));
  if (added.length) {
    await Promise.allSettled(added.map(to => sendPilotageMeetingInvitation(to, updated)));
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await canWriteMeetings())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = Number(params.id);
  await prisma.steeringMeeting.delete({ where: { id } });
  logAction(req, "DELETE", "pilotage", id);
  return NextResponse.json({ success: true });
}
