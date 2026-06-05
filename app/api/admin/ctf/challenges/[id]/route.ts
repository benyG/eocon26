import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = parseInt(params.id);
  const data = await req.json();
  const updated = await prisma.cTFChallenge.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.difficulty !== undefined && { difficulty: data.difficulty }),
      ...(data.points !== undefined && { points: data.points }),
      ...(data.author !== undefined && { author: data.author }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.ctfdId !== undefined && { ctfdId: data.ctfdId }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.cTFChallenge.delete({ where: { id: parseInt(params.id) } });
  return NextResponse.json({ ok: true });
}
