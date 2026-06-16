import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await hasPermission("pilotage", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const where: Record<string, unknown> = {};
  const phase = sp.get("phase");
  const pole = sp.get("pole");
  const subTeam = sp.get("subTeam");
  const status = sp.get("status");
  if (phase) where.phase = Number(phase);
  if (pole) where.pole = pole;
  if (subTeam) where.subTeam = subTeam;
  if (status) where.status = status;
  const tasks = await prisma.steeringTask.findMany({
    where,
    orderBy: [{ phase: "asc" }, { dueDate: "asc" }, { sortOrder: "asc" }],
  });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("pilotage", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { title, description, phase, pole, subTeam, status, priority, assigneeName, assigneeEmail, dueDate, isMilestone, notes, sortOrder } = body;
  if (!title || !pole) return NextResponse.json({ error: "title et pole requis" }, { status: 400 });
  const task = await prisma.steeringTask.create({
    data: {
      title,
      description: description || null,
      phase: phase ? Number(phase) : 1,
      pole,
      subTeam: subTeam || null,
      status: status || "todo",
      priority: priority || "medium",
      assigneeName: assigneeName || null,
      assigneeEmail: assigneeEmail || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      isMilestone: !!isMilestone,
      notes: notes || null,
      sortOrder: sortOrder ?? 0,
    },
  });
  logAction(req, "CREATE", "pilotage", task.id, { title });
  return NextResponse.json(task, { status: 201 });
}
