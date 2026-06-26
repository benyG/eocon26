import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { getOpenAI, getEoconContext } from "@/lib/openai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await hasPermission("prospection", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { org, sector, contactName, contactTitle, website, recommendedPackage, aiScoreReason } = await req.json();
  if (!org) return NextResponse.json({ error: "Missing org" }, { status: 400 });

  const eoconCtx = await getEoconContext();

  const prompt = `Tu es un expert en partenariats pour EOCON — un mouvement, pas une conférence. Tu conseilles l'équipe sur la façon de convaincre des sponsors potentiels lors de rencontres.

Contexte EOCON : ${eoconCtx}

Positionnement EOCON :
EOCON ne doit jamais être réduit à une simple conférence. C'est une plateforme d'écosystème, un rendez-vous stratégique et un mouvement qui connecte talents, experts, entreprises, décideurs, institutions et diaspora autour de la cybersécurité africaine.

Phrase de référence :
"Where Africa secures the future."

Axes stratégiques disponibles :
1. Accès à un vivier de talents cyber : recrutement, marque employeur, visibilité auprès des profils techniques.
2. Positionnement sur le marché africain de la cybersécurité : présence précoce dans un écosystème en croissance.
3. Visibilité internationale : audience multi-pays, diaspora, accessibilité en ligne, rayonnement au-delà du Cameroun.
4. Association à un mouvement : contribution visible à la construction du futur cyber africain.
5. Crédibilité technique : workshops, CTF, talks experts, communautés spécialisées.
6. Influence business : accès à des décideurs, partenaires, institutions et entreprises sensibles aux enjeux cyber.

Sponsor potentiel :

Sponsor : ${org}
Secteur : ${sector || "non précisé"}
Contact : ${contactName || "non identifié"}${contactTitle ? ` (${contactTitle})` : ""}
Site web : ${website || "non disponible"}
Package recommandé : ${recommendedPackage || "à déterminer"}
${aiScoreReason ? `Analyse préliminaire : ${aiScoreReason}` : ""}

Instructions :
- Adapte l'argumentaire au secteur du sponsor.
- Ne fais aucune promesse non prouvée.
- N'invente aucun chiffre, partenaire, ville, speaker ou sponsor.
- Utilise uniquement les données présentes dans le contexte fourni.
- Ne parle pas seulement de visibilité logo : relie toujours le sponsoring à un résultat business concret.
- Si le secteur est inconnu, privilégie les angles universels : talents, image, écosystème, visibilité internationale, accès marché.
- Le ton doit être stratégique, direct, premium et orienté décision.
- Le brief doit aider l'équipe à savoir quoi dire, quoi éviter et comment ouvrir la discussion.

Génère un brief concis comprenant :
1. "accroche" : 1 à 2 phrases adaptées au sponsor.
2. "valeur" : 3 à 4 bénéfices concrets pour ce sponsor.
3. "objection" : l'objection la plus probable + une réponse préparée.
4. "ouverture" : une question intelligente pour démarrer la réunion.
5. "angle_prioritaire" : l'axe le plus fort à utiliser avec ce sponsor.
6. "a_eviter" : ce qu'il ne faut pas dire ou ne pas trop mettre en avant.
7. "brief_complet" : texte fluide de 200 mots maximum, prêt à être lu avant la réunion.

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
