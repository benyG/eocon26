import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

const SETTING_KEY = "strategic_channels";

export async function GET() {
  if (!(await hasPermission("strategic-plan", "read")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const setting = await prisma.eventSetting.findUnique({ where: { key: SETTING_KEY } });
  return NextResponse.json(setting ? JSON.parse(setting.value) : {});
}

export async function PATCH(req: NextRequest) {
  if (!(await hasPermission("strategic-plan", "write")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await req.json();
  await prisma.eventSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(data) },
    create: { key: SETTING_KEY, value: JSON.stringify(data) },
  });
  return NextResponse.json({ ok: true });
}
