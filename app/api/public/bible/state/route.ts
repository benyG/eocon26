import { NextRequest, NextResponse } from "next/server";
import { getBibleStateCached, computeTeamBibleState } from "@/lib/bibleState";

export const dynamic = "force-dynamic";

// Public state of the living bible. Locked fragments/entities return only their
// redaction label — never the reveal text — so nothing spoils before it is earned.
//
// Global view (default): cached server-side; `s-maxage` lets a CDN collapse many
// visitors into one origin hit per window (handles hundreds of concurrent viewers).
//
// Team view (?team=NAME): the same record computed from that team's CTFd solves. If
// the team can't be resolved it silently falls back to the global view (no error), so
// a mistyped or unknown team name never breaks the page. `worldState` is always the
// global one — the World State panel is never per-team.
export async function GET(req: NextRequest) {
  const team = req.nextUrl.searchParams.get("team")?.trim();
  if (team) {
    const teamState = await computeTeamBibleState(team);
    if (teamState) {
      return NextResponse.json(teamState, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    // Unknown team → fall through to the global state (client stays on / reverts to
    // the global view). Flag it so the client can quietly clear a bad team name.
    const global = await getBibleStateCached();
    return NextResponse.json({ ...global, scope: "global", teamResolved: false, teamName: team }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  }
  const state = await getBibleStateCached();
  return NextResponse.json(state, {
    headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
  });
}
