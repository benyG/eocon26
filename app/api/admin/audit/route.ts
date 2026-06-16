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

  const where = {
    ...(resource ? { resource } : {}),
    ...(action ? { action } : {}),
  };

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return NextResponse.json({ logs, total, page, pages: Math.ceil(total / PAGE_SIZE) });
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
