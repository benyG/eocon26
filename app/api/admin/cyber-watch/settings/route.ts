import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { RSS_FEEDS } from "@/lib/rssFeeds";

export const dynamic = "force-dynamic";

export interface CyberWatchSettings {
  enabled: boolean;
  moderation: boolean;
  dailyCount: number;
  channels: string[]; // ["linkedin"] | ["twitter"] | ["linkedin","twitter"]
  activeSources: string[]; // feed ids
}

const DEFAULTS: CyberWatchSettings = {
  enabled: false,
  moderation: true,
  dailyCount: 2,
  channels: ["linkedin"],
  activeSources: RSS_FEEDS.map(f => f.id),
};

async function getSettings(): Promise<CyberWatchSettings> {
  const row = await prisma.eventSetting.findUnique({ where: { key: "cyber_watch_settings" } });
  if (!row) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(row.value) };
  } catch {
    return DEFAULTS;
  }
}

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getSettings());
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json() as Partial<CyberWatchSettings>;
  const current = await getSettings();
  const next: CyberWatchSettings = { ...current, ...body };
  await prisma.eventSetting.upsert({
    where: { key: "cyber_watch_settings" },
    create: { key: "cyber_watch_settings", value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });
  return NextResponse.json(next);
}
