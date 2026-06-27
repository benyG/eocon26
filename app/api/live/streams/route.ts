import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOnlineSession } from "@/lib/onlineAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getOnlineSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.eventSetting.findUnique({ where: { key: "live_streams" } });
  let streams: unknown[] = [];
  if (row) {
    try { streams = JSON.parse(row.value) as unknown[]; } catch { streams = []; }
  }

  return NextResponse.json(
    { streams: Array.isArray(streams) ? streams : [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
