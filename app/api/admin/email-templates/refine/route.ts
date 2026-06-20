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

Évènement : EOCON 2026
Date : 28 novembre 2026
Lieu : Hotel Onomo, Douala, Cameroun
Organisateur : EyesOpen Association
Thème : Cybersécurité & IA pour l'Afrique
Public : professionnels IT, développeurs, experts sécu, étudiants

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
