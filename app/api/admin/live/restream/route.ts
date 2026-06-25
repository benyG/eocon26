import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

const TOKEN_KEY = "restream_access_token";

export async function GET() {
  if (!(await hasPermission("live", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const row = await prisma.eventSetting.findUnique({ where: { key: TOKEN_KEY } });
  const token = row?.value ?? "";

  return NextResponse.json({
    configured: !!token,
    tokenPreview: token ? `${token.slice(0, 6)}${"•".repeat(Math.min(token.length - 6, 20))}` : "",
  });
}

export async function PUT(req: NextRequest) {
  if (!(await hasPermission("live", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { token } = await req.json() as { token: string };

  if (token === undefined) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  if (token === "") {
    await prisma.eventSetting.deleteMany({ where: { key: TOKEN_KEY } });
  } else {
    await prisma.eventSetting.upsert({
      where:  { key: TOKEN_KEY },
      create: { key: TOKEN_KEY, value: token },
      update: { value: token },
    });
  }

  logAction(req, "update", "live_settings", undefined, { info: token ? "Restream token updated" : "Restream token removed" });
  return NextResponse.json({ ok: true });
}
