import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const speakers = await prisma.speaker.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  return NextResponse.json(speakers);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  const speaker = await prisma.speaker.create({ data });
  logAction(req, "CREATE", "speaker", speaker.id, { name: speaker.name });
  return NextResponse.json(speaker, { status: 201 });
}
