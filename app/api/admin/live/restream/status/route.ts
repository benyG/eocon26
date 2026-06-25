import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { fetchRestreamStatus } from "@/lib/restream";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("live", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const row = await prisma.eventSetting.findUnique({ where: { key: "restream_access_token" } });
  if (!row?.value) return NextResponse.json({ configured: false });

  try {
    const status = await fetchRestreamStatus(row.value);
    return NextResponse.json({ configured: true, ...status });
  } catch (e) {
    return NextResponse.json({ configured: true, error: e instanceof Error ? e.message : String(e) });
  }
}
