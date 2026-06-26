import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("live", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await prisma.eventSetting.findMany({
    where: { key: { in: ["restream_access_token", "restream_token_expires_at"] } },
  });
  const get = (k: string) => rows.find(r => r.key === k)?.value ?? "";
  const token     = get("restream_access_token");
  const expiresAt = Number(get("restream_token_expires_at") || "0");

  return NextResponse.json({
    configured: !!token,
    expiresAt:  expiresAt || null,
    tokenPreview: token ? `${token.slice(0, 6)}${"•".repeat(Math.min(token.length - 6, 20))}` : "",
  });
}
