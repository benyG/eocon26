import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { getOpenAI, EOCON_CONTEXT } from "@/lib/openai";

export const dynamic = "force-dynamic";

const SECTOR_CONTEXT: Record<string, { fr: string; en: string }> = {
  hotel: {
    fr: `Nous cherchons un partenaire hébergement pour les speakers et VIP d'EOCON 2026 (conférence cybersécurité, ~500 participants, Douala). Nous offrons une visibilité partenaire (logo, mentions, stand).`,
    en: `We are looking for an accommodation partner for EOCON 2026 speakers and VIPs (cybersecurity conference, ~500 attendees, Douala). We offer partner visibility (logo, mentions, booth).`,
  },
  traiteur: {
    fr: `Nous cherchons un prestataire restauration/traiteur pour EOCON 2026 (conférence cybersécurité, ~500 participants, Douala) : pauses café, déjeuner VIP/speakers, cocktail de clôture. Nous offrons une visibilité partenaire.`,
    en: `We are looking for a catering provider for EOCON 2026 (cybersecurity conference, ~500 attendees, Douala): coffee breaks, VIP/speaker lunch, closing cocktail. We offer partner visibility.`,
  },
  transport: {
    fr: `Nous cherchons un partenaire transport/navette pour EOCON 2026 (conférence cybersécurité, Douala) : transferts aéroport, navettes inter-hôtels, déplacements speakers. Nous offrons une visibilité partenaire.`,
    en: `We are looking for a transport/shuttle partner for EOCON 2026 (cybersecurity conference, Douala): airport transfers, inter-hotel shuttles, speaker transport. We offer partner visibility.`,
  },
  impression: {
    fr: `Nous cherchons un partenaire imprimerie pour EOCON 2026 (conférence cybersécurité, ~500 participants, Douala) : programmes, affiches, roll-ups, kakémonos, bâches. Nous offrons une visibilité partenaire.`,
    en: `We are looking for a print partner for EOCON 2026 (cybersecurity conference, ~500 attendees, Douala): programs, posters, roll-ups, kakemonos, banners. We offer partner visibility.`,
  },
  badges: {
    fr: `Nous cherchons un partenaire badges/accréditations pour EON 2026 (conférence cybersécurité, ~500 participants, Douala) : impression et personnalisation de badges, lanyards, système d'accréditation. Nous offrons une visibilité partenaire.`,
    en: `We are looking for a badge/accreditation partner for EOCON 2026 (cybersecurity conference, ~500 attendees, Douala): badge printing and personalization, lanyards, accreditation system. We offer partner visibility.`,
  },
  goodies: {
    fr: `Nous cherchons un prestataire goodies/objets publicitaires pour EOCON 2026 (conférence cybersécurité, ~500 participants, Douala) : tote bags, t-shirts, stylos, clés USB, etc. brandés EOCON. Nous offrons une visibilité partenaire.`,
    en: `We are looking for a goodies/promotional items provider for EOCON 2026 (cybersecurity conference, ~500 attendees, Douala): tote bags, t-shirts, pens, USB keys, etc. branded EOCON. We offer partner visibility.`,
  },
};

const HOTEL_TEMPLATE_FR = `Objet : Partenariat Hébergement – EOCON 2026, Conférence Cybersécurité à Douala

Madame, Monsieur,

Nous avons l'honneur de vous contacter au nom du Comité Organisateur d'EOCON 2026, la Conférence Cybersécurité d'Afrique Centrale, qui se tiendra à Douala en 2026. Notre événement réunit chaque année plusieurs centaines de professionnels de la cybersécurité, d'entreprises technologiques et d'institutions publiques venus de toute l'Afrique et d'ailleurs.

Dans le cadre de la préparation de cette édition, nous recherchons un établissement hôtelier partenaire pour l'hébergement de nos speakers internationaux, VIP et participants.

Nous souhaiterions explorer la possibilité d'un partenariat qui pourrait inclure :
- Des tarifs préférentiels pour nos délégués et intervenants
- Une salle de réunion ou espace de travail pour l'équipe organisatrice
- La possibilité d'organiser un dîner de gala ou cocktail VIP dans vos locaux

En contrepartie, nous offrons à nos partenaires une visibilité significative :
- Mention sur tous nos supports de communication (site web, réseaux sociaux, programme)
- Espace dédié lors de l'événement
- Reconnaissance officielle comme partenaire logistique d'EOCON 2026

Nous serions ravis d'organiser une rencontre pour discuter des modalités d'un tel partenariat.

Dans l'attente de votre retour, nous restons à votre disposition pour tout renseignement complémentaire.

Bien cordialement,
L'Équipe EOCON 2026
Eyes Open Security
eocon@examboot.net`;

export async function POST(req: NextRequest) {
  if (!(await hasPermission("logistics", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { sector, name, contactName, contactTitle, address, website, phone } = await req.json() as {
    sector: string; name: string; contactName?: string; contactTitle?: string;
    address?: string; website?: string; phone?: string;
  };
  if (!sector || !name) return NextResponse.json({ error: "sector and name required" }, { status: 400 });

  const openai = getOpenAI();
  const ctx = SECTOR_CONTEXT[sector] || { fr: sector, en: sector };

  const salutation = contactName
    ? `Madame/Monsieur ${contactName}${contactTitle ? ` (${contactTitle})` : ""}`
    : "Madame, Monsieur";

  const baseTemplate = sector === "hotel" ? HOTEL_TEMPLATE_FR : null;

  const promptFr = `${EOCON_CONTEXT}

Tu dois rédiger un courriel de prospection logistique EN FRANÇAIS pour EOCON 2026.
IMPÉRATIF : utilise exclusivement la 1ère personne du pluriel (Nous, notre, nos) — jamais Je, j', me, mon, ma, mes.

Partenaire cible :
- Entreprise : ${name}
- Salutation : ${salutation}
- Secteur : ${ctx.fr}
- Adresse : ${address || "Douala"}
- Site web : ${website || "non disponible"}

${baseTemplate ? `Voici un modèle de base à adapter et personnaliser :\n\n${baseTemplate}` : `Rédige un courriel professionnel et chaleureux qui : explique brièvement EOCON 2026, décrit notre besoin en ${sector}, propose un partenariat avec visibilité, et invite à un échange.`}

Personnalise ce courriel pour "${name}". Rends-le naturel et professionnel. Inclus un objet sur la première ligne sous le format "Objet : ...".`;

  const promptEn = `${EOCON_CONTEXT}

Write a logistics prospecting email IN ENGLISH for EOCON 2026.
IMPERATIVE: use exclusively first person plural (We, our, us) — never I, me, my.

Target partner:
- Company: ${name}
- Salutation: ${contactName ? `Dear ${contactName}${contactTitle ? ` (${contactTitle})` : ""}` : "Dear Sir/Madam"}
- Sector: ${ctx.en}
- Address: ${address || "Douala"}
- Website: ${website || "not available"}

Write a professional and warm email that: briefly explains EOCON 2026, describes our need for ${sector} services, proposes a partnership with visibility benefits, and invites a discussion. Include a subject line on the first line as "Subject: ...".`;

  const [resFr, resEn] = await Promise.all([
    openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: promptFr }],
      temperature: 0.6,
      max_completion_tokens: 600,
    }),
    openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: promptEn }],
      temperature: 0.6,
      max_completion_tokens: 600,
    }),
  ]);

  return NextResponse.json({
    fr: resFr.choices[0]?.message?.content?.trim() ?? "",
    en: resEn.choices[0]?.message?.content?.trim() ?? "",
  });
}
