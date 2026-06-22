import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { getOpenAI, EOCON_CONTEXT } from "@/lib/openai";
import { searchOrganizations, searchPeople } from "@/lib/apollo";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await hasPermission("prospection", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { keywords, locations, employeeRange } = await req.json();

  const orgs = await searchOrganizations({
    q_organization_keyword_tags: keywords || ["cybersecurity", "technology", "finance"],
    organization_locations: locations || ["Cameroon", "Ivory Coast", "Senegal", "Nigeria"],
    organization_num_employees_ranges: employeeRange || ["51,200", "201,1000", "1001,10000"],
    per_page: 10,
  });

  const openai = getOpenAI();
  const results = [];

  for (const org of orgs) {
    // Find decision maker
    let contact = null;
    try {
      const people = await searchPeople({
        q_organization_name: org.name,
        person_titles: ["Chief Technology Officer", "Chief Information Security Officer", "Directeur Technique", "DSI", "CEO", "Directeur Marketing"],
        per_page: 1,
      });
      contact = people[0] || null;
    } catch { /* no contact found */ }

    // Score with OpenAI
    let aiScore = null;
    let aiScoreReason = null;
    let recommendedPackage = null;
    try {
      const scorePrompt = `${EOCON_CONTEXT}

Évalue le potentiel sponsor de cette entreprise pour EOCON 2026:
Nom: ${org.name}
Secteur: ${org.industry || "inconnu"}
Employés: ${org.estimated_num_employees || "inconnu"}
Description: ${org.short_description || "non disponible"}
Pays: ${org.country || "inconnu"}

Packages: PLATINUM, GOLD, SILVER, BRONZE

JSON uniquement: {"score": <0-10>, "reason": "<1 phrase>", "package": "<PLATINUM|GOLD|SILVER|BRONZE>"}`;

      const r = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [{ role: "user", content: scorePrompt }],
        temperature: 0.3,
        max_completion_tokens: 150,
      });
      const parsed = JSON.parse((r.choices[0]?.message?.content || "{}").replace(/```json?\n?/g, "").replace(/```/g, "").trim()) as { score?: number; reason?: string; package?: string };
      aiScore = parsed.score ?? null;
      aiScoreReason = parsed.reason ?? null;
      recommendedPackage = parsed.package ?? null;
    } catch { /* scoring failed */ }

    // Save to ProspectLead
    const lead = await prisma.prospectLead.create({
      data: {
        source: "apollo",
        org: org.name,
        sector: org.industry || null,
        city: org.city || null,
        website: org.website_url || null,
        contactName: contact?.name || null,
        contactTitle: contact?.title || null,
        contactEmail: contact?.email || null,
        contactLinkedin: contact?.linkedin_url || null,
        aiScore: aiScore !== null ? aiScore : undefined,
        aiScoreReason: aiScoreReason || null,
        recommendedPackage: recommendedPackage || null,
      },
    });
    results.push(lead);
  }

  return NextResponse.json(results);
}
