import { prisma } from "@/lib/db";
import { getCtfdConfig, ctfdFetch } from "@/lib/ctfd";
import { ENTITIES, arcForEntity, ARCS, PALIERS, FINALE, ENTITY_BLUR, type Palier, type Arc } from "@/lib/loreStructure";
import { computeCharacters, isSamuelIdentified, type CharacterCard } from "@/lib/loreCharacters";
import { computeConcepts, CONCEPT_IMAGE_KEYS, type ConceptState } from "@/lib/loreConcepts";
import { getEventSettings } from "@/lib/settings";
import { evaluateCtfWindow, type CtfWindowState } from "@/lib/ctfWindow";
import { getTeamSolvedChallengeIds } from "@/lib/ctfdTeam";

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
// Global "state of the world" summary that drives the World State panel. Always
// computed from GLOBAL progress (never per-team), even when the rest of the page is
// showing a single team's view.
export interface WorldState {
  convergenceScore: number;   // 0..100 — higher = closer to reality collision
  convergenceStage: Stage;    // stage of the « The Convergence » concept dossier
  // Alert level. pre = before the window; averted/failed = after; the rest during
  // (or, with no window, derived purely from the fragment score).
  alert: "pre" | "ahead" | "ontrack" | "behind" | "critical" | "averted" | "failed";
  phase: "before" | "during" | "after" | "none";
  actualProgress: number;             // recoveredCount / total (0..1)
  expectedProgress: number | null;    // time-based expectation (only during the window)
  hasWindow: boolean;
  startMs: number | null;             // window bounds as epoch ms (browser countdown)
  endMs: number | null;
  serverNowMs: number;                // server clock at compute time (skew correction)
  recoveredCount: number;
  total: number;
}

export interface BibleState {
  total: number; recoveredCount: number; stability: number;
  palier: Palier | null; paliers: Palier[];
  fragments: FragmentState[]; entities: EntityState[]; arcs: ArcState[];
  characters: CharacterCard[]; concepts: ConceptState[]; samuelIdentified: boolean;
  finale: typeof FINALE | null; previewMode: boolean;
  worldState?: WorldState;    // only populated on the global state (never per-team)
  scope?: "global" | "team";  // which view this payload represents
  teamName?: string | null;   // echoed back for the team view
  teamResolved?: boolean;     // false when a requested team name could not be resolved
}

async function fetchSolves(): Promise<Map<number, number>> {
  const cfg = await getCtfdConfig();
  if (!cfg) return new Map();
  const r = await ctfdFetch<{ data?: Array<{ id: number; solves?: number }> }>(cfg, "GET", "/api/v1/challenges");
  const map = new Map<number, number>();
  if (r.ok && Array.isArray(r.data?.data)) for (const c of r.data.data) map.set(c.id, c.solves ?? 0);
  return map;
}

// Fragment-bearing challenges, cached briefly so per-team requests don't hit the DB
// on every view.
function loadChallenges() {
  return prisma.cTFChallenge.findMany({ where: { fragmentCode: { not: null } }, orderBy: [{ sortOrder: "asc" }] });
}
type Challenges = Awaited<ReturnType<typeof loadChallenges>>;
let _chs: Challenges | null = null;
let _chsAt = 0;
async function getChallengesCached(): Promise<Challenges> {
  const now = Date.now();
  if (_chs && now - _chsAt < TTL_MS) return _chs;
  _chs = await loadChallenges();
  _chsAt = now;
  return _chs;
}

// Pure builder: everything the record needs, given any "is this fragment recovered?"
// predicate. Used for the global view and, with a team-scoped predicate, per team.
function buildState(chs: Challenges, isRecovered: (code: string) => boolean, revealAll: boolean): BibleState {
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
  const concepts = computeConcepts(isRecovered);
  const samuelIdentified = revealAll || isSamuelIdentified(isRecovered);

  return { total, recoveredCount, stability, palier, paliers: PALIERS, fragments, entities, arcs, characters, concepts, samuelIdentified, finale, previewMode: revealAll };
}

// Convergence level tracks the « The Convergence » dossier's own escalation rather
// than raw progress, so before the event (stage DETECTED) it reads low — the world
// is healthy — instead of ~100% as if the collision had already happened.
function stageScore(s: Stage): number {
  return s === "RESOLVED" ? 94 : s === "COMPROMISED" ? 84 : s === "VERIFIED" ? 52 : 22;
}

