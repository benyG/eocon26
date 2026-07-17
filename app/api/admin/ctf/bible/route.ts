import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { REVELATIONS, REVELATION_ARCS } from "@/lib/revelationContent";
import { getUnlockUrl, unlockArc, lockArc, syncFromCtfdSolves } from "@/lib/revelationUnlock";
import { getCtfdConfig } from "@/lib/ctfd";

export const dynamic = "force-dynamic";

// GET — full admin view of the living bible: unlock state, per-arc unlock URLs
// (to paste/verify in CTFd) and the synthesis challenge that gates each arc.
export async function GET() {
  if (!(await hasPermission("ctf", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const unlocks = await prisma.revelationUnlock.findMany();
  const unlockMap = new Map(unlocks.map((u) => [u.arc, u]));
  const synth = await prisma.cTFChallenge.findMany({ where: { isSynthesis: true } });

  const arcs = await Promise.all(
    REVELATION_ARCS.map(async (arc) => {
      const u = unlockMap.get(arc);
      const s = synth.find((c) => (c.revelation || "").split(",").map((x) => x.trim()).includes(String(arc)));
      return {
        arc,
        title: REVELATIONS[arc].title,
        lockLabel: REVELATIONS[arc].lockLabel,
        unlocked: !!u,
        unlockedAt: u?.unlockedAt ?? null,
        unlockedVia: u?.unlockedVia ?? null,
        unlockedBy: u?.unlockedBy ?? null,
        unlockUrl: await getUnlockUrl(arc),
        synthesisTitle: s?.title ?? null,
        synthesisCtfdId: s?.ctfdId ?? null,
        synthesisPublished: !!s?.ctfdId,
      };
    }),
  );

  return NextResponse.json({ total: REVELATION_ARCS.length, unlockedCount: unlocks.length, arcs });
}

// POST — { action: "unlock" | "lock", arc } | { action: "sync" }
export async function POST(req: NextRequest) {
  if (!(await hasPermission("ctf", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { action, arc } = (await req.json()) as { action: string; arc?: number };

  if (action === "unlock" && arc) { await unlockArc(arc, "admin"); return NextResponse.json({ ok: true }); }
  if (action === "lock" && arc) { await lockArc(arc); return NextResponse.json({ ok: true }); }

  if (action === "sync") {
    // Unlock any arc whose synthesis challenge has ≥1 solve on CTFd.
    const cfg = await getCtfdConfig();
    if (!cfg) return NextResponse.json({ error: "CTFd non configuré" }, { status: 400 });
    const synced = await syncFromCtfdSolves();
    return NextResponse.json({ ok: true, synced });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
