export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("testimony", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { quoteEn, quoteFr, author, isVisible, sortOrder } = await req.json();
  return NextResponse.json(
    await prisma.testimony.update({
      where: { id: parseInt(params.id) },
      data: {
        ...(quoteEn !== undefined && { quoteEn: quoteEn.trim() }),
        ...(quoteFr !== undefined && { quoteFr: quoteFr?.trim() || null }),
        ...(author !== undefined && { author: author.trim() }),
        ...(isVisible !== undefined && { isVisible }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    })
  );
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("testimony", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.testimony.delete({ where: { id: parseInt(params.id) } });
  return NextResponse.json({ success: true });
}
