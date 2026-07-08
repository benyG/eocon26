import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { RSS_FEEDS } from "@/lib/rssFeeds";
import { getOpenAI, getEoconContext } from "@/lib/openai";

export const dynamic = "force-dynamic";

// ── Minimal RSS/Atom XML parser (no deps needed) ─────────────────────────────

function extractTag(xml: string, tag: string): string {
  const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i");
  const m = cdataRe.exec(xml);
  if (m) return m[1].trim();
  const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m2 = plainRe.exec(xml);
  if (m2) return m2[1].replace(/<[^>]+>/g, "").trim();
  return "";
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 800);
}

interface RawItem { title: string; url: string; summary: string; pubDate: string; feedId: string; feedName: string }

function parseRSS(xml: string, feedId: string, feedName: string): RawItem[] {
  const items: RawItem[] = [];
  const itemRe = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = extractTag(block, "title");
    let url = extractTag(block, "link");
    if (!url) {
      const linkAttr = /<link[^>]+href="([^"]+)"/.exec(block);
      if (linkAttr) url = linkAttr[1];
    }
    const summary = stripHtml(
      extractTag(block, "description") ||
      extractTag(block, "content:encoded") ||
      extractTag(block, "summary") ||
      extractTag(block, "content")
    );
    const pubDate = extractTag(block, "pubDate") || extractTag(block, "published") || extractTag(block, "updated");
    if (title && url) items.push({ title, url, summary, pubDate, feedId, feedName });
  }
  return items.slice(0, 15);
}

// ── Freshness filter ─────────────────────────────────────────────────────────

function isFresh(pubDate: string, maxAgeDays: number): boolean {
  if (!pubDate) return true; // unknown date → keep
  const d = new Date(pubDate);
  if (isNaN(d.getTime())) return true;
  return Date.now() - d.getTime() < maxAgeDays * 24 * 3600 * 1000;
}

// ── EOCON CTA phrases ─────────────────────────────────────────────────────────

const EOCON_MENTIONS_FR = [
   "Ce type d’actualité rappelle pourquoi des espaces comme #EOCON sont essentiels pour la communauté cyber africaine.",
   "Encore un signal que la cybersécurité n’est plus un sujet de niche. #EOCON existe aussi pour garder cette conversation vivante.",
   "L’actualité cyber avance vite. La communauté doit avancer avec elle. #EOCON",
   "Chaque nouvelle tendance cyber rappelle l’importance de structurer des espaces d’échange, de veille et de collaboration. #EOCON",
   "Ce genre de sujet montre à quel point la cybersécurité devient centrale pour nos économies, nos institutions et nos talents. #EOCON",
   "La scène cyber africaine doit rester connectée à ces évolutions. C’est aussi l’esprit de #EOCON.",
   "Ces sujets méritent plus d’attention dans nos écosystèmes tech et business. #EOCON contribue à ouvrir cet espace.",
   "L’Afrique cyber a besoin d’espaces où les talents, les experts et les décideurs se croisent. #EOCON s’inscrit dans cette dynamique.",
   "Au-delà de cette actualité, une chose est claire : la cybersécurité devient un enjeu stratégique. #EOCON",
   "Ce type d’information rappelle que la culture cyber doit se construire en continu, pas seulement en réaction aux crises. #EOCON",
   "La veille cyber est devenue indispensable. Les espaces comme #EOCON aident à transformer l’information en réflexion collective.",
   "Encore une preuve que la cybersécurité concerne tout le monde : entreprises, institutions, talents et citoyens. #EOCON",
   "Ce signal mérite d’être pris au sérieux. La maturité cyber commence aussi par la conversation, la veille et la communauté. #EOCON",
   "Les enjeux évoluent vite. Construire une communauté cyber forte devient une nécessité, pas une option. #EOCON",
   "Cette actualité rappelle que l’écosystème cyber africain doit rester visible, informé et connecté. #EOCON",
];
const EOCON_MENTIONS_EN = [
    "This kind of news reminds us why spaces like #EOCON are essential for the African cybersecurity community.",
    "Another signal that cybersecurity is no longer a niche topic. #EOCON also exists to keep this conversation alive.",
    "Cyber news moves fast. The community must move with it. #EOCON",
    "Every new cyber trend reminds us why spaces for exchange, intelligence-sharing and collaboration matter. #EOCON",
    "This kind of topic shows how central cybersecurity has become for our economies, institutions and talent. #EOCON",
    "The African cyber scene must stay connected to these developments. That is also the spirit of #EOCON.",
    "These topics deserve more attention across our tech and business ecosystems. #EOCON helps open that space.",
    "Africa’s cyber ecosystem needs spaces where talent, experts and decision-makers meet. #EOCON is part of that momentum.",
    "Beyond this news, one thing is clear: cybersecurity is becoming a strategic priority. #EOCON",
    "This kind of information reminds us that cyber culture must be built continuously, not only in reaction to crises. #EOCON",
    "Cyber intelligence and monitoring have become essential. Spaces like #EOCON help turn information into collective reflection.",
    "Another reminder that cybersecurity concerns everyone: companies, institutions, talent and citizens. #EOCON",
    "This signal deserves attention. Cyber maturity also starts with conversation, awareness and community. #EOCON",
    "The stakes are evolving fast. Building a strong cyber community is becoming a necessity, not an option. #EOCON",
    "This news reminds us that the African cyber ecosystem must remain visible, informed and connected. #EOCON",

];
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

