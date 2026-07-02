import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const canRead = (await hasPermission("prospection", "read")) || (await hasPermission("sponsor-pipeline", "read"));
  if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const users = await prisma.adminUser.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}
