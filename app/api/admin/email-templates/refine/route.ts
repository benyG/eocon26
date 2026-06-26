import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { getOpenAI } from "@/lib/openai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await hasPermission("communication", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { templateId, instructions } = await req.json() as { templateId: number; instructions?: string };

  const template = await prisma.emailTemplate.findUnique({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const prompt = `Tu es expert en communication événementielle pour des évènements tech. Tu dois améliorer ce template d'email pour EOCON 2026, 7ème édition de l'évènement cybersécurité de référence en Afrique centrale. EOCON est un évènement (et non une simple conférence) : emploie toujours le mot « évènement », jamais « conférence ».
Contexte EOCON :
EOCON 2026 est la 7e édition d'un événement cybersécurité majeur porté par EyesOpen Association. EOCON ne doit jamais être réduit à une simple conférence : c'est un rendez-vous stratégique, une plateforme d'écosystème et un mouvement qui rassemble talents, experts, entreprises, institutions, étudiants, décideurs et diaspora autour du futur de la cybersécurité en Afrique.
Évènement : EOCON 2026
Date : 23-28 novembre 2026
Format: Bilingue, francais et anglais
Lieu : Online et In-person (Douala, Cameroun)
Public : talents, professionnels, experts, entreprises, décideurs, chercheurs, institutions. 

Template actuel :
Nom : ${template.name}
Objet : ${template.subject}
Corps HTML :
${template.htmlBody}

${instructions ? `Instructions spécifiques : ${instructions}` : "Améliore le ton, rends le plus engageant et professionnel, garde les variables {{placeholder}}, conserve le HTML."}

Réponds en JSON :
{
  "subject": "nouveau sujet amélioré",
  "htmlBody": "corps HTML amélioré complet",
  "changes": "description courte des améliorations"
}`;

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const result = JSON.parse(completion.choices[0].message.content || "{}") as {
    subject: string;
    htmlBody: string;
    changes: string;
  };

  const updated = await prisma.emailTemplate.update({
    where: { id: templateId },
    data: { subject: result.subject, htmlBody: result.htmlBody },
  });

  return NextResponse.json({ ...updated, changes: result.changes });
}
