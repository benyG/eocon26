import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("settings", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const settings = await prisma.eventSetting.findMany();
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  return NextResponse.json(map);
}

export async function PATCH(req: NextRequest) {
  if (!(await hasPermission("settings", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const updates = await req.json() as Record<string, string>;
  for (const [key, value] of Object.entries(updates)) {
    await prisma.eventSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  return NextResponse.json({ ok: true });
}
