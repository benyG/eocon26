import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

const canWrite = async () =>
  (await hasPermission("sponsors", "write")) ||
  (await hasPermission("sponsor-pipeline", "write")) ||
  (await hasPermission("prospection", "write"));

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await canWrite())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { done, note, quantity, labelFr, labelEn } = await req.json();
  const row = await prisma.sponsorPerk.update({
    where: { id: parseInt(params.id) },
    data: {
      ...(done !== undefined ? { done: !!done } : {}),
      ...(note !== undefined ? { note } : {}),
      ...(quantity !== undefined ? { quantity: quantity ?? null } : {}),
      ...(labelFr !== undefined ? { labelFr } : {}),
      ...(labelEn !== undefined ? { labelEn } : {}),
    },
  });
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await canWrite())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.sponsorPerk.delete({ where: { id: parseInt(params.id) } });
  return NextResponse.json({ success: true });
}
