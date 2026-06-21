import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("ctf", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await prisma.eventSetting.findMany({ where: { key: { in: ["ctfdUrl", "ctfdApiKey"] } } });
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;

  const url = (settings.ctfdUrl || "").replace(/\/$/, "");
  const apiKey = settings.ctfdApiKey || "";
  if (!url || !apiKey) {
    return NextResponse.json({ ok: false, error: "CTFd URL ou clé API non configurée" }, { status: 400 });
  }

  try {
    const r = await fetch(`${url}/api/v1/users`, {
      headers: { Authorization: `Token ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (r.ok) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: `Erreur HTTP ${r.status}` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur réseau";
    return NextResponse.json({ ok: false, error: msg });
  }
}
