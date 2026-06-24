import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("campaigns", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const subscribers = await prisma.newsletterSubscriber.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return NextResponse.json(subscribers);
}

export async function DELETE(req: NextRequest) {
  if (!(await hasPermission("campaigns", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json() as { id: number };
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  await prisma.newsletterSubscriber.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
