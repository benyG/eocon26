import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";
import { parseRoadmap } from "@/lib/pilotageRoadmap";

export const dynamic = "force-dynamic";

// POST /api/admin/pilotage/seed  (body: { force?: boolean })
// Parses docs/roadmap-equipe.md and inserts steering tasks + meetings.
export async function POST(req: NextRequest) {
  if (!(await hasPermission("pilotage", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let force = false;
  try {
    const body = await req.json();
    force = !!body?.force;
  } catch {
    // no body
  }

  const existing = await prisma.steeringTask.count();
  if (existing > 0 && !force) {
    return NextResponse.json(
      { error: "Des tâches existent déjà. Utilisez force=true pour réinitialiser.", existing },
      { status: 409 },
    );
  }

  let md: string;
  try {
    md = await fs.readFile(path.join(process.cwd(), "docs", "roadmap-equipe.md"), "utf-8");
  } catch (e) {
    console.error("[pilotage seed] read roadmap", e);
    return NextResponse.json({ error: "Feuille de route introuvable sur le serveur." }, { status: 500 });
  }

  const { tasks, meetings } = parseRoadmap(md);

  if (force) {
    await prisma.steeringTask.deleteMany({});
    await prisma.steeringMeeting.deleteMany({});
  }

  if (tasks.length) {
    await prisma.steeringTask.createMany({
      data: tasks.map((t) => ({
        title: t.title,
        phase: t.phase,
        pole: t.pole,
        subTeam: t.subTeam,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        isMilestone: t.isMilestone,
        sortOrder: t.sortOrder,
      })),
    });
  }
  if (meetings.length) {
    await prisma.steeringMeeting.createMany({
      data: meetings.map((m) => ({
        title: m.title,
        type: m.type,
        subTeam: m.subTeam,
        scheduledAt: m.scheduledAt,
        agenda: m.agenda,
        location: m.location,
      })),
    });
  }

  logAction(req, "CREATE", "pilotage", null, { seeded: tasks.length, meetings: meetings.length, force });
  return NextResponse.json({ tasks: tasks.length, meetings: meetings.length });
}
