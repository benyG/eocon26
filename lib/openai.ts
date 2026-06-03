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

export const EOCON_CONTEXT = `EOCON 2026 est la 7e édition de la conférence cybersécurité organisée par l'association EyesOpen, le 28 novembre 2026 à l'Hotel Onomo de Douala, Cameroun. L'audience est composée de professionnels IT, responsables sécurité, développeurs et décideurs d'Afrique centrale et de l'Ouest. La conférence accueille environ 500 participants.`;
