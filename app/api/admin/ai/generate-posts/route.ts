import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
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
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { brief, contextType, contextItem } = await req.json() as { brief: string; contextType?: string; contextItem?: Record<string, unknown> };
  if (!brief) return NextResponse.json({ error: "Missing brief" }, { status: 400 });

  let contextSection = "";
  if (contextType && contextItem) {
    contextSection = `\nContexte spécifique : ${contextType} — ${JSON.stringify(contextItem)}`;
  }

  const [eoconCtx, settings] = await Promise.all([getEoconContext(), getEventSettings()]);
  const cta = getCtaForContentType(contextType || "custom", settings);
  const ctaSection = cta ? `\nCTA à inclure dans chaque post : "${cta.text}" → ${cta.url}` : "";

  const openai = getOpenAI();
  const prompt = `${eoconCtx}${contextSection}${ctaSection}

Tu es community manager expert pour EOCON 2026. À partir du brief suivant, génère des posts optimisés pour chaque réseau social.

Brief: ${brief}

Règles importantes:
- LinkedIn: professionnel, storytelling, 200-300 mots, émojis pertinents, inclure le CTA avec le lien exact fourni, hashtags en fin (#EOCON2026 #Cybersécurité #Afrique #Douala)
- Twitter/X: percutant, 260 caractères max strict, inclure le lien CTA, 2-3 hashtags max
- Instagram: visuel et engageant, 150 mots max, inclure le lien CTA, 8-10 hashtags variés en fin

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
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const posts = await prisma.socialPost.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json(posts);
}
