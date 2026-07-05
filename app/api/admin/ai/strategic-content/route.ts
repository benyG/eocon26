import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { getOpenAI, getEoconContext } from "@/lib/openai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await hasPermission("strategic-plan", "write")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { type, context } = await req.json() as {
    type: "channel" | "announcement" | "target";
    context: Record<string, unknown>;
  };

  const eoconCtx = await getEoconContext();
  const openai = getOpenAI();

  let prompt = `${eoconCtx}\n\nTu es la voix d'EOCON — un mouvement, pas une conférence. Tu incarnes un rendez-vous annuel où l'écosystème cyber mondial et particulièrement africain se retrouve pour construire l'avenir de la sécurité numérique. Ton : ambitieux, visionnaire, international, premium, inspirant. Ne jamais vendre des talks seuls — vendre l'accès à une communauté, à des opportunités, à un écosystème. Toujours évoquer la dimension internationale. Réponds UNIQUEMENT en JSON valide, sans markdown.\n\n`;

  if (type === "channel") {
    prompt += `Génère un message/contenu prêt à publier pour cette plateforme :
- Plateforme : ${context.platform}
- Catégorie : ${context.category}
- Objectif : ${context.objective}
- Ce qu'il faut publier : ${context.what}
- Action recommandée : ${context.action}
- URL de la plateforme : ${context.url || "Non renseignée"}
- Priorité : ${context.priority === 1 ? "Haute" : context.priority === 2 ? "Moyenne" : "Basse"}

Adapte le ton et le format à la plateforme. Si un CTA ou lien est nécessaire, utilise UNIQUEMENT les URLs officielles fournies dans le contexte ci-dessus. N'invente aucun lien.

JSON attendu :
{
  "message_fr": "Message complet en français prêt à utiliser",
  "message_en": "Full message in English ready to use",
  "notes": "Conseils pratiques : timing, format, personnes à contacter, etc."
}`;
  } else if (type === "announcement") {
    prompt += `Génère le contenu complet pour cette annonce officielle EOCON 2026 :
- Annonce : ${context.title}
- Cible : ${context.target}
- Message central : ${context.message}
- CTA : ${context.cta}
- Plateformes prioritaires : ${context.platforms}

Génère un contenu percutant, professionnel, adapté à un événement cyber de référence en Afrique.

JSON attendu :
{
  "message_fr": "Annonce complète en français (300-400 mots, structurée avec accroche, corps et CTA)",
  "message_en": "Full announcement in English (300-400 words, structured with hook, body and CTA)",
  "notes": "Conseils de publication, timing recommandé et adaptations par plateforme"
}`;
  } else {
    prompt += `Génère un message personnalisé pour cette cible :
- Cible : ${context.target}
- Angle : ${context.angle}
- Message à mettre en avant : ${context.message}
- Canal principal : ${context.channel}

Génère un message direct, adapté à la sensibilité de cette cible spécifique, avec un CTA clair.

JSON attendu :
{
  "message_fr": "Message personnalisé en français (150-250 mots)",
  "message_en": "Personalized message in English (150-250 words)",
  "notes": "Conseils sur le ton, le canal, le timing et les points de contact"
}`;
  }

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_completion_tokens: 1200,
  });

  const text = response.choices[0]?.message?.content || "{}";
  try {
    const result = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
