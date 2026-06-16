import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("cfp", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await req.json();
  return NextResponse.json(await prisma.workshop.update({ where: { id: Number(params.id) }, data }));
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.workshop.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ success: true });
}
