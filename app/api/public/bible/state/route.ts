import { NextResponse } from "next/server";
import { getBibleStateCached } from "@/lib/bibleState";

export const dynamic = "force-dynamic";

// Public state of the living bible. Locked fragments/entities return only their
// redaction label — never the reveal text — so nothing spoils before it is earned.
// Cached server-side; `s-maxage` lets a CDN collapse many visitors into one origin
// hit per window (handles hundreds of concurrent viewers cheaply).
export async function GET() {
  const state = await getBibleStateCached();
  return NextResponse.json(state, {
    headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
  });
}
