import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

const KEY = "streaming_team";

export interface StreamingTeamConfig {
  sessionTitle: string;
  sessionTime: string;
  sessionId?: number;
  studioLink: string;
  moderator: { name: string; email: string; lang: "fr" | "en" } | null;
  speakers: { name: string; email: string; lang: "fr" | "en" }[];
  techContact: string;
}

export async function GET() {
  if (!(await hasPermission("live", "read")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const row = await prisma.eventSetting.findUnique({ where: { key: KEY } });
  if (!row?.value) return NextResponse.json(null);

  try {
    return NextResponse.json(JSON.parse(row.value) as StreamingTeamConfig);
  } catch {
    return NextResponse.json(null);
  }
}

export async function PUT(req: NextRequest) {
  if (!(await hasPermission("live", "write")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as StreamingTeamConfig;

  await prisma.eventSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(body) },
    update: { value: JSON.stringify(body) },
  });

  // Also persist tech contact separately for easy access by invite route
  if (body.techContact) {
    await prisma.eventSetting.upsert({
      where: { key: "streaming_tech_contact" },
      create: { key: "streaming_tech_contact", value: body.techContact },
      update: { value: body.techContact },
    });
  }

  logAction(req, "update", "streaming_team", undefined, { info: "Streaming team updated" });
  return NextResponse.json({ ok: true });
}
