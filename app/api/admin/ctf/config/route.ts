import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

// CTFd connection settings for the EyesOpen CTF "Config" sub-tab. Scoped to the
// `ctf-config` permission so the config tab is protected independently of the
// global `settings` permission and the other CTF sub-tabs.
const CONFIG_KEYS = ["ctfdUrl", "ctfdApiKey", "ctfDefaultPassword", "ctfEnabled"] as const;

export async function GET() {
  if (!(await hasPermission("ctf-config", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await prisma.eventSetting.findMany({ where: { key: { in: [...CONFIG_KEYS] } } });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return NextResponse.json(map);
}

export async function PATCH(req: NextRequest) {
  if (!(await hasPermission("ctf-config", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json()) as Record<string, string>;
  for (const key of CONFIG_KEYS) {
    if (body[key] === undefined) continue;
    const value = String(body[key]);
    await prisma.eventSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  return NextResponse.json({ ok: true });
}
