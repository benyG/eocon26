import { getCtfdConfig, ctfdFetch } from "@/lib/ctfd";

// Per-team solve lookup for the briefing "my team" view. Uses the admin CTFd token
// to resolve a team by name and read its solved challenge IDs. Only solved challenge
// IDs are read — never flags. Cached briefly per team so many viewers from the same
// team collapse to ~one CTFd round-trip per window.

const TTL_MS = 20_000;
const _cache = new Map<string, { ids: Set<number> | null; at: number }>();

interface CtfdTeam { id: number; name?: string }
interface CtfdSolve { challenge_id?: number; challenge?: { id?: number } }

/** Resolve a CTFd team by (case-insensitive) exact name. Returns its numeric id or null. */
async function resolveTeamId(name: string): Promise<number | null> {
  const cfg = await getCtfdConfig();
  if (!cfg) return null;
  const q = encodeURIComponent(name.trim());
  const r = await ctfdFetch<{ data?: CtfdTeam[] }>(cfg, "GET", `/api/v1/teams?field=name&q=${q}`);
  if (!r.ok || !Array.isArray(r.data?.data)) return null;
  const wanted = name.trim().toLowerCase();
  const exact = r.data!.data.find((t) => (t.name || "").trim().toLowerCase() === wanted);
  return (exact || r.data!.data[0])?.id ?? null;
}

/**
 * Solved CTFd challenge IDs for a team, by team name. Returns:
 *   - a Set of challenge IDs when the team exists (possibly empty if nothing solved),
 *   - null when the team cannot be resolved (caller then falls back to the global view).
 */
export async function getTeamSolvedChallengeIds(teamName: string): Promise<Set<number> | null> {
  const key = teamName.trim().toLowerCase();
  if (!key) return null;
  const now = Date.now();
  const hit = _cache.get(key);
  if (hit && now - hit.at < TTL_MS) return hit.ids;

  const cfg = await getCtfdConfig();
  if (!cfg) { _cache.set(key, { ids: null, at: now }); return null; }

  const teamId = await resolveTeamId(teamName);
  if (teamId == null) { _cache.set(key, { ids: null, at: now }); return null; }

  const r = await ctfdFetch<{ data?: CtfdSolve[] }>(cfg, "GET", `/api/v1/teams/${teamId}/solves`);
  const ids = new Set<number>();
  if (r.ok && Array.isArray(r.data?.data)) {
    for (const s of r.data!.data) {
      const id = s.challenge_id ?? s.challenge?.id;
      if (typeof id === "number") ids.add(id);
    }
  }
  _cache.set(key, { ids, at: now });
  return ids;
}
