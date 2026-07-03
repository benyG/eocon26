import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { getOpenAI, EOCON_CONTEXT } from "@/lib/openai";
import { searchPeople } from "@/lib/apollo";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await hasPermission("prospection-speakers", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!process.env.APOLLO_API_KEY) return NextResponse.json({ error: "APOLLO_API_KEY non configuré" }, { status: 503 });

  const { titles, regions, perPage } = await req.json() as { titles?: string[]; regions?: string[]; perPage?: number };

  let people;
  try {
    people = await searchPeople({
      person_titles: titles || ["CISO", "Security Researcher", "Penetration Tester", "Red Team Lead", "Threat Intelligence Analyst", "Security Architect", "CTF Player", "Malware Analyst", "Incident Responder"],
      person_locations: regions || ["Cameroon", "Nigeria", "Senegal", "Kenya", "Ivory Coast", "Ghana", "South Africa", "France", "Canada", "United Kingdom", "Belgium", "Switzerland"],
      per_page: perPage || 15,
    });
  } catch (e) {
    return NextResponse.json({ error: `Apollo: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }

  const openai = getOpenAI();
  const results = [];

  for (const person of people) {
    let aiSuggestion = null;
    try {
      const prompt = `${EOCON_CONTEXT}

Évalue ce profil de speaker potentiel pour EOCON 2026 (conférence cybersécurité pro bono, Douala, Cameroun):
Nom: ${person.name}
Titre: ${person.title || "inconnu"}
Organisation: ${person.organization_name || "inconnu"}
LinkedIn: ${person.linkedin_url || "non disponible"}

Sur la base du titre et de l'organisation, suggère des scores approximatifs :
- P1 (0-100): pertinence internationale (track record conférences mondiales)
- P3 (0-100): africanité/diaspora (lien Afrique)
- P4 (0-100): accessibilité pro bono (90-100 = volontaire évident, 50-70 = inconnu, 0-20 = payant confirmé)
- P6 (0-100): visibilité/rayonnement public
- topicMain: l'une de ces valeurs: "TOP-01" à "TOP-12" selon expertise (01=Offensive, 02=ThreatIntel, 03=Cloud, 04=AI, 05=DFIR, 06=AppSec, 07=OT-ICS, 08=Privacy, 09=GRC, 10=AfricaThreats, 11=OpenSource, 12=Awareness)
- participationModel: "volunteer", "unknown", ou "paid"

JSON uniquement: {"p1": <int>, "p3": <int>, "p4": <int>, "p6": <int>, "topicMain": "<TOP-XX>", "participationModel": "<volunteer|unknown|paid>", "reason": "<1 phrase justification>"}`;

      const r = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_completion_tokens: 200,
      });
      aiSuggestion = JSON.parse((r.choices[0]?.message?.content || "{}").replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    } catch { /* scoring failed, still return profile */ }

    results.push({
      name: person.name,
      title: person.title || null,
      org: person.organization_name || null,
      linkedin: person.linkedin_url || null,
      email: person.email || null,
      aiSuggestion,
    });
  }

  return NextResponse.json(results);
}
