import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { RSS_FEEDS } from "@/lib/rssFeeds";
import { getOpenAI, getEoconContext } from "@/lib/openai";

export const dynamic = "force-dynamic";

// ── Minimal RSS/Atom XML parser (no deps needed) ─────────────────────────────

function extractTag(xml: string, tag: string): string {
  // Handle CDATA
  const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i");
  const m = cdataRe.exec(xml);
  if (m) return m[1].trim();
  // Handle plain tag (possibly self-closing namespace-prefixed)
  const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m2 = plainRe.exec(xml);
  if (m2) return m2[1].replace(/<[^>]+>/g, "").trim();
  return "";
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 800);
}

interface RawItem { title: string; url: string; summary: string; pubDate: string }

function parseRSS(xml: string): RawItem[] {
  const items: RawItem[] = [];
  // Works for RSS 2.0 and basic Atom
  const itemRe = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = extractTag(block, "title");
    // Atom uses <link href="..."/>, RSS uses <link>url</link>
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
    if (title && url) items.push({ title, url, summary, pubDate });
  }
  return items.slice(0, 15); // max 15 items per feed
}

// ── AI scoring + draft generation ────────────────────────────────────────────

interface AiResult { score: number; reason: string; draft_fr: string; draft_en: string }

async function scoreAndDraft(
  item: RawItem,
  sourceName: string,
  eoconCtx: string,
  openai: ReturnType<typeof getOpenAI>,
): Promise<AiResult | null> {
  const prompt = `Tu es community manager pour EOCON, conférence cybersécurité africaine.

Contexte EOCON : ${eoconCtx}

Analyse cet article cyber et génère un post LinkedIn/Twitter engageant.

Titre : ${item.title}
Source : ${sourceName}
Résumé : ${item.summary}
URL : ${item.url}

Règles :
- Le post aborde le sujet librement, avec une opinion ou un angle éditorial fort
- EOCON est mentionné subtilement en fin de post (ex : "C'est exactement le type de sujet qu'on creuse à #EOCON2026")
- Ne commence PAS par "EOCON" ou le nom de la conférence
- CTA naturel avec l'URL de l'article

Réponds uniquement en JSON :
{
  "score": 0.0-1.0,
  "reason": "1 phrase expliquant la pertinence",
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
    const parsed = JSON.parse(raw) as AiResult;
    if (typeof parsed.score !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

// ── Main fetch handler ────────────────────────────────────────────────────────

export async function POST() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Load settings
  const settingsRow = await prisma.eventSetting.findUnique({ where: { key: "cyber_watch_settings" } });
  const settings = settingsRow ? JSON.parse(settingsRow.value) : {};
  const activeSources: string[] = settings.activeSources ?? RSS_FEEDS.map(f => f.id);
  const minScore: number = 0.55;

  const feeds = RSS_FEEDS.filter(f => activeSources.includes(f.id));
  if (!feeds.length) return NextResponse.json({ fetched: 0, saved: 0 });

  // Collect existing URLs to avoid duplicates
  const existing = await prisma.cyberWatchItem.findMany({
    select: { url: true },
    where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
  });
  const existingUrls = new Set(existing.map(e => e.url));

  const openai = getOpenAI();
  const eoconCtx = await getEoconContext();

  let fetched = 0;
  let saved = 0;

  for (const feed of feeds) {
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

    const items = parseRSS(xml);
    fetched += items.length;

    for (const item of items) {
      if (existingUrls.has(item.url)) continue;
      existingUrls.add(item.url);

      const ai = await scoreAndDraft(item, feed.name, eoconCtx, openai);
      if (!ai || ai.score < minScore) continue;

      const expiresAt = new Date(Date.now() + 5 * 24 * 3600 * 1000);
      await prisma.cyberWatchItem.create({
        data: {
          sourceId: feed.id,
          sourceName: feed.name,
          title: item.title,
          url: item.url,
          summary: item.summary,
          aiScore: ai.score,
          aiReason: ai.reason,
          draftFr: ai.draft_fr,
          draftEn: ai.draft_en,
          status: "pending",
          platforms: settings.channels?.join(",") || "linkedin",
          expiresAt,
        },
      });
      saved++;
    }
  }

  return NextResponse.json({ fetched, saved });
}
