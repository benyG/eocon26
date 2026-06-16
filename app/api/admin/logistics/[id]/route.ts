import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("logistics", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await req.json();
  // Synchronize done with status
  if (data.status !== undefined) {
    data.done = data.status === "done";
  } else if (data.done !== undefined) {
    data.status = data.done ? "done" : "todo";
  }
  return NextResponse.json(await prisma.logisticsTask.update({ where: { id: parseInt(params.id) }, data }));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("logistics", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.logisticsTask.delete({ where: { id: parseInt(params.id) } });
  return NextResponse.json({ success: true });
}
