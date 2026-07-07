import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { getOpenAI, getEoconContext } from "@/lib/openai";
import { getNextSponsorDeadline, getSponsorDeadlines, getBillingEntity } from "@/lib/sponsorBilling";
import { getEventContext } from "@/lib/eventContext";

export const dynamic = "force-dynamic";

interface EmailResult {
  subjectFr: string;
  bodyFr: string;
  subjectEn: string;
  bodyEn: string;
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("prospection", "write"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { org, contact, contactTitle, package: pkg, sector, status, lastContactDate, notes, mode } = await req.json();

  const openai = getOpenAI();

  const eoconCtx = await getEoconContext();

  // #3 — dynamic urgency: fold the nearest commitment deadline into the pitch.
  const deadline = await getNextSponsorDeadline();
  const urgencyLine = deadline
    ? `Urgence à intégrer subtilement (sans pression excessive) : il reste ${deadline.daysLeft} jour(s) avant la deadline « ${deadline.labelFr} » (${deadline.date.toLocaleDateString("fr-FR")}). Les sponsors confirmés tôt bénéficient d'une visibilité dès la phase de pré-annonce.`
    : "";

  // Factual context (DB source of truth) for the first-contact email.
  const [entity, evt, deadlines] = await Promise.all([getBillingEntity(), getEventContext(), getSponsorDeadlines()]);
  const printDeadline = deadlines.find(d => d.key === "print");
  const printDeadlineFr = printDeadline ? printDeadline.date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "31 octobre 2026";
  const printDeadlineEn = printDeadline ? printDeadline.date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "October 31, 2026";

  let prompt = "";
  const sponsorAngles = `Angles stratégiques pour convaincre un sponsor :
1. Accès à un vivier de talents : 1 000+ participants, ingénieurs, chercheurs, étudiants à fort potentiel — pour recruter ou faire rayonner votre marque employeur dans l'écosystème cyber africain.
2. Positionnement sur un marché d'avenir : l'Afrique représente la prochaine vague de croissance en cybersécurité. Être présent à EOCON, c'est s'implanter dès maintenant dans cet écosystème.
3. Visibilité internationale et diaspora : 15+ pays représentés, audience en ligne mondiale (Paris, Montréal, Lagos, Londres). Portée bien au-delà de l'Afrique.
4. Image de marque alignée à un mouvement : EOCON n'est pas une conférence — c'est un mouvement. Associer votre marque à "Where Africa secures the future" envoie un signal fort à vos clients, talents et partenaires.`;

  if (mode === "teaser") {
    prompt = `${eoconCtx}

Tu es directeur partenariats pour EOCON — un mouvement, pas une conférence.

${sponsorAngles}

Prospect: ${org} (${sector || "secteur non précisé"})
Contact: ${contact || "le/la responsable"}, ${contactTitle || ""}

Rédige un TEASER TRÈS COURT de premier contact, pour WhatsApp ou LinkedIn (pas un email formel). Objectif : accrocher en 3-4 phrases max (60 mots max) et obtenir la permission d'envoyer le dossier ou décrocher un échange de 15 min. Ton direct, humain, professionnel. Pas de formule d'ouverture longue ni de signature. Termine par une question simple (« Puis-je vous envoyer le dossier ? »).
${urgencyLine}
IMPÉRATIF : 1ère personne du pluriel (Nous, We) — jamais Je, I.

JSON uniquement :
{
  "subjectFr": "<accroche courte française (1 ligne)>",
  "bodyFr": "<message court français>",
  "subjectEn": "<short hook English (1 line)>",
  "bodyEn": "<short message English>"
}`;
  } else if (mode === "followup") {
    prompt = `${eoconCtx}

Tu es directeur partenariats pour EOCON — un mouvement, pas une conférence.

${sponsorAngles}

Prospect: ${org} (${sector || "secteur non précisé"})
Contact: ${contact || "non précisé"}, ${contactTitle || ""}
Package ciblé: ${pkg || "à définir"}
Statut pipeline: ${status}
Dernier contact: ${lastContactDate || "non précisé"}
Notes: ${notes || "aucune"}

Rédige un email de relance adapté au statut "${status}". Utilise un des angles stratégiques ci-dessus adapté au secteur. Ton professionnel mais chaleureux. 150 mots max.
${urgencyLine}
IMPÉRATIF : utilise exclusivement la 1ère personne du pluriel (Nous, We) — jamais Je, I, j', me.

JSON uniquement :
{
  "subjectFr": "<objet email français>",
  "bodyFr": "<corps email français>",
  "subjectEn": "<subject English>",
  "bodyEn": "<body English>"
}`;
  } else {
    prompt = `${eoconCtx}

Tu es l'équipe Partenariats d'EOCON, écrivant au nom de ${entity.legalName}, organisateur d'EOCON 2026.

Rédige un email de PREMIER CONTACT à un sponsor potentiel, en suivant EXACTEMENT la structure, le ton, l'ordre des paragraphes et la longueur du MODÈLE DE RÉFÉRENCE ci-dessous. Personnalise uniquement le nom de l'organisation et le paragraphe des « leviers concrets » selon son secteur ; garde toutes les autres informations factuelles identiques.

Organisation cible : ${org} (secteur : ${sector || "non précisé"})
Contact : ${contact || "—"}${contactTitle ? ` (${contactTitle})` : ""}

Informations factuelles à utiliser telles quelles (NE RIEN INVENTER) :
- Organisateur : ${entity.legalName}
- Événement : EOCON 2026, ${evt.edition}e édition de l’évènement bilingue international de cybersécurité
- Date et lieu : ${evt.dateFr} à ${evt.venue}, format hybride (en ligne et en présentiel)
- Audience : plus de 1 000 participants combinés en ligne et en présentiel issus de 15+ pays (professionnels IT, ingénieurs, chercheurs, étudiants à fort potentiel, décideurs, entrepreneurs, acteurs institutionnels)
- Promesse : "Where Africa secures the future."
- Deadline (FR) : ${printDeadlineFr} — (EN) : ${printDeadlineEn}
- Site web officiel : https://eyesopensecurity.com

MODÈLE DE RÉFÉRENCE (à adapter, ne pas copier les crochets) :
"""
Bonjour[ {Prénom/Nom du contact} si connu],

Nous vous contactons au nom de ${entity.legalName}, organisateur d'EOCON 2026 — ${evt.edition}e édition de l’évènement international de cybersécurité, prévue le ${evt.dateFr} à ${evt.venue}, en format hybride.

Pour {Organisation}, EOCON représente une opportunité stratégique de renforcer votre présence auprès d'un écosystème cyber en pleine structuration, tout en vous donnant accès à un vivier qualifié de talents africains.

L'événement réunit plus de 1 000 participants issus de 15+ pays : professionnels IT, ingénieurs, chercheurs, étudiants à fort potentiel, décideurs, entrepreneurs et acteurs institutionnels. Pour {un acteur de ce secteur}, ce positionnement offre plusieurs leviers concrets : {2 à 4 leviers adaptés au secteur — ex. marque employeur, identification de profils cyber, visibilité auprès d'une audience technique, rapprochement avec les acteurs clés de la transformation numérique}.

Au-delà d'un simple rendez-vous ponctuel, EOCON est un mouvement international porté par une promesse forte : "Where Africa secures the future."

Nous serions heureux d'explorer avec vous une formule de partenariat adaptée à vos objectifs, notamment en matière de visibilité, recrutement, innovation, cybersécurité et engagement institutionnel.

À noter : les sponsors confirmés avant le ${printDeadlineFr} pourront bénéficier d'une inclusion dans certains supports imprimés et éléments de branding associés à la compétition de cybersécurité organisée pendant l’évènement.

Seriez-vous disponible pour un échange de 15 minutes afin d'évaluer les pistes de collaboration possibles ?

Bien cordialement,

L'équipe Partenariats EOCON
${entity.legalName}
"""

Produis la version française (fidèle au modèle) ET une version anglaise équivalente (même structure, deadline ${printDeadlineEn}, signature "The EOCON Partnerships Team / ${entity.legalName}").
IMPÉRATIF : 1ère personne du pluriel (Nous, We) — jamais Je, I.

JSON uniquement :
{
  "subjectFr": "<objet, ex: EOCON 2026 — Opportunité de partenariat pour ${org}>",
  "bodyFr": "<corps email français>",
  "subjectEn": "<subject, e.g. EOCON 2026 — Partnership opportunity for ${org}>",
  "bodyEn": "<body English>"
}`;
  }

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_completion_tokens: mode === "teaser" ? 500 : 1600,
  });

  const text = response.choices[0]?.message?.content || "{}";
  let result: EmailResult;
  try {
    result = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim()) as EmailResult;
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  return NextResponse.json(result);
}
