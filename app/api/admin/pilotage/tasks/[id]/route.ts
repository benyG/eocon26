import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { logAction } from "@/lib/auditLog";
import { sendPilotageTaskAssigned } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(params.id);
  const existing = await prisma.steeringTask.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  const fields = ["title", "description", "phase", "pole", "subTeam", "status", "priority", "assigneeName", "assigneeEmail", "isMilestone", "notes", "sortOrder", "reminderStage"];
  for (const f of fields) {
    if (body[f] !== undefined) data[f] = body[f];
  }
  if (body.phase !== undefined) data.phase = Number(body.phase);
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

  // Track completion timestamp
  if (body.status !== undefined) {
    if (body.status === "done" && existing.status !== "done") data.completedAt = new Date();
    if (body.status !== "done") data.completedAt = null;
  }

  const updated = await prisma.steeringTask.update({ where: { id }, data });
  logAction(req, "UPDATE", "pilotage", id, { status: updated.status });

  // Notify assignee on (re)assignment
  const newEmail = updated.assigneeEmail;
  if (newEmail && newEmail !== existing.assigneeEmail) {
    sendPilotageTaskAssigned(newEmail, updated.assigneeName || "", updated)
      .catch((e) => console.error("[pilotage assigned email]", e));
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(params.id);
  await prisma.steeringTask.delete({ where: { id } });
  logAction(req, "DELETE", "pilotage", id);
  return NextResponse.json({ success: true });
}
