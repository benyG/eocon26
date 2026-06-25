import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

const KEYS = ["jaas_app_id", "jaas_api_key", "jaas_private_key"] as const;

export async function GET() {
  if (!(await hasPermission("live", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await prisma.eventSetting.findMany({ where: { key: { in: [...KEYS] } } });
  const cfg: Record<string, string> = {};
  for (const r of rows) cfg[r.key] = r.value;
  return NextResponse.json({
    appId:      cfg["jaas_app_id"]      ?? "",
    apiKey:     cfg["jaas_api_key"]     ?? "",
    privateKey: cfg["jaas_private_key"] ?? "",
  });
}

export async function PUT(req: NextRequest) {
  if (!(await hasPermission("live", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { appId?: string; apiKey?: string; privateKey?: string };

  const updates: Record<string, string> = {};
  if (body.appId      !== undefined) updates["jaas_app_id"]      = body.appId;
  if (body.apiKey     !== undefined) updates["jaas_api_key"]     = body.apiKey;
  if (body.privateKey !== undefined) updates["jaas_private_key"] = body.privateKey;

  await Promise.all(
    Object.entries(updates).map(([key, value]) =>
      prisma.eventSetting.upsert({
        where:  { key },
        create: { key, value },
        update: { value },
      })
    )
  );

  logAction(req, "update", "jaas_config", undefined, { keys: Object.keys(updates).join(",") });
  return NextResponse.json({ ok: true });
}
