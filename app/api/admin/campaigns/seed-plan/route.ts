import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

// Communication-plan email touchpoints, created as DRAFTS the team refines and
// sends when due. Names are prefixed "[Plan]" so the injection is idempotent.
// IMPORTANT: purely ADDITIVE — never sends, never deletes. Re-running only
// inserts the drafts that are missing (dedup by name).
type SeedCampaign = {
  name: string;
  audience: string;
  subject: string; subjectEn: string;
  body: string; bodyEn: string;
};

const p = (s: string) => `<p>${s}</p>`;

const PLAN_CAMPAIGNS: SeedCampaign[] = [
  {
    name: "[Plan] 12 juil — Appel à volontaires",
    audience: "newsletter",
    subject: "Rejoignez l'équipe EOCON 2026 — appel à volontaires",
    subjectEn: "Join the EOCON 2026 team — call for volunteers",
    body: p("L'appel à volontaires EOCON 2026 est ouvert. Aidez-nous à faire vivre la convention (support en ligne, logistique, accueil) et vivez l'événement de l'intérieur : expérience concrète, certificat, réseau.") + p("👉 Candidatez dès maintenant."),
    bodyEn: p("The EOCON 2026 call for volunteers is open. Help us run the convention (online support, logistics, welcome) and experience it from the inside: hands-on experience, certificate, networking.") + p("👉 Apply now."),
  },
  {
    name: "[Plan] 15 juil — Lancement EOCON 2026",
    audience: "newsletter",
    subject: "EOCON 2026 est lancé 🚀",
    subjectEn: "EOCON 2026 is live 🚀",
    body: p("La 7ᵉ édition d'EOCON — la convention de cybersécurité bilingue de référence en Afrique — se prépare. Rendez-vous le 28 novembre 2026 à Douala, et en ligne partout dans le monde.") + p("Call For Speakers ouvert, appel à formateurs de workshops, et bien plus à venir."),
    bodyEn: p("The 7th edition of EOCON — Africa's leading bilingual cybersecurity convention — is on. Join us on 28 November 2026 in Douala, and online worldwide.") + p("Call For Speakers open, workshop trainer call, and much more to come."),
  },
  {
    name: "[Plan] 15 sept — Ouverture des inscriptions",
    audience: "newsletter",
    subject: "Les inscriptions EOCON 2026 sont ouvertes",
    subjectEn: "EOCON 2026 registration is open",
    body: p("Ça y est : les inscriptions à EOCON 2026 sont ouvertes. Réservez votre place pour la convention, les workshops et la Compétition (CTF).") + p("👉 Inscrivez-vous maintenant."),
    bodyEn: p("It's here: registration for EOCON 2026 is open. Secure your seat for the convention, the workshops and the Competition (CTF).") + p("👉 Register now."),
  },
  {
    name: "[Plan] 7 nov — Relance J-14",
    audience: "newsletter",
    subject: "J-14 avant EOCON 2026 — réservez votre place",
    subjectEn: "14 days to EOCON 2026 — grab your seat",
    body: p("Plus que deux semaines avant EOCON 2026. Programme complet, têtes d'affiche confirmées, Compétition (CTF) prête. Ne manquez pas ça.") + p("👉 Inscrivez-vous avant qu'il ne soit trop tard."),
    bodyEn: p("Only two weeks left before EOCON 2026. Full programme, confirmed headliners, Competition (CTF) ready. Don't miss it.") + p("👉 Register before it's too late."),
  },
  {
    name: "[Plan] 21 nov — Relance J-7",
    audience: "newsletter",
    subject: "J-7 — dernière ligne droite pour EOCON 2026",
    subjectEn: "7 days — final stretch for EOCON 2026",
    body: p("Une semaine avant EOCON 2026. C'est le moment de confirmer votre présence — en présentiel à Douala ou en ligne.") + p("👉 Inscrivez-vous maintenant."),
    bodyEn: p("One week before EOCON 2026. Now is the time to confirm your spot — on-site in Douala or online.") + p("👉 Register now."),
  },
  {
    name: "[Plan] 22 nov — Accès semaine online",
    audience: "registrations",
    subject: "EOCON 2026 commence — votre accès en ligne",
    subjectEn: "EOCON 2026 begins — your online access",
    body: p("La semaine EOCON 2026 commence ! Voici tout ce qu'il faut pour suivre les sessions en ligne. Préparez votre agenda et rejoignez-nous.") + p("À très vite."),
    bodyEn: p("EOCON 2026 week is starting! Here's everything you need to follow the sessions online. Set your agenda and join us.") + p("See you very soon."),
  },
];

export async function POST(req: NextRequest) {
  if (!(await hasPermission("campaigns", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Idempotency: skip drafts whose name already exists. We never send or delete.
  const existing = await prisma.campaign.findMany({ select: { name: true } });
  const existingNames = new Set(existing.map((c) => c.name));

  const toCreate = PLAN_CAMPAIGNS.filter((c) => !existingNames.has(c.name));

  for (const c of toCreate) {
    await prisma.campaign.create({
      data: {
        name: c.name,
        subject: c.subject,
        subjectEn: c.subjectEn,
        htmlBody: c.body,
        htmlBodyEn: c.bodyEn,
        segment: JSON.stringify({ audience: c.audience }),
        status: "draft",
      },
    });
  }

  return NextResponse.json({ added: toCreate.length, skipped: PLAN_CAMPAIGNS.length - toCreate.length, total: PLAN_CAMPAIGNS.length });
}
