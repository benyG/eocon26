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

const EOCON_CONTEXT_BODY = (edition: string, dateFr: string, venue: string, city: string, country: string) =>
`EOCON 2026 — ${edition}e édition | ${dateFr} | ${venue}, ${city}, ${country} | Format hybride (présentiel + en ligne)
EOCON n'est pas une conférence cybersécurité. EOCON est le rendez-vous annuel où l'Afrique, la diaspora et l'écosystème cyber mondial se retrouvent pour construire l'avenir de la cybersécurité.
Piliers stratégiques :
1. EOCON connecte l'Afrique, la diaspora africaine et la communauté cyber internationale.
2. EOCON révèle et accélère la prochaine génération de talents cyber à travers ses conférences, ateliers et CTF.
3. EOCON est un mouvement qui contribue au développement de la souveraineté numérique africaine.
4. EOCON réunit décideurs, experts techniques, recruteurs, chercheurs, entrepreneurs et étudiants à fort potentiel.
5. Participer à EOCON — en présentiel à ${city} ou en ligne depuis Paris, Montréal, Lagos ou Londres — c'est être là où se créent les opportunités, collaborations, carrières et business de demain dans la sécurité.
Audience : 1 000+ participants attendus, 15+ pays, professionnels IT, responsables sécurité, chercheurs, décideurs, membres de la diaspora africaine, étudiants à fort potentiel.
Format : conférences d'experts, ateliers techniques, panels stratégiques, EyesOpenCTF (48h, 40+ défis, 8 disciplines — ouvert aux équipes du monde entier).
Organisateur : Services examboot inc. Événement bilingue français/anglais.
Phrase de référence : "Where Africa secures the future."
Directives de ton : ambitieux, visionnaire, international, premium, inspirant. Ne jamais vendre uniquement des conférences ou des speakers — vendre l'accès à une communauté, à des opportunités et à un mouvement. Faire sentir que rater EOCON, c'est rater un moment important dans l'évolution de l'écosystème cyber africain et mondial.`;

export const EOCON_CONTEXT = EOCON_CONTEXT_BODY("7", "28 novembre 2026", "Hotel Onomo", "Douala", "Cameroun");

export async function getEoconContext(): Promise<string> {
  try {
    const { getEventSettings } = await import("./settings");
    const s = await getEventSettings();
    return EOCON_CONTEXT_BODY(
      s.event_edition || "7",
      s.event_date_display_fr || "28 novembre 2026",
      s.event_venue || "Hotel Onomo",
      s.event_city || "Douala",
      s.event_country || "Cameroun",
    );
  } catch {
    return EOCON_CONTEXT;
  }
}
