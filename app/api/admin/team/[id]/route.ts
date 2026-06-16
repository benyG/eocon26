import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("team", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, createdAt: _c, updatedAt: _u, ...data } = await req.json();
  return NextResponse.json(await prisma.teamMember.update({ where: { id: Number(params.id) }, data }));
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("team", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.teamMember.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ success: true });
}
