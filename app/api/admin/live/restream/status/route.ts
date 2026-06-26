import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { fetchRestreamStatus, getValidRestreamToken } from "@/lib/restream";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("live", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const token = await getValidRestreamToken();
    const status = await fetchRestreamStatus(token);
    return NextResponse.json({ configured: true, ...status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("non connecté")) return NextResponse.json({ configured: false });
    return NextResponse.json({ configured: true, error: msg });
  }
}
