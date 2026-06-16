import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { getOpenAI, EOCON_CONTEXT } from "@/lib/openai";
import { enrichOrganization } from "@/lib/apollo";

export const dynamic = "force-dynamic";

interface EnrichResult {
  known: boolean;
  sector?: string;
  whySponsor?: string;
  recommendedPackage?: string;
  hook?: string;
  apolloData?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("prospection", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { org, website } = await req.json();
  if (!org) return NextResponse.json({ error: "Missing org" }, { status: 400 });

  // Try Apollo enrichment first if website provided
  let apolloData = null;
  if (website) {
    try {
      const domain = website.replace(/^https?:\/\//, "").replace(/\/$/, "").split("/")[0];
      apolloData = await enrichOrganization(domain);
    } catch {
      // Apollo not available, continue with OpenAI only
    }
  }

  const openai = getOpenAI();
  const apolloContext = apolloData
    ? `Données Apollo: secteur=${apolloData.industry}, employés=${apolloData.estimated_num_employees}, description=${apolloData.short_description}`
    : "";

  const prompt = `${EOCON_CONTEXT}

Packages disponibles: PLATINUM (visibilité maximale, stand, discours), GOLD (stand + logo), SILVER (logo + tickets), BRONZE (logo + tickets réduits).

Analyse ce prospect sponsor:
Entreprise: ${org}
Site: ${website || "non fourni"}
${apolloContext}

Si tu connais cette entreprise ou son secteur, explique pourquoi elle aurait intérêt à sponsoriser EOCON 2026 et quel package lui correspond.

JSON uniquement :
{
  "known": <true|false>,
  "sector": "<secteur d'activité>",
  "whySponsor": "<pourquoi sponsoriser EOCON, 2-3 raisons>",
  "recommendedPackage": "<PLATINUM|GOLD|SILVER|BRONZE>",
  "hook": "<phrase d'accroche pour l'email de contact>"
}`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    max_tokens: 500,
  });

  const text = response.choices[0]?.message?.content || "{}";
  let result: EnrichResult;
  try {
    result = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim()) as EnrichResult;
    if (apolloData) result.apolloData = apolloData as unknown as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  return NextResponse.json(result);
}
