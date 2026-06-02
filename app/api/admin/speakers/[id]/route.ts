import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  const speaker = await prisma.speaker.update({ where: { id: Number(params.id) }, data });
  return NextResponse.json(speaker);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.speaker.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ success: true });
}
