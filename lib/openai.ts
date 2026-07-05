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
EOCON n'est pas une conférence cybersécurité. EOCON est le rendez-vous annuel où l'écosystème cyber mondial et particuliairement africain se retrouvent pour construire l'avenir de la cybersécurité.
Piliers stratégiques :
1. EOCON connecte communauté cyber internationale avec l'Afrique.
2. EOCON révèle et accélère la prochaine génération de talents cyber à travers ses conférences, ateliers et CTF.
3. EOCON est un mouvement qui contribue au développement de la souveraineté numérique africaine.
4. EOCON réunit décideurs, experts techniques, recruteurs, chercheurs, entrepreneurs et étudiants à fort potentiel.
5. Participer à EOCON — en présentiel à ${city} ou en ligne depuis plusieurs pays — c'est être là où se créent les opportunités, collaborations, carrières et business de demain dans la sécurité.
Audience : 1 000+ participants attendus, 15+ pays, professionnels IT, responsables sécurité, chercheurs, décideurs, membres de la diaspora africaine, étudiants à fort potentiel.
Format : conférences d'experts, ateliers techniques, panels stratégiques, EyesOpenCTF (48h, 40+ défis, 8 disciplines — ouvert aux équipes du monde entier).
Organisateur : Services examboot inc. 
Langue : Événement bilingue français/anglais.
Phrase de référence: "Where we secure the future."
Directives de ton : ambitieux, visionnaire, international, premium, inspirant. Ne jamais vendre uniquement des conférences ou des speakers — vendre l'accès à une communauté, à des opportunités et à un mouvement. Faire sentir que rater EOCON, c'est rater un moment important dans l'évolution de l'écosystème cyber mondial et africain en particulier.`;

function buildUrlBlock(s: Record<string, string>): string {
  const lines: string[] = [];
  if (s.url_inscription) lines.push(`  • Inscriptions : ${s.url_inscription}`);
  if (s.url_programme)   lines.push(`  • Programme    : ${s.url_programme}`);
  if (s.url_cfp)         lines.push(`  • CFP          : ${s.url_cfp}`);
  if (s.url_ctf)         lines.push(`  • CTF / EyesOpenCTF : ${s.url_ctf}`);
  if (s.url_sponsor)     lines.push(`  • Partenariat  : ${s.url_sponsor}`);
  if (s.site_base_url)   lines.push(`  • Site officiel : ${s.site_base_url}`);

  if (!lines.length) {
    return `\n⚠️ RÈGLE ABSOLUE SUR LES URLs : Aucun lien officiel n'est configuré pour cet événement. N'invente AUCUNE URL. Si un lien est nécessaire, écris [LIEN À COMPLÉTER] à la place.`;
  }

  return `\n🔗 URLS OFFICIELLES EOCON (les seules autorisées) :\n${lines.join("\n")}\n⚠️ RÈGLE ABSOLUE SUR LES URLs : N'utilise JAMAIS d'autres URLs que celles listées ci-dessus. N'invente AUCUNE URL — pas de eocon.org, pas de eyesopensecurity.com, ni aucun autre domaine. Si tu n'as pas l'URL appropriée dans la liste, écris [LIEN À COMPLÉTER] à la place.`;
}

export const EOCON_CONTEXT = EOCON_CONTEXT_BODY("7", "28 novembre 2026", "Hotel Onomo", "Douala", "Cameroun")
  + `\n⚠️ RÈGLE ABSOLUE SUR LES URLs : N'invente AUCUNE URL liée à l'événement EOCON. Si tu dois mentionner un lien (inscription, programme, CTF, etc.), écris [LIEN À COMPLÉTER] à la place.`;

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
    ) + buildUrlBlock(s);
  } catch {
    return EOCON_CONTEXT;
  }
}
