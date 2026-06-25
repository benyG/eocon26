import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

const STREAMS_KEY = "live_streams";

async function getSetting(key: string): Promise<unknown> {
  const row = await prisma.eventSetting.findUnique({ where: { key } });
  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return null; }
}

export async function GET() {
  if (!(await hasPermission("live", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const streams = await getSetting(STREAMS_KEY);
  return NextResponse.json({ streams: Array.isArray(streams) ? streams : [] });
}

export async function PUT(req: NextRequest) {
  if (!(await hasPermission("live", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { streams?: unknown };

  if (body.streams !== undefined) {
    await prisma.eventSetting.upsert({
      where:  { key: STREAMS_KEY },
      create: { key: STREAMS_KEY, value: JSON.stringify(body.streams) },
      update: { value: JSON.stringify(body.streams) },
    });
  }

  logAction(req, "update", "live_settings", undefined, { info: "Updated live streams" });
  return NextResponse.json({ ok: true });
}
