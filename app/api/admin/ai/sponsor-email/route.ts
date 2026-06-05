import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getOpenAI, EOCON_CONTEXT } from "@/lib/openai";

export const dynamic = "force-dynamic";

interface EmailResult {
  subjectFr: string;
  bodyFr: string;
  subjectEn: string;
  bodyEn: string;
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { org, contact, contactTitle, package: pkg, sector, status, lastContactDate, notes, mode } = await req.json();

  const openai = getOpenAI();

  let prompt = "";
  if (mode === "followup") {
    prompt = `${EOCON_CONTEXT}

Tu es directeur partenariats pour EOCON 2026.

Prospect: ${org} (${sector || "secteur non précisé"})
Contact: ${contact || "non précisé"}, ${contactTitle || ""}
Package ciblé: ${pkg || "à définir"}
Statut pipeline: ${status}
Dernier contact: ${lastContactDate || "non précisé"}
Notes: ${notes || "aucune"}

Rédige un email de relance adapté au statut "${status}". Ton professionnel mais chaleureux. 150 mots max.

JSON uniquement :
{
  "subjectFr": "<objet email français>",
  "bodyFr": "<corps email français>",
  "subjectEn": "<subject English>",
  "bodyEn": "<body English>"
}`;
  } else {
    prompt = `${EOCON_CONTEXT}

Tu es directeur partenariats pour EOCON 2026.

Prospect: ${org} (${sector || "secteur non précisé"})
Contact: ${contact || "le/la responsable"}, ${contactTitle || ""}
Package ciblé: ${pkg || "partenariat sponsor"}

Rédige un email de prospection personnalisé. Mentionne l'organisation par son nom. Adapte l'argumentaire au secteur. Ton professionnel mais chaleureux. 200 mots max.

JSON uniquement :
{
  "subjectFr": "<objet email français>",
  "bodyFr": "<corps email français>",
  "subjectEn": "<subject English>",
  "bodyEn": "<body English>"
}`;
  }

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_completion_tokens: 800,
  });

  const text = response.choices[0]?.message?.content || "{}";
  let result: EmailResult;
  try {
    result = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim()) as EmailResult;
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  return NextResponse.json(result);
}