// Derive the global World State (convergence level + alert) from the built global
// record and the configured CTF window. The state can only turn red/critical INSIDE
// the live window; before it (or with no window configured) the world is healthy.
function computeWorldState(state: BibleState, win: CtfWindowState): WorldState {
  const total = state.total;
  const rc = state.recoveredCount;
  const actual = total > 0 ? rc / total : 0;
  const convStage = state.concepts.find((c) => c.key === "convergence")?.stage ?? "DETECTED";
  const compromised = convStage === "COMPROMISED";
  let convergenceScore = stageScore(convStage);

  let alert: WorldState["alert"];
  let expected: number | null = null;

  if (rc >= total) {
    // The record is closed — the convergence is repelled, whatever the clock says.
    alert = "averted";
  } else if (win.phase === "during") {
    // Only inside the live window can the state read red/critical.
    expected = win.progress;
    const delta = actual - expected;
    if (compromised) alert = "critical";
    else if (delta >= 0.10) alert = "ahead";
    else if (delta >= -0.10) alert = "ontrack";
    else if (delta >= -0.25) alert = "behind";
    else alert = "critical";
  } else if (win.phase === "after") {
    alert = rc >= 36 ? "averted" : "failed";
  } else {
    // Before the window, or with no window configured: the world is still healthy —
    // never red. Reflect only the convergence dossier's own escalation (DETECTED,
    // i.e. "pre", until its evidence is recovered).
    alert = compromised ? "behind"
      : (convStage === "VERIFIED" || convStage === "RESOLVED") ? "ontrack"
      : "pre";
  }

  if (alert === "averted") convergenceScore = Math.min(convergenceScore, 10);

  return {
    convergenceScore, convergenceStage: convStage, alert, phase: win.phase,
    actualProgress: actual, expectedProgress: expected, hasWindow: win.hasWindow,
    startMs: win.startMs, endMs: win.endMs, serverNowMs: win.nowMs,
    recoveredCount: rc, total,
  };
}

export async function computeBibleState(): Promise<BibleState> {
  const [preview, settings, chs] = await Promise.all([
    prisma.eventSetting.findUnique({ where: { key: "bibleRevealAll" } }),
    getEventSettings().catch(() => ({} as Record<string, string>)),
    getChallengesCached(),
  ]);
  const revealAll = preview?.value === "true";

  const solves = revealAll ? null : await fetchSolves();
  const byCode = new Map(chs.map((c) => [c.fragmentCode!, c]));
  const isRecovered = (code: string) => {
    if (revealAll) return true;
    const c = byCode.get(code);
    return !!c?.ctfdId && (solves!.get(c.ctfdId) ?? 0) > 0;
  };

  const state = buildState(chs, isRecovered, revealAll);
  state.scope = "global";
  state.worldState = computeWorldState(state, evaluateCtfWindow(settings.ctf_start, settings.ctf_end));
  return state;
}

// Per-team record view. Same computation as the global state but driven by a single
// team's CTFd solves. Returns null when the team can't be resolved so the caller can
// fall back to the global view without surfacing an error. No worldState — the World
// State panel always reads the global payload.
export async function computeTeamBibleState(teamName: string): Promise<BibleState | null> {
  const solvedIds = await getTeamSolvedChallengeIds(teamName);
  if (solvedIds == null) return null;
  const chs = await getChallengesCached();
  const byCode = new Map(chs.map((c) => [c.fragmentCode!, c]));
  const isRecovered = (code: string) => {
    const c = byCode.get(code);
    return !!c?.ctfdId && solvedIds.has(c.ctfdId);
  };
  const state = buildState(chs, isRecovered, false);
  state.scope = "team";
  state.teamName = teamName;
  return state;
}

export async function getBibleStateCached(): Promise<BibleState> {
  const now = Date.now();
  if (_cache && now - _cacheAt < TTL_MS) return _cache;
  _cache = await computeBibleState();
  _cacheAt = now;
  return _cache;
}

export function invalidateBibleCache() { _cache = null; _cacheAt = 0; _chs = null; _chsAt = 0; }

/** Is the arc/asset that gates a given image unlocked? Used by the gated asset endpoint. */
export async function isImageUnlocked(imageKey: string): Promise<boolean> {
  // The two concept-card images are the narrative hook — never sealed, always served.
  if (CONCEPT_IMAGE_KEYS.has(imageKey)) return true;
  const st = await getBibleStateCached();
  // The engineer's portrait is also released once his identity is recovered.
  if (imageKey === "samuel" && st.samuelIdentified) return true;
  // Entity portraits are released once the entity dossier is declassified.
  const entity = st.entities.find((e) => e.key === imageKey);
  if (entity) return entity.declassified;
  // Arc images (e.g. the Deido site scan).
  return st.arcs.some((a) => a.image === imageKey && a.unlocked);
}
