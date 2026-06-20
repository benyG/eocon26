import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

const SETTING_KEY = "strategic_channels";

export async function GET() {
  if (!(await hasPermission("communication", "read")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const setting = await prisma.eventSetting.findUnique({ where: { key: SETTING_KEY } });
  return NextResponse.json(setting ? JSON.parse(setting.value) : {});
}

export async function PATCH(req: NextRequest) {
  if (!(await hasPermission("communication", "write")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const updates = await req.json() as Record<string, string>;
  const setting = await prisma.eventSetting.findUnique({ where: { key: SETTING_KEY } });
  const merged = { ...(setting ? JSON.parse(setting.value) : {}), ...updates };
  await prisma.eventSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(merged) },
    create: { key: SETTING_KEY, value: JSON.stringify(merged) },
  });
  return NextResponse.json({ ok: true });
}
