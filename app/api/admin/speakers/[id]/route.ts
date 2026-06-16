import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("cfp", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await req.json();
  const speaker = await prisma.speaker.update({ where: { id: Number(params.id) }, data });
  logAction(req, "UPDATE", "speaker", params.id, { name: speaker.name });
  return NextResponse.json(speaker);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("cfp", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.speaker.delete({ where: { id: Number(params.id) } });
  logAction(_, "DELETE", "speaker", params.id);
  return NextResponse.json({ success: true });
}
