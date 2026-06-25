import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface AnnouncementData {
  message: string;
  enabled: boolean;
  expiresAt: string | null;
}

export async function GET() {
  const row = await prisma.eventSetting.findUnique({ where: { key: "live_announcement" } });
  if (!row) return NextResponse.json({ active: false, message: "" });

  let data: AnnouncementData;
  try { data = JSON.parse(row.value); } catch { return NextResponse.json({ active: false, message: "" }); }

  if (!data.enabled) return NextResponse.json({ active: false, message: "" });
  if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
    return NextResponse.json({ active: false, message: "" });
  }

  return NextResponse.json(
    { active: true, message: data.message },
    { headers: { "Cache-Control": "no-store" } }
  );
}
