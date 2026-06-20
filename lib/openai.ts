import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY env var is required");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

export const EOCON_CONTEXT = `EOCON 2026 est la 7e édition de l'évènement cybersécurité organisé par l'association EyesOpen, le 28 novembre 2026 à l'Hotel Onomo de Douala, Cameroun. L'audience est composée de professionnels IT, responsables sécurité, développeurs et décideurs d'Afrique centrale et de l'Ouest. L'évènement accueille environ 500 participants. EOCON est un évènement complet (talks, ateliers, CTF, networking) et non une simple conférence : emploie le mot « évènement ».`;

export async function getEoconContext(): Promise<string> {
  try {
    const { getEventSettings } = await import("./settings");
    const s = await getEventSettings();
    return `EOCON ${new Date(s.event_date || "2026-11-28").getFullYear()} est la ${s.event_edition || "7"}e édition de l'évènement cybersécurité organisé par l'association EyesOpen, le ${s.event_date_display_fr || "28 novembre 2026"} à ${s.event_venue || "Hotel Onomo"} de ${s.event_city || "Douala"}, ${s.event_country || "Cameroun"}. L'audience est composée de professionnels IT, responsables sécurité, développeurs et décideurs d'Afrique centrale et de l'Ouest. L'évènement accueille environ 500 participants. EOCON est un évènement complet (talks, ateliers, CTF, networking) et non une simple conférence : emploie le mot « évènement ».`;
  } catch {
    return EOCON_CONTEXT;
  }
}
