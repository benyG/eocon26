export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export async function GET() {
  if (!(await hasPermission("testimony", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await prisma.testimony.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }));
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("testimony", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { quoteEn, quoteFr, author, isVisible, sortOrder } = await req.json();
  if (!quoteEn?.trim() || !author?.trim()) return NextResponse.json({ error: "quoteEn and author are required" }, { status: 400 });
  return NextResponse.json(
    await prisma.testimony.create({ data: { quoteEn: quoteEn.trim(), quoteFr: quoteFr?.trim() || null, author: author.trim(), isVisible: isVisible ?? true, sortOrder: sortOrder ?? 0 } }),
    { status: 201 }
  );
}
