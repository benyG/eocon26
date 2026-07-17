import { prisma } from "@/lib/db";
import { getCtfdConfig, ctfdFetch } from "@/lib/ctfd";
import { ENTITIES, entitiesForLinked, ENTITY_DECLASSIFY_RATIO, PALIERS, FINALE, type Palier } from "@/lib/loreStructure";

// The living bible is driven by GLOBAL CTFd solves: a Fragment is "recovered" once
// its challenge has ≥1 solve. Everything (fragment reveals, entity declassification,
// paliers, stability, finale) derives from that. The result is cached server-side so
// hundreds of concurrent visitors cost one CTFd call every TTL, not one per request.

const TTL_MS = 20_000;
let _cache: BibleState | null = null;
let _cacheAt = 0;

type Bi = { en: string; fr: string };

export interface FragmentState {
  code: string;
  category: string;
  isPrimeSeal: boolean;
  storyArc: string | null;
  recovered: boolean;
  fragmentName?: string | null;
  reveal?: Bi | null;
}
export interface EntityState {
  key: string;
  declassified: boolean;
  recovered: number;
  total: number;
  lockLabel: Bi;
  title?: Bi;
  status?: Bi;
  role?: Bi;
  intrigue?: Bi;
  objective?: Bi;
  state?: Bi;
}
export interface BibleState {
  total: number;
  recoveredCount: number;
  stability: number;
  palier: Palier | null;
  paliers: Palier[];
  fragments: FragmentState[];
  entities: EntityState[];
  finale: typeof FINALE | null;
  previewMode: boolean;
}

async function fetchSolves(): Promise<Map<number, number>> {
  const cfg = await getCtfdConfig();
  if (!cfg) return new Map();
  const r = await ctfdFetch<{ data?: Array<{ id: number; solves?: number }> }>(cfg, "GET", "/api/v1/challenges");
  const map = new Map<number, number>();
  if (r.ok && Array.isArray(r.data?.data)) for (const c of r.data.data) map.set(c.id, c.solves ?? 0);
  return map;
}

export async function computeBibleState(): Promise<BibleState> {
  const preview = await prisma.eventSetting.findUnique({ where: { key: "bibleRevealAll" } });
  const revealAll = preview?.value === "true";

  const chs = await prisma.cTFChallenge.findMany({ where: { fragmentCode: { not: null } }, orderBy: [{ sortOrder: "asc" }] });
  const solves = revealAll ? null : await fetchSolves();
  const isRecovered = (ctfdId: number | null) => revealAll || (!!ctfdId && (solves!.get(ctfdId) ?? 0) > 0);

  const fragments: FragmentState[] = chs.map((c) => {
    const recovered = isRecovered(c.ctfdId);
    return {
      code: c.fragmentCode!,
      category: c.category,
      isPrimeSeal: c.isPrimeSeal,
      storyArc: c.storyArc,
      recovered,
      fragmentName: recovered ? c.fragmentName : null,
      reveal: recovered ? { en: c.revealEn || "", fr: c.revealFr || "" } : null,
    };
  });

  const recoveredCodes = new Set(fragments.filter((f) => f.recovered).map((f) => f.code));
  const recoveredCount = recoveredCodes.size;
  const total = 40;

  const entities: EntityState[] = ENTITIES.map((e) => {
    const linkedCodes = chs
      .filter((c) => c.linkedEntity && entitiesForLinked(c.linkedEntity).includes(e.key))
      .map((c) => c.fragmentCode!)
      .filter(Boolean);
    const rec = linkedCodes.filter((code) => recoveredCodes.has(code)).length;
    const tot = linkedCodes.length;
    const declassified = revealAll || (tot > 0 && rec / tot >= ENTITY_DECLASSIFY_RATIO);
    const base = { key: e.key, declassified, recovered: rec, total: tot, lockLabel: e.lockLabel };
    if (!declassified) return base;
    return { ...base, title: e.title, status: e.status, role: e.role, intrigue: e.intrigue, objective: e.objective, state: e.state };
  });

  const palier = [...PALIERS].reverse().find((p) => recoveredCount >= p.threshold) || null;
  const stability = Math.round((recoveredCount / total) * 100);
  const finale = recoveredCount >= total ? FINALE : null;

  return { total, recoveredCount, stability, palier, paliers: PALIERS, fragments, entities, finale, previewMode: revealAll };
}

export async function getBibleStateCached(): Promise<BibleState> {
  const now = Date.now();
  if (_cache && now - _cacheAt < TTL_MS) return _cache;
  _cache = await computeBibleState();
  _cacheAt = now;
  return _cache;
}

export function invalidateBibleCache() { _cache = null; _cacheAt = 0; }
