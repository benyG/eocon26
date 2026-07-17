import crypto from "crypto";
import { prisma } from "@/lib/db";
import { REVELATION_ARCS } from "@/lib/revelationContent";
import { getCtfdConfig, ctfdFetch } from "@/lib/ctfd";

// Per-arc unlock tokens live in event settings (server-side only). They are
// distinct from the CTFd flag so that sharing the bible unlock URL never leaks a
// submittable flag. Generated lazily, once, per arc.
function tokenKey(arc: number) { return `bibleUnlock_${arc}`; }

export async function getArcToken(arc: number): Promise<string> {
  const key = tokenKey(arc);
  const existing = await prisma.eventSetting.findUnique({ where: { key } });
  if (existing?.value) return existing.value;
  const token = crypto.randomBytes(18).toString("base64url"); // ~24 chars, unguessable
  await prisma.eventSetting.upsert({ where: { key }, update: { value: token }, create: { key, value: token } });
  return token;
}

export async function getSiteBaseUrl(): Promise<string> {
  const s = await prisma.eventSetting.findUnique({ where: { key: "site_base_url" } });
  return (s?.value || process.env.NEXT_PUBLIC_URL || "https://eyesopensecurity.com").replace(/\/$/, "");
}

/** Absolute unlock URL to embed in the CTFd synthesis challenge description. */
export async function getUnlockUrl(arc: number): Promise<string> {
  const [base, token] = await Promise.all([getSiteBaseUrl(), getArcToken(arc)]);
  return `${base}/api/public/bible/unlock?arc=${arc}&k=${encodeURIComponent(token)}`;
}

/** Absolute deep-link the unlock endpoint redirects to after a successful unlock. */
export async function getRevealRedirect(arc: number): Promise<string> {
  const base = await getSiteBaseUrl();
  return `${base}/ctf-briefing.html#reveal-${arc}`;
}

export async function getUnlockedArcs(): Promise<number[]> {
  const rows = await prisma.revelationUnlock.findMany({ select: { arc: true } });
  return rows.map((r) => r.arc).sort((a, b) => a - b);
}

export async function unlockArc(arc: number, via: "key" | "ctfd" | "admin", by?: string): Promise<boolean> {
  if (!REVELATION_ARCS.includes(arc as never)) return false;
  await prisma.revelationUnlock.upsert({
    where: { arc },
    update: {}, // idempotent — first unlock wins, keep original attribution
    create: { arc, unlockedVia: via, unlockedBy: by ?? null },
  });
  return true;
}

export async function lockArc(arc: number): Promise<void> {
  await prisma.revelationUnlock.deleteMany({ where: { arc } });
}

// ── Auto-unlock from CTFd solves ──────────────────────────────────────────────
// As soon as a synthesis challenge has ≥1 solve on CTFd, its arc opens for everyone.
// This complements the key URL (which stays as the deliberate "reveal it" gesture).
export async function syncFromCtfdSolves(): Promise<number[]> {
  const cfg = await getCtfdConfig();
  if (!cfg) return [];
  const synth = await prisma.cTFChallenge.findMany({ where: { isSynthesis: true, ctfdId: { not: null } } });
  const synced: number[] = [];
  for (const s of synth) {
    const r = await ctfdFetch<{ data?: { solves?: number } }>(cfg, "GET", `/api/v1/challenges/${s.ctfdId}`);
    const solves = r.ok ? r.data?.data?.solves ?? 0 : 0;
    if (solves > 0) {
      for (const arcStr of (s.revelation || "").split(",").map((x) => x.trim()).filter(Boolean)) {
        const n = parseInt(arcStr, 10);
        if (REVELATION_ARCS.includes(n as never)) { await unlockArc(n, "ctfd"); synced.push(n); }
      }
    }
  }
  return Array.from(new Set(synced)).sort((a, b) => a - b);
}

// Throttled, fire-and-forget trigger used by the public state endpoint so arcs
// open automatically as the bible is viewed — without ever blocking the response
// or hammering CTFd (at most once per minute across the whole server).
let _lastAutoSync = 0;
export function maybeAutoSyncFromCtfd(): void {
  const now = Date.now();
  if (now - _lastAutoSync < 60_000) return;
  _lastAutoSync = now;
  syncFromCtfdSolves().catch(() => {});
}
