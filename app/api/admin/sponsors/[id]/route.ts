import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("sponsors", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await req.json();
  const sponsor = await prisma.sponsor.update({ where: { id: Number(params.id) }, data });
  return NextResponse.json(sponsor);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("sponsors", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.sponsor.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ success: true });
}
