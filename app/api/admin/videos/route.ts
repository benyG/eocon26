export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export async function GET() {
  if (!(await hasPermission("video", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await prisma.sessionVideo.findMany({ orderBy: [{ edition: "desc" }, { sortOrder: "asc" }] }));
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("video", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await req.json();
  return NextResponse.json(await prisma.sessionVideo.create({ data }), { status: 201 });
}
