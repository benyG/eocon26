import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

const PHASE_ORDER: Record<string, number> = {
  "J-90": 0,
  "J-30": 1,
  "J-7": 2,
  "Jour J": 3,
  "Post-event": 4,
};

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export async function GET() {
  if (!(await hasPermission("logistics", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tasks = await prisma.logisticsTask.findMany({ orderBy: [{ sortOrder: "asc" }] });
  // Sort by phase order, then priority order
  tasks.sort((a, b) => {
    const phaseA = PHASE_ORDER[a.phase] ?? 99;
    const phaseB = PHASE_ORDER[b.phase] ?? 99;
    if (phaseA !== phaseB) return phaseA - phaseB;
    const prioA = PRIORITY_ORDER[a.priority] ?? 99;
    const prioB = PRIORITY_ORDER[b.priority] ?? 99;
    return prioA - prioB;
  });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("logistics", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await req.json();
  // Synchronize done with status
  if (data.status !== undefined) {
    data.done = data.status === "done";
  } else if (data.done !== undefined) {
    data.status = data.done ? "done" : "todo";
  }
  return NextResponse.json(await prisma.logisticsTask.create({ data }), { status: 201 });
}
