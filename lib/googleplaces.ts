const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";

function getKey(): string {
  const k = process.env.GOOGLE_PLACES_API_KEY;
  if (!k) throw new Error("GOOGLE_PLACES_API_KEY env var is required");
  return k;
}

export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  international_phone_number?: string;
  website?: string;
  rating?: number;
  types?: string[];
  url?: string;
}

export async function searchPlaces(query: string, location = "Douala,Cameroun"): Promise<PlaceResult[]> {
  const params = new URLSearchParams({
    query: `${query} ${location}`,
    key: getKey(),
    language: "fr",
  });
  const res = await fetch(`${PLACES_BASE}/textsearch/json?${params}`);
  if (!res.ok) throw new Error(`Google Places API error: ${res.status}`);
  const data = await res.json();
  return (data.results || []).slice(0, 10) as PlaceResult[];
}

export async function getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: "name,formatted_address,international_phone_number,website,rating,types,url",
    key: getKey(),
    language: "fr",
  });
  const res = await fetch(`${PLACES_BASE}/details/json?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  return (data.result || null) as PlaceResult | null;
}
