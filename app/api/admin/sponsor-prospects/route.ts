import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const canRead = (await hasPermission("prospection", "read")) || (await hasPermission("sponsor-pipeline", "read"));
  if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await prisma.sponsorProspect.findMany({ orderBy: { updatedAt: "desc" } }));
}

export async function POST(req: NextRequest) {
  const canWrite = (await hasPermission("prospection", "write")) || (await hasPermission("sponsor-pipeline", "write"));
  if (!canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await req.json();
  return NextResponse.json(await prisma.sponsorProspect.create({ data }), { status: 201 });
}
