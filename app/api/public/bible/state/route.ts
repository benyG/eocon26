import { NextResponse } from "next/server";
import { REVELATIONS, REVELATION_ARCS, REVELATION_FINALE } from "@/lib/revelationContent";
import { getUnlockedArcs, maybeAutoSyncFromCtfd } from "@/lib/revelationUnlock";

export const dynamic = "force-dynamic";

// Public state of the living bible. Locked arcs return ONLY their redaction label
// (never the title or body) so no revealed truth reaches the client before unlock.
export async function GET() {
  // Opportunistically open arcs whose synthesis challenge is solved on CTFd
  // (throttled, fire-and-forget — never blocks this response).
  maybeAutoSyncFromCtfd();
  const unlocked = await getUnlockedArcs();
  const set = new Set(unlocked);

  const arcs = REVELATION_ARCS.map((arc) => {
    const r = REVELATIONS[arc];
    if (set.has(arc)) {
      return { arc, unlocked: true, lockLabel: r.lockLabel, title: r.title, body: r.body };
    }
    return { arc, unlocked: false, lockLabel: r.lockLabel };
  });

  const all = unlocked.length === REVELATION_ARCS.length;

  return NextResponse.json(
    {
      total: REVELATION_ARCS.length,
      unlockedCount: unlocked.length,
      arcs,
      finale: all ? REVELATION_FINALE : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
