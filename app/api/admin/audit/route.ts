import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const RETENTION_DAYS = 60;

export async function GET(req: NextRequest) {
  if (!(await hasPermission("audit", "read"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const search = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(search.get("page") || "1"));
  const resource = search.get("resource") || undefined;
  const action = search.get("action") || undefined;
  const actor = search.get("actor") || undefined;

  const where = {
    ...(resource ? { resource } : {}),
    ...(action ? { action } : {}),
    ...(actor ? { actor } : {}),
  };

  const [total, logs, actorGroups, resourceGroups] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    // Distinct actors / resources for the filter dropdowns (most active first).
    prisma.auditLog.groupBy({ by: ["actor"], _count: { actor: true }, orderBy: { _count: { actor: "desc" } }, take: 100 }),
    prisma.auditLog.groupBy({ by: ["resource"], _count: { resource: true }, orderBy: { _count: { resource: "desc" } }, take: 100 }),
  ]);

  return NextResponse.json({
    logs, total, page, pages: Math.ceil(total / PAGE_SIZE),
    actors: actorGroups.map(a => a.actor),
    resources: resourceGroups.map(r => r.resource),
  });
}

// Manually purge entries older than retention period
export async function DELETE() {
  if (!(await hasPermission("audit", "write"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const { count } = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return NextResponse.json({ deleted: count, cutoff });
}
