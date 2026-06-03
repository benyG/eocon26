import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getOpenAI, EOCON_CONTEXT } from "@/lib/openai";

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
  const { brief } = await req.json();
  if (!brief) return NextResponse.json({ error: "Missing brief" }, { status: 400 });

  const openai = getOpenAI();
  const prompt = `${EOCON_CONTEXT}

Tu es community manager pour EOCON 2026. À partir du brief suivant, génère des posts pour les réseaux sociaux.

Brief: ${brief}

Génère en JSON uniquement, sans markdown :
{
  "linkedin_fr": "<post LinkedIn en français, 300 mots max, professionnel et engageant, inclure des emojis pertinents>",
  "linkedin_en": "<même post en anglais>",
  "twitter_fr": "<post Twitter/X en français, 280 caractères max strict>",
  "twitter_en": "<même post en anglais, 280 caractères max strict>",
  "instagram_fr": "<post Instagram en français, engageant, 5 hashtags pertinents à la fin>",
  "instagram_en": "<même post en anglais>"
}`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 1500,
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
