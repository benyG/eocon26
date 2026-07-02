import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const canWrite = (await hasPermission("prospection", "write")) || (await hasPermission("sponsor-pipeline", "write"));
  if (!canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await req.json();
  return NextResponse.json(await prisma.sponsorProspect.update({ where: { id: parseInt(params.id) }, data }));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const canWrite = (await hasPermission("prospection", "write")) || (await hasPermission("sponsor-pipeline", "write"));
  if (!canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.sponsorProspect.delete({ where: { id: parseInt(params.id) } });
  return NextResponse.json({ success: true });
}
