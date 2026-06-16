import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { getOpenAI, getEoconContext } from "@/lib/openai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await hasPermission("prospection", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { org, sector, contactName, contactTitle, website, recommendedPackage, aiScoreReason } = await req.json();
  if (!org) return NextResponse.json({ error: "Missing org" }, { status: 400 });

  const eoconCtx = await getEoconContext();

  const prompt = `Tu es un expert en sponsoring d'événements tech africains, conseillant l'équipe EOCON.

Contexte EOCON : ${eoconCtx}

Tu dois préparer un brief stratégique INTERNE (200 mots max) pour convaincre ce sponsor potentiel lors d'une rencontre.

Sponsor : ${org}
Secteur : ${sector || "non précisé"}
Contact : ${contactName || "non identifié"}${contactTitle ? ` (${contactTitle})` : ""}
Site web : ${website || "non disponible"}
Package recommandé : ${recommendedPackage || "à déterminer"}
${aiScoreReason ? `Analyse préliminaire : ${aiScoreReason}` : ""}

Génère un brief concis comprenant :
1. **Accroche** (1-2 phrases) : l'argument central adapté à leur secteur
2. **Valeur concrète** (3-4 points) : ce qu'ils gagnent concrètement avec EOCON (visibilité, leads, image)
3. **Objection probable** + réponse préparée
4. **Ouverture de réunion** : une question d'amorce pour engager la conversation

Réponds uniquement en JSON :
{
  "accroche": "...",
  "valeur": ["point 1", "point 2", "point 3"],
  "objection": { "question": "...", "reponse": "..." },
  "ouverture": "...",
  "brief_complet": "texte complet du brief en 200 mots max, prêt à être lu avant la réunion"
}`;

  try {
    const openai = getOpenAI();
    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_completion_tokens: 800,
      response_format: { type: "json_object" },
    });
    const raw = res.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
