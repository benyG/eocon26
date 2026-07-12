import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

// The unified editorial calendar is read-accessible to anyone who can read at
// least one of the modules it aggregates (social, campaigns, targeted publications).
async function canReadCalendar(): Promise<boolean> {
  return (
    (await hasPermission("communication", "read")) ||
    (await hasPermission("campaigns", "read")) ||
    (await hasPermission("strategic-plan", "read"))
  );
}

export async function GET(req: NextRequest) {
  if (!(await canReadCalendar())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const search = req.nextUrl.searchParams;
  const start = search.get("start");
  const end = search.get("end");
  const channelType = search.get("channelType") || undefined;

  const items = await prisma.commPlanItem.findMany({
    where: {
      ...(channelType ? { channelType } : {}),
      ...(start || end ? { date: { ...(start ? { gte: new Date(start) } : {}), ...(end ? { lte: new Date(end) } : {}) } } : {}),
    },
    orderBy: { date: "asc" },
    take: 1000,
  });

  const now = new Date();
  const withOverdue = items.map((it) => ({
    ...it,
    overdue: it.status === "pending_setup" && it.date < now,
  }));

  return NextResponse.json(withOverdue);
}
