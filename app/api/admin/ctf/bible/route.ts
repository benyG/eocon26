import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { computeBibleState, invalidateBibleCache } from "@/lib/bibleState";

export const dynamic = "force-dynamic";

// GET — live admin view: fragment recovery (from CTFd solves), entity
// declassification, paliers and the preview toggle.
export async function GET() {
  if (!(await hasPermission("ctf-bible", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const state = await computeBibleState();
  return NextResponse.json(state);
}

// POST — { action: "preview", on: boolean }
//   Toggle "reveal everything" (organiser preview of the fully declassified bible).
export async function POST(req: NextRequest) {
  if (!(await hasPermission("ctf-bible", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { action, on } = (await req.json()) as { action: string; on?: boolean };

  if (action === "preview") {
    await prisma.eventSetting.upsert({
      where: { key: "bibleRevealAll" },
      update: { value: on ? "true" : "false" },
      create: { key: "bibleRevealAll", value: on ? "true" : "false" },
    });
    invalidateBibleCache();
    return NextResponse.json({ ok: true, previewMode: !!on });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
