import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

const STREAMS_KEY   = "live_streams";
const PROGRAMME_KEY = "live_programme";

async function getSetting(key: string): Promise<unknown> {
  const row = await prisma.eventSetting.findUnique({ where: { key } });
  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return null; }
}

export async function GET() {
  if (!(await hasPermission("live", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [streams, programme] = await Promise.all([
    getSetting(STREAMS_KEY),
    getSetting(PROGRAMME_KEY),
  ]);

  return NextResponse.json({
    streams:   Array.isArray(streams)   ? streams   : [],
    programme: Array.isArray(programme) ? programme : [],
  });
}

export async function PUT(req: NextRequest) {
  if (!(await hasPermission("live", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { streams?: unknown; programme?: unknown };

  if (body.streams !== undefined) {
    await prisma.eventSetting.upsert({
      where:  { key: STREAMS_KEY },
      create: { key: STREAMS_KEY, value: JSON.stringify(body.streams) },
      update: { value: JSON.stringify(body.streams) },
    });
  }

  if (body.programme !== undefined) {
    await prisma.eventSetting.upsert({
      where:  { key: PROGRAMME_KEY },
      create: { key: PROGRAMME_KEY, value: JSON.stringify(body.programme) },
      update: { value: JSON.stringify(body.programme) },
    });
  }

  logAction(req, "update", "live_settings", undefined, { info: "Updated live streams/programme" });

  return NextResponse.json({ ok: true });
}
