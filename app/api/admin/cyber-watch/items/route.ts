import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.cyberWatchItem.findMany({
    where: { status: { in: ["pending", "approved", "scheduled"] } },
    orderBy: [{ aiScore: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(items);
}
