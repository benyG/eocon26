import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { searchPlaces, getPlaceDetails } from "@/lib/googleplaces";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const SECTOR_QUERIES: Record<string, string> = {
  hotel: "hôtel hébergement hotel",
  traiteur: "traiteur restauration catering",
  transport: "transport location véhicule autocar",
  impression: "imprimerie impression print",
  badges: "badges accréditeur signalétique",
  goodies: "goodies cadeaux publicitaires objets personnalisés",
};

export async function POST(req: NextRequest) {
  if (!(await hasPermission("logistics", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { sector, query, location } = await req.json() as { sector: string; query?: string; location?: string };
  if (!sector) return NextResponse.json({ error: "sector required" }, { status: 400 });

  const searchQuery = query || SECTOR_QUERIES[sector] || sector;
  const places = await searchPlaces(searchQuery, location || "Douala,Cameroun");

  const results = [];
  for (const place of places.slice(0, 15)) {
    let details = null;
    try { details = await getPlaceDetails(place.place_id); } catch { /* skip */ }

    const existing = await prisma.logisticsProspect.findUnique({
      where: { googlePlaceId: place.place_id },
    });

    results.push({
      place_id: place.place_id,
      name: place.name,
      address: details?.formatted_address || place.formatted_address,
      phone: details?.international_phone_number,
      website: details?.website,
      rating: details?.rating || place.rating,
      types: place.types,
      url: details?.url,
      alreadyAdded: !!existing,
      existingId: existing?.id ?? null,
    });
  }

  return NextResponse.json(results);
}
