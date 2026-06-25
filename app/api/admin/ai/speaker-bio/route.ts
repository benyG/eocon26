import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { getOpenAI, getEoconContext } from "@/lib/openai";

export const dynamic = "force-dynamic";

interface BioResult {
  bioFr: string;
  bioEn: string;
  teaserFr: string;
  teaserEn: string;
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("cfp", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { bio, talkTitle, talkAbstract, name } = await req.json();
  if (!bio && !talkTitle) return NextResponse.json({ error: "Missing bio or talkTitle" }, { status: 400 });

  const openai = getOpenAI();
  const eoconCtx = await getEoconContext();
  const prompt = `${eoconCtx}

Tu es rédacteur éditorial pour EOCON — un mouvement, pas une conférence. Chaque speaker ne présente pas "un talk à EOCON" : il contribue à façonner l'écosystème cyber africain et international. Mets en valeur l'impact, la vision, l'expertise — jamais juste un titre ou une entreprise.

Speaker: ${name || "Speaker"}
Bio brute: ${bio || "non fournie"}
Titre du talk: ${talkTitle || "non fourni"}
Abstract: ${talkAbstract || "non fourni"}

Tâches:
1. Reformule la bio en 100 mots max, ton professionnel et dynamique, à la 3e personne
2. Génère un teaser du talk en 1 phrase percutante (pas de spoiler, donne envie d'assister)
3. Traduis bio et teaser en français ET anglais

Réponds en JSON uniquement, sans markdown :
{
  "bioFr": "<bio reformulée en français, 100 mots max>",
  "bioEn": "<bio en anglais, 100 mots max>",
  "teaserFr": "<teaser du talk en français, 1 phrase>",
  "teaserEn": "<teaser du talk en anglais, 1 phrase>"
}`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6,
    max_completion_tokens: 800,
  });

  const text = response.choices[0]?.message?.content || "{}";
  let result: BioResult;
  try {
    result = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim()) as BioResult;
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  return NextResponse.json(result);
}
