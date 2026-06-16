import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("communication", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await req.json();
  return NextResponse.json(await prisma.emailTemplate.update({ where: { id: parseInt(params.id) }, data }));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("communication", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.emailTemplate.delete({ where: { id: parseInt(params.id) } });
  return NextResponse.json({ success: true });
}
