import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("cfp", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sessions = await prisma.conferenceSession.findMany({ orderBy: [{ sortOrder: "asc" }, { time: "asc" }] });
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  const session = await prisma.conferenceSession.create({ data });
  logAction(req, "CREATE", "session", session.id, { title: session.title });
  return NextResponse.json(session, { status: 201 });
}
