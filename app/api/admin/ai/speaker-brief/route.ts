import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { getOpenAI, getEoconContext } from "@/lib/openai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await hasPermission("prospection-speakers", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name, title, org, topicMain, formatProposed, linkedin, notes, p1, p3, p4 } = await req.json() as {
    name: string; title?: string; org?: string; topicMain?: string; formatProposed?: string;
    linkedin?: string; notes?: string; p1?: number; p3?: number; p4?: number;
  };
  if (!name) return NextResponse.json({ error: "name requis" }, { status: 400 });

  const openai = getOpenAI();
  const eoconCtx = await getEoconContext();

  const topicLabels: Record<string, string> = {
    "TOP-01": "Offensive Security & Red Teaming", "TOP-02": "Threat Intelligence & Hunting",
    "TOP-03": "Cloud & Infrastructure Security", "TOP-04": "AI in Cybersecurity",
    "TOP-05": "Digital Forensics & Incident Response", "TOP-06": "Application & API Security",
    "TOP-07": "OT / ICS / SCADA Security", "TOP-08": "Privacy & Data Protection",
    "TOP-09": "Governance, Risk & Compliance", "TOP-10": "Emerging Threats in Africa",
    "TOP-11": "Open Source Security Tools", "TOP-12": "Cybersecurity Awareness & Culture",
  };

  const prompt = `${eoconCtx}

Tu conseilles l'équipe EOCON avant un premier contact avec un speaker potentiel.

Speaker: ${name}${title ? ` — ${title}` : ""}${org ? ` @ ${org}` : ""}
Expertise: ${topicMain ? (topicLabels[topicMain] || topicMain) : "Cybersécurité"}
Format envisagé: ${formatProposed || "à définir"}
LinkedIn: ${linkedin || "non disponible"}
${notes ? `Notes équipe: ${notes}` : ""}
${p1 !== undefined ? `Score P1 (international): ${p1}/100` : ""}
${p3 !== undefined ? `Score P3 (africanité): ${p3}/100` : ""}
${p4 !== undefined ? `Score P4 (accessibilité pro bono): ${p4}/100` : ""}

Génère un brief concis pour l'équipe :
1. "accroche" : comment introduire EOCON à ce profil précis (1-2 phrases adaptées)
2. "valeur" : 3 bénéfices concrets pour CE speaker de participer (visibilité Afrique, réseau, communauté…)
3. "objection" : l'objection la plus probable + réponse préparée
4. "ouverture" : question intelligente pour démarrer l'échange
5. "aEviter" : ce qu'il ne faut SURTOUT PAS dire (ex: promettre des honoraires, minimiser l'Afrique, etc.)
6. "brief_complet" : texte fluide de 150 mots max, prêt à être lu 5 min avant le contact

IMPORTANT: Ne jamais promettre de rémunération. Toujours mentionner le cadre pro bono positivement.

JSON uniquement:
{
  "accroche": "...",
  "valeur": ["...", "...", "..."],
  "objection": { "question": "...", "reponse": "..." },
  "ouverture": "...",
  "aEviter": "...",
  "brief_complet": "..."
}`;

  try {
    const r = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_completion_tokens: 900,
      response_format: { type: "json_object" },
    });
    return NextResponse.json(JSON.parse(r.choices[0]?.message?.content || "{}"));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
