import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("library", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const cats = await prisma.mediaCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { assets: true } } },
  });
  return NextResponse.json(cats);
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("library", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name } = await req.json() as { name: string };
  if (!name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const cat = await prisma.mediaCategory.create({ data: { name: name.trim(), slug } });
  return NextResponse.json(cat);
}

export async function DELETE(req: NextRequest) {
  if (!(await hasPermission("library", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json() as { id: number };
  // Unassign assets from this category before deleting
  await prisma.mediaAsset.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
  await prisma.mediaCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
