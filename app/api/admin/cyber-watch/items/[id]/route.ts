import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

// ── PATCH — approve / edit / reject ──────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasPermission("cyber-watch", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json() as {
    status?: "approved" | "rejected";
    draftFr?: string;
    draftEn?: string;
    platforms?: string;
  };

  const item = await prisma.cyberWatchItem.findUnique({ where: { id: Number(id) } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Build update payload
  const update: Record<string, unknown> = {};
  if (body.draftFr !== undefined) update.draftFr = body.draftFr;
  if (body.draftEn !== undefined) update.draftEn = body.draftEn;
  if (body.platforms !== undefined) update.platforms = body.platforms;

  if (body.status === "rejected") {
    update.status = "rejected";
  } else if (body.status === "approved") {
    // Schedule for next day at a random hour between 08:00 and 20:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0);

    const platforms = (body.platforms ?? item.platforms).split(",").map(p => p.trim()).filter(Boolean);

    // Create one SocialPost per platform x lang combination
    for (const platform of platforms) {
      for (const lang of ["fr", "en"] as const) {
        const content = lang === "fr" ? (body.draftFr ?? item.draftFr) : (body.draftEn ?? item.draftEn);
        await prisma.socialPost.create({
          data: {
            brief: `[Veille cyber] ${item.title}`,
            platform,
            lang,
            content,
            status: "scheduled",
            scheduledAt: tomorrow,
            contentType: "custom",
          },
        });
      }
    }

    update.status = "scheduled";
    update.scheduledAt = tomorrow;
  }

  const updated = await prisma.cyberWatchItem.update({
    where: { id: Number(id) },
    data: update,
  });
  return NextResponse.json(updated);
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await hasPermission("cyber-watch", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await prisma.cyberWatchItem.delete({ where: { id: Number(id) } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
