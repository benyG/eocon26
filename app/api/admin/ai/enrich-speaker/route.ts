import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { getOpenAI, EOCON_CONTEXT } from "@/lib/openai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await hasPermission("prospection-speakers", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name, linkedin, website, title, org } = await req.json() as { name: string; linkedin?: string; website?: string; title?: string; org?: string };
  if (!name) return NextResponse.json({ error: "name requis" }, { status: 400 });

  const openai = getOpenAI();

  const prompt = `${EOCON_CONTEXT}

Tu es expert en sélection de speakers pour EOCON 2026, conférence cybersécurité pro bono bilingue FR/EN à Douala, Cameroun.

Analyse ce profil de speaker potentiel et propose des scores pour chaque critère de l'Indice de Priorité (IP) :

Speaker: ${name}
Titre: ${title || "non précisé"}
Organisation: ${org || "non précisée"}
LinkedIn: ${linkedin || "non fourni"}
Site web: ${website || "non fourni"}

Critères de scoring (nouveaux poids) :
- P1 (0-100) [25%]: Pertinence internationale — track record de conférences mondiales (RSA, Black Hat, DEF CON, TED…). 90-100 = speaker international régulier, 50-69 = événements nationaux, 0-29 = jamais speaker public.
- P2 (0-100) [10%]: Alignement thématique EOCON — couverture des 12 thématiques CFP (Offensive, ThreatIntel, Cloud, AI/Cyber, DFIR, AppSec, OT/ICS, Privacy, GRC, AfricaThreats, OpenSource, Awareness).
- P3 (0-100) [15%]: Africanité/Diaspora — 90-100 = africain engagé sur le continent, 70-89 = non-africain travail Afrique documenté, 0-29 = aucun lien.
- P4 (0-100) [30%]: Accessibilité & Budget — 90-100 = volontaire confirmé / communauté / académique, 40-69 = inconnu à clarifier, 0-19 = bureau speakers / cachet > 5000€.
- P5 (0-100) [10%]: Adéquation format — couvre un format/thématique rare dans EOCON.
- P6 (0-100) [10%]: Visibilité & Rayonnement — LinkedIn actif, publications, podcasts, médias.

Déduis aussi :
- topicMain: "TOP-01" à "TOP-12" (01=Offensive, 02=ThreatIntel, 03=Cloud, 04=AI, 05=DFIR, 06=AppSec, 07=OT-ICS, 08=Privacy, 09=GRC, 10=AfricaThreats, 11=OpenSource, 12=Awareness)
- participationModel: "volunteer", "unknown", ou "paid"
- formatRecommended: "keynote", "talk", "lightning", "workshop", ou "panel"
- summary: 2 phrases pour le comité de programme

JSON uniquement :
{
  "p1": <int 0-100>,
  "p2": <int 0-100>,
  "p3": <int 0-100>,
  "p4": <int 0-100>,
  "p5": <int 0-100>,
  "p6": <int 0-100>,
  "topicMain": "<TOP-XX>",
  "participationModel": "<volunteer|unknown|paid>",
  "formatRecommended": "<keynote|talk|lightning|workshop|panel>",
  "summary": "<2 phrases pour le comité>",
  "p1Reason": "<justification courte>",
  "p3Reason": "<justification courte>",
  "p4Reason": "<justification courte>"
}`;

  try {
    const r = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_completion_tokens: 600,
      response_format: { type: "json_object" },
    });
    const result = JSON.parse(r.choices[0]?.message?.content || "{}");
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
