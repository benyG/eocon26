import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

const KEY = "workshops";

export async function GET() {
  if (!(await hasPermission("live", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const row = await prisma.eventSetting.findUnique({ where: { key: KEY } });
  try { return NextResponse.json(row ? JSON.parse(row.value) : []); }
  catch { return NextResponse.json([]); }
}

export async function PUT(req: NextRequest) {
  if (!(await hasPermission("live", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const workshops = await req.json();
  await prisma.eventSetting.upsert({
    where:  { key: KEY },
    create: { key: KEY, value: JSON.stringify(workshops) },
    update: { value: JSON.stringify(workshops) },
  });
  logAction(req, "update", "workshops", undefined, { count: workshops.length });
  return NextResponse.json({ ok: true });
}
