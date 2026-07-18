import { prisma } from "@/lib/db";
import { getCtfdConfig, ctfdFetch } from "@/lib/ctfd";
import { ENTITIES, arcForEntity, ARCS, PALIERS, FINALE, ENTITY_BLUR, type Palier, type Arc } from "@/lib/loreStructure";
import { computeCharacters, isSamuelIdentified, type CharacterCard } from "@/lib/loreCharacters";

// The living bible is driven by GLOBAL CTFd solves. A Fragment is "recovered" once
// its challenge has ≥1 solve. Story arcs unlock by evidence group (≥ threshold of
// their trigger Fragments). Unlocking an arc declassifies its entity dossiers,
// releases its section-level reveal text and its gated image. Cached server-side so
// hundreds of viewers cost ~one CTFd call per window.

const TTL_MS = 20_000;
let _cache: BibleState | null = null;
let _cacheAt = 0;

type Bi = { en: string; fr: string };

// Six-state visual/semantic ladder (v2 bible §4.3). `stage` is distinct from an
// entity's lore `state` text. COMPROMISED marks a dossier that is revealed but
// flagged untrustworthy; RESOLVED is the final synthesis state.
export type Stage = "SEALED" | "DETECTED" | "PARTIAL" | "VERIFIED" | "COMPROMISED" | "RESOLVED";

// Dossiers the lore marks as active-but-untrustworthy: once earned they surface
// as COMPROMISED (red / glitch) instead of VERIFIED.
const COMPROMISED_ENTITIES = new Set(["nora", "watcher"]);

function baseStage(recovered: number, threshold: number, unlocked: boolean): Stage {
  if (unlocked) return "VERIFIED";
  if (recovered <= 0) return "SEALED";
  if (recovered >= threshold - 1) return "PARTIAL";
  return "DETECTED";
}

export interface FragmentState {
  code: string; category: string; isPrimeSeal: boolean; storyArc: string | null;
  recovered: boolean; fragmentName?: string | null; reveal?: Bi | null;
}
export interface EntityState {
  key: string; declassified: boolean; blur: "none" | "partial" | "heavy"; lockLabel: Bi;
  stage: Stage;
  title?: Bi; status?: Bi; role?: Bi; intrigue?: Bi; objective?: Bi; state?: Bi;
}
export interface ArcState {
  key: string; title: Bi; unlocked: boolean; recovered: number; total: number;
  threshold: number; lockLabel: Bi; image: string | null; stage: Stage; reveal?: Bi;
}
export interface BibleState {
  total: number; recoveredCount: number; stability: number;
  palier: Palier | null; paliers: Palier[];
  fragments: FragmentState[]; entities: EntityState[]; arcs: ArcState[];
  characters: CharacterCard[]; samuelIdentified: boolean;
  finale: typeof FINALE | null; previewMode: boolean;
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
  const byCode = new Map(chs.map((c) => [c.fragmentCode!, c]));
  const isRecovered = (code: string) => {
    if (revealAll) return true;
    const c = byCode.get(code);
    return !!c?.ctfdId && (solves!.get(c.ctfdId) ?? 0) > 0;
  };

  const fragments: FragmentState[] = chs.map((c) => {
    const recovered = isRecovered(c.fragmentCode!);
    return {
      code: c.fragmentCode!, category: c.category, isPrimeSeal: c.isPrimeSeal, storyArc: c.storyArc,
      recovered,
      fragmentName: recovered ? c.fragmentName : null,
      reveal: recovered ? { en: c.revealEn || "", fr: c.revealFr || "" } : null,
    };
  });
  const recoveredCount = fragments.filter((f) => f.recovered).length;
  const total = 40;

  const arcUnlocked = (a: Arc) => a.triggers.filter(isRecovered).length >= a.threshold;

  const arcs: ArcState[] = ARCS.map((a) => {
    const recovered = a.triggers.filter(isRecovered).length;
    const unlocked = revealAll || recovered >= a.threshold;
    const base: ArcState = {
      key: a.key, title: a.title, unlocked, recovered, total: a.triggers.length,
      threshold: a.threshold, lockLabel: a.lockLabel, image: a.image ?? null,
      stage: baseStage(recovered, a.threshold, unlocked),
    };
    if (unlocked) base.reveal = a.reveal;
    return base;
  });

  const entities: EntityState[] = ENTITIES.map((e) => {
    const arc = arcForEntity(e.key);
    const declassified = revealAll || !arc || arcUnlocked(arc);
    let stage: Stage;
    if (!arc) stage = "VERIFIED";
    else {
      const rec = arc.triggers.filter(isRecovered).length;
      const unlocked = revealAll || rec >= arc.threshold;
      stage = baseStage(rec, arc.threshold, unlocked);
      if (unlocked && COMPROMISED_ENTITIES.has(e.key)) stage = "COMPROMISED";
    }
    const base: EntityState = { key: e.key, declassified, blur: ENTITY_BLUR[e.key] ?? "none", lockLabel: e.lockLabel, stage };
    if (!declassified) return base;
    return { ...base, title: e.title, status: e.status, role: e.role, intrigue: e.intrigue, objective: e.objective, state: e.state };
  });

  const palier = [...PALIERS].reverse().find((p) => recoveredCount >= p.threshold) || null;
  const stability = Math.round((recoveredCount / total) * 100);
  const finale = recoveredCount >= total ? FINALE : null;
  const characters = computeCharacters(isRecovered);
  const samuelIdentified = revealAll || isSamuelIdentified(isRecovered);

  return { total, recoveredCount, stability, palier, paliers: PALIERS, fragments, entities, arcs, characters, samuelIdentified, finale, previewMode: revealAll };
}

export async function getBibleStateCached(): Promise<BibleState> {
  const now = Date.now();
  if (_cache && now - _cacheAt < TTL_MS) return _cache;
  _cache = await computeBibleState();
  _cacheAt = now;
  return _cache;
}

export function invalidateBibleCache() { _cache = null; _cacheAt = 0; }

/** Is the arc/asset that gates a given image unlocked? Used by the gated asset endpoint. */
export async function isImageUnlocked(imageKey: string): Promise<boolean> {
  const st = await getBibleStateCached();
  // The engineer's portrait is also released once his identity is recovered.
  if (imageKey === "samuel" && st.samuelIdentified) return true;
  // Entity portraits are released once the entity dossier is declassified.
  const entity = st.entities.find((e) => e.key === imageKey);
  if (entity) return entity.declassified;
  // Arc images (e.g. the Deido site scan).
  return st.arcs.some((a) => a.image === imageKey && a.unlocked);
}
