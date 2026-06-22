import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { getOpenAI, getEoconContext } from "@/lib/openai";
import { getCtaForContentType, getEventSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

interface PostsResult {
  linkedin_fr: string;
  linkedin_en: string;
  twitter_fr: string;
  twitter_en: string;
  instagram_fr: string;
  instagram_en: string;
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("communication", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { brief, contextType, contextItem } = await req.json() as { brief: string; contextType?: string; contextItem?: Record<string, unknown> };
  if (!brief) return NextResponse.json({ error: "Missing brief" }, { status: 400 });

  let contextSection = "";
  if (contextType && contextItem) {
    contextSection = `\nContexte spécifique : ${contextType} — ${JSON.stringify(contextItem)}`;
  }

  const [eoconCtx, settings] = await Promise.all([getEoconContext(), getEventSettings()]);
  const cta = getCtaForContentType(contextType || "custom", settings);

  // Build the full CTA reference block — all authorized URLs
  const allCtas = [
    { label: "Inscriptions", url: settings.url_inscription },
    { label: "CFP", url: settings.url_cfp },
    { label: "CTF / EOCTF", url: settings.url_ctf },
    { label: "Programme", url: settings.url_programme },
    { label: "Partenariat sponsor", url: settings.url_sponsor },
  ].filter(c => c.url);

  const ctaBlock = allCtas.length > 0
    ? `URLs AUTORISÉES (liste exhaustive — aucune autre URL ne peut apparaître dans les posts) :\n${allCtas.map(c => `  • ${c.label} : ${c.url}`).join("\n")}`
    : "Aucune URL CTA n'est configurée. N'inclure AUCUNE URL dans les posts.";

  const ctaForThisType = cta
    ? `\nCTA recommandé pour ce type de contenu (${contextType}) : "${cta.text}" → ${cta.url}`
    : "\nAucun CTA spécifique pour ce type de contenu. N'inclure aucun lien.";

  const openai = getOpenAI();
  const prompt = `${eoconCtx}${contextSection ? "\n" + contextSection : ""}

⛔ RÈGLE ABSOLUE — URLS :
Tu n'as JAMAIS le droit d'inventer une URL.
Tu n'as JAMAIS le droit d'utiliser un domaine tel que eocon.africa, eocon.com, eocon2026.com, eyesopen.com ou tout autre domaine non listé ci-dessous.
Si tu ne disposes d'aucune URL autorisée pour ce contenu, tu n'inclus AUCUN lien.
Toute URL présente dans un post DOIT être copiée mot pour mot depuis la liste ci-dessous, sans modification.

${ctaBlock}
${ctaForThisType}

Tu es la voix d'EOCON. Tu incarnes un mouvement, pas un événement.
Règles éditoriales :
— Ne jamais présenter EOCON comme "une conférence" : c'est un rendez-vous, une plateforme, un mouvement.
— Ne jamais vendre des talks ou des speakers seuls : vendre l'accès à une communauté, à des opportunités, à un écosystème.
— Toujours évoquer la dimension internationale : diaspora, audience de 15+ pays, accessibilité en ligne.
— Faire sentir que rater EOCON, c'est rater un moment dans l'évolution de la cybersécurité africaine et mondiale.
— Ton : ambitieux, visionnaire, premium, inspirant. Jamais générique, jamais purement promotionnel.
— Phrase de référence disponible : "Where Africa secures the future."

À partir du brief suivant, génère des posts optimisés pour chaque réseau social.

Brief: ${brief}

Règles de format :
- LinkedIn : professionnel, storytelling du mouvement, 200-300 mots, émojis pertinents, terminer par le CTA autorisé si disponible, hashtags en fin (#EOCON #EyesOpenCTF #Africa #SecuresTheFuture #Cameroon #Cybersecurity #InfoSec)
- Twitter/X : percutant, 260 caractères max strict, CTA autorisé si disponible, 2-3 hashtags max
- Instagram : visuel et engageant, 150 mots max, CTA autorisé si disponible, 8-10 hashtags variés en fin

Réponds en JSON uniquement, sans markdown :
{
  "linkedin_fr": "...",
  "linkedin_en": "...",
  "twitter_fr": "...",
  "twitter_en": "...",
  "instagram_fr": "...",
  "instagram_en": "..."
}`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_completion_tokens: 1500,
  });

  const text = response.choices[0]?.message?.content || "{}";
  let posts: PostsResult;
  try {
    posts = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim()) as PostsResult;
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  // Post-process: strip any URL not in the authorized list
  const authorizedUrls = allCtas.map(c => c.url).filter(Boolean) as string[];
  const stripHallucinatedUrls = (content: string): string => {
    // Match http(s) URLs and remove any that aren't in the authorized list
    return content.replace(/https?:\/\/[^\s)"\]]+/g, match => {
      const clean = match.replace(/[.,;!?]+$/, ""); // strip trailing punctuation
      return authorizedUrls.some(u => clean.startsWith(u) || u.startsWith(clean)) ? match : "";
    }).replace(/\s{2,}/g, " ").trim();
  };
  if (authorizedUrls.length > 0) {
    for (const key of Object.keys(posts) as (keyof PostsResult)[]) {
      posts[key] = stripHallucinatedUrls(posts[key]);
    }
  }

  // Save to DB
  const platforms: Array<{ platform: string; lang: string; content: string }> = [
    { platform: "linkedin", lang: "fr", content: posts.linkedin_fr },
    { platform: "linkedin", lang: "en", content: posts.linkedin_en },
    { platform: "twitter", lang: "fr", content: posts.twitter_fr },
    { platform: "twitter", lang: "en", content: posts.twitter_en },
    { platform: "instagram", lang: "fr", content: posts.instagram_fr },
    { platform: "instagram", lang: "en", content: posts.instagram_en },
  ];

  await prisma.socialPost.createMany({
    data: platforms.map(p => ({ brief, ...p })),
  });

  return NextResponse.json(posts);
}

export async function GET() {
  if (!(await hasPermission("communication", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const posts = await prisma.socialPost.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json(posts);
}
