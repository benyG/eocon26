import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getSetting(key: string): Promise<unknown> {
  const row = await prisma.eventSetting.findUnique({ where: { key } });
  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return null; }
}

export async function GET() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD in UTC

  const [streams, sessions, workshops] = await Promise.all([
    getSetting("live_streams"),
    prisma.conferenceSession.findMany({
      where: { date: today, isVisible: true },
      orderBy: [{ sortOrder: "asc" }, { time: "asc" }],
      select: {
        id: true,
        time: true,
        endTime: true,
        title: true,
        type: true,
        speakerName: true,
        room: true,
        mode: true,
        liveUrl: true,
      },
    }),
    getSetting("workshops"),
  ]);

  return NextResponse.json(
    {
      streams:   Array.isArray(streams)   ? streams   : [],
      programme: sessions,
      workshops: Array.isArray(workshops) ? workshops : [],
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
