import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { getOpenAI, EOCON_CONTEXT } from "@/lib/openai";

export const dynamic = "force-dynamic";

async function scoreOne(id: number): Promise<void> {
  const lead = await prisma.prospectLead.findUnique({ where: { id } });
  if (!lead || lead.aiScore !== null) return; // already scored — skip

  const openai = getOpenAI();
  const prompt = `${EOCON_CONTEXT}

Évalue le potentiel sponsor de cette entreprise pour EOCON 2026:
Nom: ${lead.org}
Secteur: ${lead.sector || "inconnu"}
Ville: ${lead.city || "inconnue"}
Contact: ${lead.contactName || "inconnu"} (${lead.contactTitle || ""})
Site: ${lead.website || "inconnu"}

Packages disponibles: PLATINUM, GOLD, SILVER, BRONZE

JSON uniquement: {"score": <0-10>, "reason": "<1 phrase courte>", "package": "<PLATINUM|GOLD|SILVER|BRONZE>"}`;

  const r = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_completion_tokens: 150,
  });

  const text = r.choices[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim()) as { score?: number; reason?: string; package?: string };
    await prisma.prospectLead.update({
      where: { id },
      data: {
        aiScore: parsed.score ?? null,
        aiScoreReason: parsed.reason ?? null,
        recommendedPackage: parsed.package ?? null,
      },
    });
  } catch { /* ignore parse errors */ }
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("prospection", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { ids } = await req.json() as { ids: number[] };
  if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: "ids required" }, { status: 400 });
  if (ids.length > 10) return NextResponse.json({ error: "Max 10 leads par scoring" }, { status: 400 });

  for (const id of ids) {
    await scoreOne(id).catch(e => console.error(`[prospect-score] id=${id}`, e));
  }
  const updated = await prisma.prospectLead.findMany({ where: { id: { in: ids } } });
  return NextResponse.json({ scored: updated.length, leads: updated });
}
