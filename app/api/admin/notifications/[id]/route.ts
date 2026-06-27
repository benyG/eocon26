import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionEmail } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const notification = await prisma.adminNotification.findUnique({ where: { id } });
  if (!notification || notification.recipientEmail !== email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.adminNotification.update({
    where: { id },
    data: { readAt: new Date() },
  });

  return NextResponse.json(updated);
}
