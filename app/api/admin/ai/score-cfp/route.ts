import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getOpenAI, EOCON_CONTEXT } from "@/lib/openai";

export const dynamic = "force-dynamic";

interface CFPScore {
  relevance: number;
  technical: number;
  quality: number;
  originality: number;
  global: number;
  summary: string;
  recommendation: "accept" | "review" | "reject";
}

async function scoreOne(id: number): Promise<void> {
  const submission = await prisma.cFPSubmission.findUnique({ where: { id } });
  if (!submission) return;

  const openai = getOpenAI();
  const prompt = `${EOCON_CONTEXT}

Évalue cette soumission CFP pour EOCON 2026 :

Nom: ${submission.name}
Titre: ${submission.talkTitle}
Format: ${submission.format || "non précisé"}
Abstract: ${submission.abstract}
Bio: ${submission.bio || "non fournie"}

Donne ton évaluation en JSON uniquement, sans markdown :
{
  "relevance": <0-10, pertinence cybersécurité/Afrique>,
  "technical": <0-10, niveau technique>,
  "quality": <0-10, qualité de l'abstract>,
  "originality": <0-10, originalité du sujet>,
  "global": <moyenne pondérée>,
  "summary": "<2 phrases pour le comité>",
  "recommendation": "<accept|review|reject>"
}`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_completion_tokens: 400,
  });

  const text = response.choices[0]?.message?.content || "{}";
  let score: CFPScore;
  try {
    score = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim()) as CFPScore;
  } catch {
    return;
  }

  await prisma.cFPSubmission.update({
    where: { id },
    data: {
      aiScore: score.global,
      aiAnalysis: JSON.stringify(score),
    },
  });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, scoreAll } = await req.json();

  if (scoreAll) {
    const submissions = await prisma.cFPSubmission.findMany({ where: { aiScore: null } });
    for (const s of submissions) {
      await scoreOne(s.id).catch(e => console.error(`[AI CFP score] id=${s.id}`, e));
    }
    return NextResponse.json({ scored: submissions.length });
  }

  if (id) {
    await scoreOne(id);
    const updated = await prisma.cFPSubmission.findUnique({ where: { id } });
    return NextResponse.json({ aiScore: updated?.aiScore, aiAnalysis: updated?.aiAnalysis });
  }

  return NextResponse.json({ error: "Missing id or scoreAll" }, { status: 400 });
}