// ── Phase A: batch scoring (1 call per batch of up to 20 items) ───────────────

interface ScoreResult { index: number; score: number; reason: string }

async function batchScore(
  items: RawItem[],
  eoconCtx: string,
  openai: ReturnType<typeof getOpenAI>,
): Promise<ScoreResult[]> {
  const list = items.map((it, i) =>
    `${i}. [${it.feedName}] ${it.title} — ${it.summary.slice(0, 200)}`
  ).join("\n");

  const prompt = `Tu es éditeur pour EOCON, conférence cybersécurité africaine.
Contexte EOCON : ${eoconCtx}

Évalue la pertinence éditoriale de chaque article pour un post LinkedIn/Twitter EOCON.
Score 0.0-1.0 : 1.0 = excellent angle cyber/Afrique, 0.0 = hors sujet ou trop générique.

Articles :
${list}

Réponds uniquement en JSON :
{ "scores": [ { "index": 0, "score": 0.0, "reason": "1 phrase" }, ... ] }`;

  try {
    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_completion_tokens: 800,
      response_format: { type: "json_object" },
    });
    const raw = res.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as { scores: ScoreResult[] };
    return parsed.scores ?? [];
  } catch {
    return [];
  }
}

// ── Phase B: draft generation (1 call per retained article) ──────────────────

interface DraftResult { draft_fr: string; draft_en: string }

async function generateDraft(
  item: RawItem,
  eoconCtx: string,
  openai: ReturnType<typeof getOpenAI>,
): Promise<DraftResult | null> {
  const eoconFr = pick(EOCON_MENTIONS_FR);
  const eoconEn = pick(EOCON_MENTIONS_EN);

  const prompt = `Tu es community manager pour EOCON, conférence cybersécurité africaine.
Contexte EOCON : ${eoconCtx}

Génère un post LinkedIn/Twitter engageant pour cet article.

Titre : ${item.title}
Source : ${item.feedName}
Résumé : ${item.summary}
URL : ${item.url}

Règles :
- Angle éditorial fort, vraie opinion, pas de résumé plat
- Ne mentionne PAS "EOCON2026" — utilise toujours uniquement "EOCON" (sans année)
- Ne commence PAS le post par "EOCON" ou le nom de la conférence
- Intègre naturellement cette phrase de clôture pour le post FR : "${eoconFr}"
- Intègre naturellement cette phrase de clôture pour le post EN : "${eoconEn}"
- CTA naturel avec l'URL de l'article

Réponds uniquement en JSON :
{
  "draft_fr": "post LinkedIn en français (180-250 mots, engageant, hashtags cyber en fin)",
  "draft_en": "post LinkedIn en anglais (même format)"
}`;

  try {
    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.75,
      max_completion_tokens: 1200,
      response_format: { type: "json_object" },
    });
    const raw = res.choices[0]?.message?.content || "{}";
    return JSON.parse(raw) as DraftResult;
  } catch {
    return null;
  }
}

// ── Main fetch handler ────────────────────────────────────────────────────────

