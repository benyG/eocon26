import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { getOpenAI, getEoconContext } from "@/lib/openai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await hasPermission("prospection-speakers", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name, title, org, topicMain, formatProposed, contactStatus, langPref, mode } = await req.json() as {
    name: string; title?: string; org?: string; topicMain?: string; formatProposed?: string;
    contactStatus?: string; langPref?: string; mode?: string;
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
  const topicLabel = topicMain ? (topicLabels[topicMain] || topicMain) : "Cybersécurité";

  const proBonoValue = `"EOCON est un événement communautaire et pro bono. Nous ne prévoyons pas de cachet. En contrepartie, vous bénéficiez d'une visibilité auprès de 1 000+ professionnels de la cybersécurité issus de 15+ pays, d'une diffusion en ligne mondiale, d'un enregistrement vidéo mis à disposition, et d'un ancrage fort dans l'écosystème africain de la cybersécurité."`;

  let prompt = "";
  if (mode === "followup") {
    prompt = `${eoconCtx}

Tu rédiges un email de relance d'invitation speaker pour EOCON 2026 (conférence pro bono).

Speaker: ${name}${title ? ` — ${title}` : ""}${org ? ` @ ${org}` : ""}
Expertise: ${topicLabel}
Format envisagé: ${formatProposed || "à définir"}
Statut actuel: ${contactStatus || "contacté sans réponse"}
Langue préférée: ${langPref === "en" ? "anglais" : "français"}

Rédige une relance courte (100 mots max), professionnelle et chaleureuse. Rappelle le cadre pro bono. Ne relance pas avec la valeur monétaire mais avec l'impact et l'écosystème.

JSON uniquement:
{
  "subjectFr": "<objet relance français>",
  "bodyFr": "<corps relance français>",
  "subjectEn": "<subject English>",
  "bodyEn": "<body English>"
}`;
  } else {
    prompt = `${eoconCtx}

Tu rédiges un email de première invitation speaker pour EOCON 2026.

Structure OBLIGATOIRE en 4 parties :
1. Qui nous sommes : 1 phrase — EOCON, 7e édition, Douala, bilingue FR/EN, hybride, 1 000+ participants, 15+ pays.
2. Pourquoi vous spécifiquement : mentionner leur expertise en ${topicLabel}${title ? ` et leur rôle de ${title}` : ""}. Personnalisé, pas générique.
3. Le cadre pro bono (mot pour mot) : ${proBonoValue}
4. Un seul CTA : "Seriez-vous disponible pour un échange de 20 minutes ?" — rien de plus.

Speaker: ${name}${title ? ` — ${title}` : ""}${org ? ` @ ${org}` : ""}
Format proposé: ${formatProposed || "talk 45 min"}
Langue: ${langPref === "en" ? "anglais" : "français (mais générer aussi en anglais)"}
Longueur: 200 mots max.

JSON uniquement:
{
  "subjectFr": "<objet email français>",
  "bodyFr": "<corps email français, structure 4 parties>",
  "subjectEn": "<subject English>",
  "bodyEn": "<body English, same 4-part structure>"
}`;
  }

  try {
    const r = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_completion_tokens: 900,
    });
    const text = r.choices[0]?.message?.content || "{}";
    const result = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
