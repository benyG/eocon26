import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("cyber-watch", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = await prisma.cyberWatchItem.findMany({
    where: { status: { in: ["pending", "approved", "scheduled"] } },
    orderBy: [{ aiScore: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(items);
}