const BATCH_SIZE = 20;

export async function POST() {
  if (!(await hasPermission("cyber-watch", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Load settings
  const settingsRow = await prisma.eventSetting.findUnique({ where: { key: "cyber_watch_settings" } });
  const settings = settingsRow ? JSON.parse(settingsRow.value) : {};
  const activeSources: string[] = settings.activeSources ?? RSS_FEEDS.map(f => f.id);
  const minScore: number = settings.minScore ?? 0.55;
  const dailyCount: number = settings.dailyCount ?? 3;
  const daysExpiry: number = 5;
  const maxAgeDays: number = settings.maxAgeDays ?? 14; // default: keep articles up to 14 days old

  const feeds = RSS_FEEDS.filter(f => activeSources.includes(f.id));
  if (!feeds.length) return NextResponse.json({ fetched: 0, scored: 0, saved: 0 });

  // ── Cap: how many new items do we actually need? ──────────────────────────
  const pendingCount = await prisma.cyberWatchItem.count({
    where: { status: { in: ["pending", "approved"] } },
  });
  const needed = Math.max(0, dailyCount * daysExpiry - pendingCount);
  if (needed === 0) {
    return NextResponse.json({ fetched: 0, scored: 0, saved: 0, skipped: "queue_full" });
  }

  // ── Dedupe URLs seen in the last 7 days ───────────────────────────────────
  const existing = await prisma.cyberWatchItem.findMany({
    select: { url: true },
    where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
  });
  const existingUrls = new Set(existing.map(e => e.url));

  const openai = getOpenAI();
  const eoconCtx = await getEoconContext();

  // ── Step 1: Fetch all feeds, apply freshness + dedupe filters ─────────────
  const candidates: RawItem[] = [];
  let fetched = 0;

  // Priority: african feeds first, then global, then threat_intel
  const PRIORITY_ORDER = ["africain", "francophone", "mondial", "threat_intel", "bonus"];
  const sortedFeeds = [...feeds].sort((a, b) => {
    const ai = PRIORITY_ORDER.indexOf((a as { category?: string }).category ?? "");
    const bi = PRIORITY_ORDER.indexOf((b as { category?: string }).category ?? "");
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  for (const feed of sortedFeeds) {
    let xml = "";
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "EOCON-CyberWatch/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      xml = await res.text();
    } catch {
      continue;
    }

    const items = parseRSS(xml, feed.id, feed.name);
    fetched += items.length;

    for (const item of items) {
      if (existingUrls.has(item.url)) continue;
      if (!isFresh(item.pubDate, maxAgeDays)) continue;
      existingUrls.add(item.url);
      candidates.push(item);
    }
  }

  if (!candidates.length) return NextResponse.json({ fetched, candidates: 0, scored: 0, saved: 0, skipped: "all_filtered" });

  // ── Step 2: Batch score all candidates (1 API call per 20 items) ──────────
  const allScores: ScoreResult[] = [];
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    const scores = await batchScore(batch, eoconCtx, openai);
    // Re-map indices to global positions
    for (const s of scores) {
      allScores.push({ ...s, index: s.index + i });
    }
  }

  // Sort by score desc, keep only those above threshold
  const retained = allScores
    .filter(s => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, needed); // never draft more than needed

  const scored = allScores.length;

  // ── Step 3: Generate drafts only for retained items ───────────────────────
  let saved = 0;
  const expiresAt = new Date(Date.now() + daysExpiry * 24 * 3600 * 1000);

  for (const { index, score, reason } of retained) {
    const item = candidates[index];
    const draft = await generateDraft(item, eoconCtx, openai);
    if (!draft?.draft_fr || !draft?.draft_en) continue;

    await prisma.cyberWatchItem.create({
      data: {
        sourceId: item.feedId,
        sourceName: item.feedName,
        title: item.title,
        url: item.url,
        summary: item.summary,
        aiScore: score,
        aiReason: reason,
        draftFr: draft.draft_fr,
        draftEn: draft.draft_en,
        status: "pending",
        platforms: settings.channels?.join(",") || "linkedin",
        expiresAt,
      },
    });
    saved++;
  }

  return NextResponse.json({ fetched, candidates: candidates.length, scored, saved });
}
