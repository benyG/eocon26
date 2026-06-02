import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessions = await prisma.conferenceSession.findMany({ orderBy: [{ sortOrder: "asc" }, { time: "asc" }] });
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  const session = await prisma.conferenceSession.create({ data });
  return NextResponse.json(session, { status: 201 });
}
