const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";

function getKey(): string {
  const k = process.env.GOOGLE_PLACES_API_KEY;
  if (!k) throw new Error("GOOGLE_PLACES_API_KEY env var is not set");
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

// Google Places always returns HTTP 200 — actual errors are in data.status.
// We must check data.status, not just res.ok.
const OK_STATUSES = new Set(["OK", "ZERO_RESULTS"]);

export async function searchPlaces(query: string, location = "Douala,Cameroun"): Promise<PlaceResult[]> {
  const params = new URLSearchParams({
    query: `${query} ${location}`,
    key: getKey(),
    language: "fr",
  });
  const res = await fetch(`${PLACES_BASE}/textsearch/json?${params}`);
  if (!res.ok) throw new Error(`Google Places HTTP error: ${res.status}`);
  const data = await res.json() as { status: string; results?: PlaceResult[]; error_message?: string };
  if (!OK_STATUSES.has(data.status)) {
    throw new Error(`Google Places API error: ${data.status}${data.error_message ? ` — ${data.error_message}` : ""}`);
  }
  return (data.results || []).slice(0, 20);
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
  const data = await res.json() as { status: string; result?: PlaceResult };
  if (!OK_STATUSES.has(data.status)) return null;
  return data.result ?? null;
}
