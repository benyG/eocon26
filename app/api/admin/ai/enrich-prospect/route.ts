import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { getOpenAI, getEoconContext } from "@/lib/openai";
import { enrichOrganization } from "@/lib/apollo";
import { findProspectEmails } from "@/lib/findEmail";

export const dynamic = "force-dynamic";

interface EnrichResult {
  known: boolean;
  sector?: string;
  whySponsor?: string;
  recommendedPackage?: string;
  hook?: string;
  apolloData?: Record<string, unknown>;
  foundEmails?: { email: string; name?: string; title?: string; source: string; confidence?: number }[];
  savedEmail?: string;
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("prospection", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, org, website } = await req.json();
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

  const eoconCtx = await getEoconContext();
  const prompt = `${eoconCtx}

Packages disponibles: PLATINUM (visibilité maximale, stand, discours), GOLD (stand + logo), SILVER (logo + tickets), BRONZE (logo + tickets réduits).

Analyse ce prospect sponsor:
Entreprise: ${org}
Site: ${website || "non fourni"}
${apolloContext}

Si tu connais cette entreprise ou son secteur, explique pourquoi elle aurait intérêt à sponsoriser EOCON 2026. Adapte l'argumentaire à leur secteur en utilisant l'un de ces angles : (1) accès à des talents cyber africains et de la diaspora, (2) positionnement sur le marché africain de la cybersécurité, (3) visibilité internationale auprès de 15+ pays en présentiel et en ligne, (4) association à un mouvement "Where Africa secures the future". La phrase d'accroche doit être percutante, personnalisée au secteur, et ne jamais parler de "conférence" — parler de mouvement, de rendez-vous, d'écosystème.

JSON uniquement :
{
  "known": <true|false>,
  "sector": "<secteur d'activité>",
  "whySponsor": "<pourquoi sponsoriser EOCON, 2-3 raisons adaptées au secteur>",
  "recommendedPackage": "<PLATINUM|GOLD|SILVER|BRONZE>",
  "hook": "<phrase d'accroche percutante et personnalisée pour l'email de contact>"
}`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    max_completion_tokens: 500,
  });

  const text = response.choices[0]?.message?.content || "{}";
  let result: EnrichResult;
  try {
    result = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim()) as EnrichResult;
    if (apolloData) result.apolloData = apolloData as unknown as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  // Load the lead (if an id was passed) so we only fill empty fields.
  const lead = id ? await prisma.prospectLead.findUnique({ where: { id: Number(id) } }) : null;

  // Scrape the website for a contact email (Hunter.io + page scrape) and keep the best one.
  if (website && !lead?.contactEmail) {
    try {
      const emails = await findProspectEmails(website);
      if (emails.length) {
        result.foundEmails = emails;
        result.savedEmail = [...emails].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0].email;
      }
    } catch { /* scrape unavailable */ }
  }

  // Persist enrichment onto the lead — only fill fields that are still empty.
  if (lead) {
    const data: Record<string, unknown> = {};
    if (result.sector && !lead.sector) data.sector = result.sector;
    if (result.recommendedPackage && !lead.recommendedPackage) data.recommendedPackage = result.recommendedPackage;
    if (result.whySponsor && !lead.aiScoreReason) data.aiScoreReason = result.whySponsor;
    if (result.savedEmail && !lead.contactEmail) data.contactEmail = result.savedEmail;
    if (Object.keys(data).length) await prisma.prospectLead.update({ where: { id: lead.id }, data }).catch(() => {});
  }

  return NextResponse.json(result);
}
