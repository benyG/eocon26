import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

async function getSetting(key: string): Promise<unknown> {
  const row = await prisma.eventSetting.findUnique({ where: { key } });
  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return null; }
}

export async function GET() {
  const [streams, programme] = await Promise.all([
    getSetting("live_streams"),
    getSetting("live_programme"),
  ]);

  return NextResponse.json(
    {
      streams:   Array.isArray(streams)   ? streams   : [],
      programme: Array.isArray(programme) ? programme : [],
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
