import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { getOpenAI, getEoconContext } from "@/lib/openai";
import { getNextSponsorDeadline } from "@/lib/sponsorBilling";

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

Tu es directeur partenariats pour EOCON — un mouvement, pas une conférence.

${sponsorAngles}

Prospect: ${org} (${sector || "secteur non précisé"})
Contact: ${contact || "le/la responsable"}, ${contactTitle || ""}
Package ciblé: ${pkg || "partenariat sponsor"}

Rédige un email de prospection personnalisé. Mentionne l'organisation par son nom. Choisis l'angle stratégique le plus pertinent pour leur secteur parmi les 4 ci-dessus. Ton professionnel mais chaleureux. 200 mots max.
${urgencyLine}
IMPÉRATIF : utilise exclusivement la 1ère personne du pluriel (Nous, We) — jamais Je, I, j', me.

JSON uniquement :
{
  "subjectFr": "<objet email français>",
  "bodyFr": "<corps email français>",
  "subjectEn": "<subject English>",
  "bodyEn": "<body English>"
}`;
  }

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_completion_tokens: 800,
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
