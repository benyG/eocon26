import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";
import { syncCfpScheduleStage } from "@/lib/cfpSessionSync";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("cfp", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sessions = await prisma.conferenceSession.findMany({ orderBy: [{ sortOrder: "asc" }, { time: "asc" }] });
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("cfp", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await req.json();
  const session = await prisma.conferenceSession.create({ data });
  // A scheduled session promotes its speaker's CFP to "Programmé" automatically.
  await syncCfpScheduleStage(session.speakerId, !!session.date);
  logAction(req, "CREATE", "session", session.id, { title: session.title });
  return NextResponse.json(session, { status: 201 });
}
