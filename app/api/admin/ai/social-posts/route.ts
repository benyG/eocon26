import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("communication", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(
    await prisma.socialPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    })
  );
}

export async function PATCH(req: NextRequest) {
  if (!(await hasPermission("communication", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, content, imageUrl, scheduledAt } = await req.json();
  const data: Record<string, unknown> = {};
  if (content !== undefined) data.content = content;
  if (imageUrl !== undefined) data.imageUrl = imageUrl;
  if (scheduledAt !== undefined) data.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
  return NextResponse.json(await prisma.socialPost.update({ where: { id }, data }));
}

export async function DELETE(req: NextRequest) {
  if (!(await hasPermission("communication", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json();
  await prisma.socialPost.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
