import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(
    await prisma.socialPost.findMany({
      where: { platform: "linkedin" },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
  );
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, content, imageUrl, scheduledAt } = await req.json();
  const data: Record<string, unknown> = {};
  if (content !== undefined) data.content = content;
  if (imageUrl !== undefined) data.imageUrl = imageUrl;
  if (scheduledAt !== undefined) data.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
  return NextResponse.json(await prisma.socialPost.update({ where: { id }, data }));
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await prisma.socialPost.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
