import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { getOpenAI, getEoconContext } from "@/lib/openai";
import { getEventSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// Compute a display date N days before the event date string "YYYY-MM-DD"
function dateMinus(eventDate: string, days: number, locale: "fr" | "en"): string {
  const d = new Date(eventDate + "T12:00:00");
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
    day: "numeric", month: "long", year: "numeric",
  });
}

interface SectorRfpEntry {
  fr: { objet: string; besoin: string; details: string[]; contrepartie: string[] };
  en: { subject: string; need: string; details: string[]; counterpart: string[] };
}

function buildSectorRfp(
  dateFr: string, dateEn: string, city: string, venue: string,
  setupDayFr: string, setupDayEn: string,
  deadlineFr: string, deadlineEn: string,
  attendeesFr: string, attendeesEn: string,
): Record<string, SectorRfpEntry> {
  return {
    hotel: {
      fr: {
        objet: `Demande de proposition – Hébergement & Salle – EOCON 2026, ${city}`,
        besoin: `nous organisons EOCON 2026 le ${dateFr} à ${city} (format hybride, ${attendeesFr}) et sommes à la recherche d'un établissement adapté. Nous souhaiterions recevoir une proposition commerciale incluant`,
        details: [
          `*Espaces & disponibilité* : capacité de la salle principale en configuration théâtre ; disponibilité d'une ou deux salles annexes pour ateliers ; accès possible la veille (${setupDayFr}) pour montage et tests techniques`,
          "*Restauration* : formule journée complète (pause-café matin, cocktail déjeunatoire de clôture) ; tarif par personne en FCFA",
          "*Technique & logistique* : connexion Internet (débit et fiabilité) ; solution de secours Internet si disponible ; groupe électrogène en cas de délestage ; sonorisation, vidéoprojection, micros inclus ou non",
          "*Hébergement & transport* : tarifs préférentiels pour nuitées des intervenants et participants ; modalités de transfert aéroport-hôtel si disponible",
        ],
        contrepartie: [
          "logo sur tous nos supports de communication (site web, programme, réseaux sociaux)",
          "mention officielle pendant l’évènement",
          `visibilité comme partenaire logistique officiel d'EOCON 2026`,
        ],
      },
      en: {
        subject: `Request for Proposal – Venue & Accommodation – EOCON 2026, ${city}`,
        need: `we are organising EOCON 2026 on ${dateEn} in ${city} (hybrid format, ${attendeesEn}) and are looking for a suitable venue. We would like to receive a commercial proposal including`,
        details: [
          `*Spaces & availability*: main room capacity in theatre configuration; availability of one or two breakout rooms for workshops; access on ${setupDayEn} for setup and technical checks`,
          "*Catering*: full-day package (morning coffee break, closing lunch cocktail); per-person rate in FCFA",
          "*Technical & logistics*: Internet connection (speed and reliability); backup Internet if available; generator in case of power outage; PA system, video projection, microphones included or not",
          "*Accommodation & transport*: preferential rates for speaker and attendee accommodation; airport-hotel transfer options if available",
        ],
        counterpart: [
          "logo on all our communication materials (website, program, social media)",
          "official mention during the event",
          "visibility as official logistics partner of EOCON 2026",
        ],
      },
    },
    traiteur: {
      fr: {
        objet: `Demande de proposition – Restauration événementielle – EOCON 2026, ${city}`,
        besoin: `nous organisons EOCON 2026 le ${dateFr} à ${city} (${attendeesFr}) et recherchons un prestataire restauration. Nous souhaiterions recevoir une proposition commerciale incluant`,
        details: [
          "*Prestations souhaitées* : pause-café du matin (café, thé, viennoiseries) ; cocktail déjeunatoire de clôture ; eau et rafraîchissements en salle toute la journée",
          "*Tarification* : tarif par personne en FCFA pour chaque prestation ; conditions de paiement",
          "*Logistique* : possibilité de livraison et service sur site ; équipe de service incluse ou non ; matériel (tables, nappes, vaisselle) inclus ou non",
        ],
        contrepartie: [
          "mention comme traiteur officiel d'EOCON 2026 sur tous nos supports",
          "logo sur le programme et le site web",
          "annonce officielle pendant l'événement",
        ],
      },
      en: {
        subject: `Request for Proposal – Catering – EOCON 2026, ${city}`,
        need: `we are organising EOCON 2026 on ${dateEn} in ${city} (${attendeesEn}) and are looking for a catering provider. We would like to receive a commercial proposal including`,
        details: [
          "*Services required*: morning coffee break (coffee, tea, pastries); closing lunch cocktail; water and refreshments in the room throughout the day",
          "*Pricing*: per-person rate in FCFA for each service; payment terms",
          "*Logistics*: on-site delivery and service; service team included or not; equipment (tables, linen, tableware) included or not",
        ],
        counterpart: [
          "mention as official caterer of EOCON 2026 on all our materials",
          "logo on the program and website",
          "official announcement during the event",
        ],
      },
    },
    transport: {
      fr: {
        objet: `Demande de proposition – Transport & Navettes – EOCON 2026, ${city}`,
        besoin: `nous organisons EOCON 2026 le ${dateFr} à ${city} et recherchons un prestataire transport. Nous souhaiterions recevoir une proposition commerciale incluant`,
        details: [
          `*Prestations souhaitées* : transferts aéroport → hôtel → lieu de conférence (aller/retour) ; navettes inter-hôtels le jour J ; véhicules de courtoisie pour speakers et VIP`,
          "*Flotte disponible* : types et capacités de véhicules disponibles ; nombre maximum de véhicules mobilisables",
          "*Tarification* : tarif par trajet ou forfait journée en FCFA ; conditions de réservation et d'annulation",
        ],
        contrepartie: [
          "mention comme partenaire transport officiel d'EOCON 2026",
          "logo sur le programme et le site web",
          "visibilité sur les communications de l'événement",
        ],
      },
      en: {
        subject: `Request for Proposal – Transport & Shuttles – EOCON 2026, ${city}`,
        need: `we are organising EOCON 2026 on ${dateEn} in ${city} and are looking for a transport provider. We would like to receive a commercial proposal including`,
        details: [
          "*Services required*: airport → hotel → venue transfers (return); inter-hotel shuttles on the day; courtesy vehicles for speakers and VIPs",
          "*Available fleet*: vehicle types and capacities; maximum number of vehicles available",
          "*Pricing*: per-trip or full-day rate in FCFA; booking and cancellation terms",
        ],
        counterpart: [
          "mention as official transport partner of EOCON 2026",
          "logo on the program and website",
          "visibility in event communications",
        ],
      },
    },
    impression: {
      fr: {
        objet: `Demande de devis – Impression événementielle – EOCON 2026, ${city}`,
        besoin: `nous organisons EOCON 2026 le ${dateFr} à ${city} et avons besoin de supports imprimés. Nous souhaiterions recevoir un devis pour`,
        details: [
          "*Supports souhaités* : programmes (A5, 4 pages, ~200 exemplaires) ; affiches A1 et A3 ; roll-ups 80×200 cm (~5 unités) ; kakémonos et bâches de façade",
          `*Délais* : livraison impérative avant le ${deadlineFr}`,
          "*Tarification* : devis détaillé par format et quantité en FCFA ; délai de production",
        ],
        contrepartie: [
          "mention comme imprimeur officiel d'EOCON 2026",
          "logo sur le site web et le programme",
        ],
      },
      en: {
        subject: `Request for Quote – Event Printing – EOCON 2026, ${city}`,
        need: `we are organising EOCON 2026 on ${dateEn} in ${city} and need printed materials. We would like to receive a quote for`,
        details: [
          "*Materials needed*: programs (A5, 4 pages, ~200 copies); A1 and A3 posters; roll-ups 80×200 cm (~5 units); kakemonos and facade banners",
          `*Deadline*: delivery required before ${deadlineEn}`,
          "*Pricing*: detailed quote by format and quantity in FCFA; production lead time",
        ],
        counterpart: [
          "mention as official print partner of EOCON 2026",
          "logo on website and program",
        ],
      },
    },
    badges: {
      fr: {
        objet: `Demande de devis – Badges & Accréditations – EOCON 2026, ${city}`,
        besoin: `nous organisons EOCON 2026 le ${dateFr} à ${city} et recherchons un prestataire pour les badges et accréditations. Nous souhaiterions recevoir un devis pour`,
        details: [
          "*Prestations souhaitées* : impression de badges personnalisés (~250 unités, plusieurs catégories : participant, speaker, staff, VIP) ; lanyards sérigraphiés EOCON ; pochettes badge si disponibles",
          `*Délais* : livraison avant le ${deadlineFr}`,
          "*Tarification* : devis par catégorie et quantité en FCFA",
        ],
        contrepartie: [
          "mention comme prestataire accréditation officiel d'EOCON 2026",
          "logo sur le site web",
        ],
      },
      en: {
        subject: `Request for Quote – Badges & Accreditation – EOCON 2026, ${city}`,
        need: `we are organising EOCON 2026 on ${dateEn} in ${city} and are looking for a badge and accreditation provider. We would like to receive a quote for`,
        details: [
          "*Services needed*: custom badge printing (~250 units, multiple categories: attendee, speaker, staff, VIP); EOCON screen-printed lanyards; badge holders if available",
          `*Deadline*: delivery before ${deadlineEn}`,
          "*Pricing*: quote by category and quantity in FCFA",
        ],
        counterpart: [
          "mention as official accreditation provider for EOCON 2026",
          "logo on website",
        ],
      },
    },
    goodies: {
      fr: {
        objet: `Demande de devis – Goodies & Objets publicitaires – EOCON 2026, ${city}`,
        besoin: `nous organisons EOCON 2026 le ${dateFr} à ${city} et avons besoin de goodies brandés EOCON. Nous souhaiterions recevoir un devis pour`,
        details: [
          "*Articles souhaités* : tote bags (~200 unités) ; t-shirts (tailles variées, ~100 unités) ; stylos et carnets (~200 unités) ; clés USB 16 Go brandées (~50 unités)",
          "*Personnalisation* : impression logo EOCON 2026 + couleurs de la charte graphique",
          `*Délais* : livraison avant le ${deadlineFr}`,
          "*Tarification* : devis par article et quantité en FCFA ; possibilité de commande en plusieurs fois",
        ],
        contrepartie: [
          "mention comme fournisseur goodies officiel d'EOCON 2026",
          "logo sur le site web et programme",
        ],
      },
      en: {
        subject: `Request for Quote – Goodies & Promotional Items – EOCON 2026, ${city}`,
        need: `we are organising EOCON 2026 on ${dateEn} in ${city} and need branded EOCON goodies. We would like to receive a quote for`,
        details: [
          "*Items needed*: tote bags (~200 units); t-shirts (various sizes, ~100 units); pens and notebooks (~200 units); branded 16GB USB drives (~50 units)",
          "*Customisation*: EOCON 2026 logo + brand colours",
          `*Deadline*: delivery before ${deadlineEn}`,
          "*Pricing*: quote by item and quantity in FCFA; staged ordering if possible",
        ],
        counterpart: [
          "mention as official goodies provider for EOCON 2026",
          "logo on website and program",
        ],
      },
    },
  };
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("logistics", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { sector, name, contactName, contactTitle, address, website, phone } = await req.json() as {
    sector: string; name: string; contactName?: string; contactTitle?: string;
    address?: string; website?: string; phone?: string;
  };
  if (!sector || !name) return NextResponse.json({ error: "sector and name required" }, { status: 400 });

  const [s, eoconCtx] = await Promise.all([getEventSettings(), getEoconContext()]);

  const eventDate = s.event_date || "2026-11-28";
  const dateFr = s.event_date_display_fr || "28 novembre 2026";
  const dateEn = s.event_date_display_en || "November 28, 2026";
  const city = s.event_city || "Douala";
  const venue = s.event_venue || "Hotel Onomo";
  const attendeesFr = "100 à 200 participants en présentiel";
  const attendeesEn = "100–200 in-person attendees";
  const setupDayFr = dateMinus(eventDate, 1, "fr");
  const setupDayEn = dateMinus(eventDate, 1, "en");
  const deadlineFr = dateMinus(eventDate, 3, "fr");
  const deadlineEn = dateMinus(eventDate, 3, "en");

  const openai = getOpenAI();
  const SECTOR_RFP = buildSectorRfp(dateFr, dateEn, city, venue, setupDayFr, setupDayEn, deadlineFr, deadlineEn, attendeesFr, attendeesEn);
  const rfp = SECTOR_RFP[sector];

  const salutationFr = contactName
    ? `Madame/Monsieur ${contactName}${contactTitle ? ` (${contactTitle})` : ""}`
    : "Madame, Monsieur";
  const salutationEn = contactName
    ? `Dear ${contactName}${contactTitle ? ` (${contactTitle})` : ""}`
    : "Dear Sir/Madam";

  const detailsFr = rfp ? rfp.fr.details.map(d => `* ${d}`).join("\n") : "";
  const contrepartieFr = rfp ? rfp.fr.contrepartie.map(d => `* ${d}`).join("\n") : "";
  const detailsEn = rfp ? rfp.en.details.map(d => `* ${d}`).join("\n") : "";
  const contrepartieEn = rfp ? rfp.en.counterpart.map(d => `* ${d}`).join("\n") : "";

  const promptFr = `${eoconCtx}

Tu dois rédiger un courriel de prospection logistique EN FRANÇAIS pour EOCON 2026.

RÈGLES ABSOLUES :
- Utilise exclusivement la 1ère personne du pluriel (Nous, notre, nos) — jamais Je, j', me, mon, ma, mes.
- Style : direct, professionnel, appel d'offres — EOCON est l'acheteur qui compare des propositions.
- Ne pas vendre EOCON au prestataire. Aller droit au but : demander une proposition commerciale.
- Chiffres réalistes : ${attendeesFr}.
- Le lien officiel EOCON est : https://eyesopensecurity.com — l'inclure en fin de courriel.
- Signature : "Le Comité Organisateur / EOCON 2026 / Services ExamBoot Inc. / eocon@examboot.net"

Établissement cible : ${name}${address ? ` (${address})` : ""}
Salutation : ${salutationFr}

Structure OBLIGATOIRE du courriel :
1. Objet : ${rfp?.fr.objet || `Demande de proposition – ${sector} – EOCON 2026, ${city}`}
2. Introduction courte (2-3 phrases max) : qui nous sommes + contexte : ${rfp ? rfp.fr.besoin : `nous organisons EOCON 2026 le ${dateFr} à ${city} (${attendeesFr})`}.
3. Section détaillée de notre besoin avec les points suivants :
${detailsFr}
4. Paragraphe partenariat (optionnel, secondaire) : nous sommes ouverts à une formule de partenariat au-delà d'une prestation, incluant :
${contrepartieFr}
5. Appel à l'action : demander leur retour pour comparer les propositions.
6. Lien : 🎯 Site web de l'événement : https://eyesopensecurity.com
7. Signature.

Personnalise en mentionnant "${name}" naturellement dans le corps.`;

  const promptEn = `${eoconCtx}

Write a logistics prospecting email IN ENGLISH for EOCON 2026.

ABSOLUTE RULES:
- Use exclusively first person plural (We, our, us) — never I, me, my.
- Style: direct, professional, RFP (Request for Proposal) — EOCON is the buyer comparing offers.
- Do not pitch EOCON to the venue. Go straight to the point: request a commercial proposal.
- Realistic figures: ${attendeesEn}.
- Include the official EOCON link: https://eyesopensecurity.com at the end.
- Signature: "The Organising Committee / EOCON 2026 / Services ExamBoot Inc. / eocon@examboot.net"

Target: ${name}${address ? ` (${address})` : ""}
Salutation: ${salutationEn}

MANDATORY structure:
1. Subject: ${rfp?.en.subject || `Request for Proposal – ${sector} – EOCON 2026, ${city}`}
2. Short intro (2-3 sentences max): who we are + context: ${rfp ? rfp.en.need : `we are organising EOCON 2026 on ${dateEn} in ${city} (${attendeesEn})`}.
3. Detailed requirements section with the following points:
${detailsEn}
4. Partnership paragraph (optional, secondary): we are open to a partnership arrangement beyond a standard service, including:
${contrepartieEn}
5. Call to action: ask for their proposal so we can compare options.
6. Link: 🎯 Event website: https://eyesopensecurity.com
7. Signature.

Naturally mention "${name}" in the body.`;

  const [resFr, resEn] = await Promise.all([
    openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: promptFr }],
      temperature: 0.5,
      max_completion_tokens: 900,
    }),
    openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: promptEn }],
      temperature: 0.5,
      max_completion_tokens: 900,
    }),
  ]);

  return NextResponse.json({
    fr: resFr.choices[0]?.message?.content?.trim() ?? "",
    en: resEn.choices[0]?.message?.content?.trim() ?? "",
  });
}
