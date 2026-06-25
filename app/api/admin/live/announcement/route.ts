import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

const KEY = "live_announcement";

export async function GET() {
  if (!(await hasPermission("live", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const row = await prisma.eventSetting.findUnique({ where: { key: KEY } });
  if (!row) return NextResponse.json({ message: "", enabled: false, expiresAt: null });

  try {
    return NextResponse.json(JSON.parse(row.value));
  } catch {
    return NextResponse.json({ message: "", enabled: false, expiresAt: null });
  }
}

export async function PUT(req: NextRequest) {
  if (!(await hasPermission("live", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { message?: string; enabled?: boolean; expiresAt?: string | null };
  const value = JSON.stringify({ message: body.message ?? "", enabled: body.enabled ?? false, expiresAt: body.expiresAt ?? null });

  await prisma.eventSetting.upsert({
    where:  { key: KEY },
    create: { key: KEY, value },
    update: { value },
  });

  logAction(req, "update", "live_announcement", undefined, { enabled: String(body.enabled) });
  return NextResponse.json({ ok: true });
}
