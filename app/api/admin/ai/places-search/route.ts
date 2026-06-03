import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getOpenAI, EOCON_CONTEXT } from "@/lib/openai";
import { searchPlaces, getPlaceDetails } from "@/lib/googleplaces";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { query, location } = await req.json();
  if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  const places = await searchPlaces(query, location || "Douala,Cameroun");
  const openai = getOpenAI();
  const results = [];

  for (const place of places.slice(0, 8)) {
    let details = null;
    try {
      details = await getPlaceDetails(place.place_id);
    } catch { /* no details */ }

    const website = details?.website || null;
    const phone = details?.international_phone_number || null;

    // Score with OpenAI
    let aiScore = null;
    let aiScoreReason = null;
    let recommendedPackage = null;
    try {
      const scorePrompt = `${EOCON_CONTEXT}

Évalue le potentiel sponsor de cette entreprise locale pour EOCON 2026:
Nom: ${place.name}
Types: ${place.types?.join(", ") || "inconnu"}
Adresse: ${place.formatted_address || "Douala"}
Note Google: ${place.rating || "non notée"}
Site: ${website || "non disponible"}

Packages: PLATINUM, GOLD, SILVER, BRONZE

JSON uniquement: {"score": <0-10>, "reason": "<1 phrase>", "package": "<PLATINUM|GOLD|SILVER|BRONZE>", "sector": "<secteur déduit>"}`;

      const r = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [{ role: "user", content: scorePrompt }],
        temperature: 0.3,
        max_tokens: 150,
      });
      const parsed = JSON.parse((r.choices[0]?.message?.content || "{}").replace(/```json?\n?/g, "").replace(/```/g, "").trim()) as { score?: number; reason?: string; package?: string; sector?: string };
      aiScore = parsed.score ?? null;
      aiScoreReason = parsed.reason ?? null;
      recommendedPackage = parsed.package ?? null;
    } catch { /* scoring failed */ }

    const lead = await prisma.prospectLead.create({
      data: {
        source: "google_places",
        org: place.name,
        city: "Douala",
        website: website || null,
        phone: phone || null,
        aiScore: aiScore !== null ? aiScore : undefined,
        aiScoreReason: aiScoreReason || null,
        recommendedPackage: recommendedPackage || null,
      },
    });
    results.push(lead);
  }

  return NextResponse.json(results);
}
