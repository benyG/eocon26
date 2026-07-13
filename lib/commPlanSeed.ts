// Shared source data for the unified editorial calendar (CommPlanItem).
// Server-only — deliberately self-contained (small duplication of the priority-1
// subset of StrategicPlanPanel's channel list) rather than importing a "use
// client" component file into API routes.

export type PlanEmailItem = {
  title: string;
  date: string; // ISO day
  axis: string;
  segment: string; // ready-to-store JSON string matching CampaignSegment (lib/campaignRecipients.ts)
  subjectFr: string; subjectEn: string;
  bodyFr: string; bodyEn: string;
};

const p = (s: string) => `<p>${s}</p>`;
const seg = (obj: Record<string, unknown>) => JSON.stringify(obj);

// Every dated BROADCAST email touchpoint of the communication plan (11 Jul →
// 15 Dec) — i.e. a campaign sent to a whole segment on a given date. This is
// deliberately distinct from the transactional template library
// (EmailTemplate / "Modèles" tab — Speaker onboarding, CTF access, etc.),
// which fires per-record on a status change, not on a calendar date.
//
// Sponsors and workshop trainers are NOT targeted here: there is no bulk
// "sponsors" or "trainers" audience in the segment system (lib/campaignRecipients
// only supports registrations/newsletter/cfp_*/volunteers) — sponsor comms are
// 1:1 through the sponsor pipeline's AI email tool, and workshop trainers are
// reached via the social "opportunity" axis + the Call For Speakers-style
// public entry point, not a mailing list that doesn't exist yet.
export const PLAN_EMAIL_ITEMS: PlanEmailItem[] = [
  {
    title: "Lancement EOCON 2026", date: "2026-07-15", axis: "custom", segment: seg({ audience: "newsletter" }),
    subjectFr: "EOCON 2026 est lancé 🚀", subjectEn: "EOCON 2026 is live 🚀",
    bodyFr: p("La 7ᵉ édition d'EOCON — la convention de cybersécurité bilingue de référence en Afrique — se prépare. Rendez-vous le 28 novembre 2026 à Douala, et en ligne partout dans le monde.") + p("Call For Speakers ouvert, appel à formateurs de workshops, et bien plus à venir."),
    bodyEn: p("The 7th edition of EOCON — Africa's leading bilingual cybersecurity convention — is on. Join us on 28 November 2026 in Douala, and online worldwide.") + p("Call For Speakers open, workshop trainer call, and much more to come."),
  },
  {
    title: "Appel à volontaires", date: "2026-07-12", axis: "volunteer", segment: seg({ audience: "newsletter" }),
    subjectFr: "Rejoignez l'équipe EOCON 2026 — appel à volontaires", subjectEn: "Join the EOCON 2026 team — call for volunteers",
    bodyFr: p("L'appel à volontaires EOCON 2026 est ouvert. Aidez-nous à faire vivre la convention (support en ligne, logistique, accueil) et vivez l'événement de l'intérieur : expérience concrète, certificat, réseau.") + p("👉 Candidatez dès maintenant."),
    bodyEn: p("The EOCON 2026 call for volunteers is open. Help us run the convention (online support, logistics, welcome) and experience it from the inside: hands-on experience, certificate, networking.") + p("👉 Apply now."),
  },
  {
    title: "Séquence de bienvenue automatisée", date: "2026-07-15", axis: "custom", segment: seg({ audience: "newsletter" }),
    subjectFr: "Bienvenue dans l'écosystème EOCON 2026", subjectEn: "Welcome to the EOCON 2026 ecosystem",
    bodyFr: p("Merci de nous suivre. Vous recevrez ici les grandes étapes d'EOCON 2026 : programme, speakers, Compétition (CTF), inscriptions.") + p("On se retrouve très vite avec les premières annonces."),
    bodyEn: p("Thanks for following along. You'll receive the key EOCON 2026 milestones here: programme, speakers, Competition (CTF), registration.") + p("See you soon with the first announcements."),
  },
  {
    title: "Sponsor confirmé — annonce", date: "2026-08-31", axis: "sponsor", segment: seg({ audience: "newsletter" }),
    subjectFr: "EOCON 2026 accueille un nouveau partenaire", subjectEn: "EOCON 2026 welcomes a new partner",
    bodyFr: p("Nous sommes ravis d'annoncer un nouveau partenariat pour EOCON 2026 — un signal fort de confiance dans la convention de référence de la cybersécurité en Afrique."),
    bodyEn: p("We're thrilled to announce a new partnership for EOCON 2026 — a strong signal of trust in Africa's leading cybersecurity convention."),
  },
  // ── Speakers — broadcast to confirmed/scheduled speakers (complements the
  // per-speaker transactional "Onboarding" / "Programmé" templates) ──
  {
    title: "Brief technique — speakers confirmés", date: "2026-09-20", axis: "speaker", segment: seg({ audience: "cfp_scheduled" }),
    subjectFr: "EOCON 2026 — brief technique pour votre présentation", subjectEn: "EOCON 2026 — technical brief for your talk",
    bodyFr: p("Merci de faire partie du programme EOCON 2026. Vous trouverez ci-joint le brief technique : format, durée, contraintes AV, deadline de soumission de votre présentation.") + p("N'hésitez pas à nous écrire pour toute question."),
    bodyEn: p("Thank you for joining the EOCON 2026 programme. Please find attached the technical brief: format, duration, AV constraints, and the deadline to submit your slides.") + p("Feel free to reach out with any question."),
  },
  {
    title: "Ouverture des inscriptions", date: "2026-09-15", axis: "inscriptions", segment: seg({ audience: "newsletter" }),
    subjectFr: "Les inscriptions EOCON 2026 sont ouvertes", subjectEn: "EOCON 2026 registration is open",
    bodyFr: p("Ça y est : les inscriptions à EOCON 2026 sont ouvertes. Réservez votre place pour la convention, les workshops et la Compétition (CTF).") + p("👉 Inscrivez-vous maintenant."),
    bodyEn: p("It's here: registration for EOCON 2026 is open. Secure your seat for the convention, the workshops and the Competition (CTF).") + p("👉 Register now."),
  },
  // ── Volunteers — confirmation & deployment broadcasts (complements the
  // "Appel à volontaires" call and the transactional acceptance flow) ──
  {
    title: "Lettre de mission — bénévoles confirmés", date: "2026-09-15", axis: "volunteer", segment: seg({ audience: "volunteers" }),
    subjectFr: "Votre lettre de mission EOCON 2026", subjectEn: "Your EOCON 2026 mission letter",
    bodyFr: p("Merci de rejoindre l'équipe bénévole EOCON 2026 ! Vous trouverez ci-joint votre lettre de mission : rôle, responsable, avantages.") + p("Une session de formation générale suivra prochainement."),
    bodyEn: p("Thank you for joining the EOCON 2026 volunteer team! Please find attached your mission letter: role, manager, benefits.") + p("A general training session will follow soon."),
  },
  {
    title: "Relance intérêt non converti", date: "2026-09-30", axis: "inscriptions", segment: seg({ audience: "newsletter" }),
    subjectFr: "Vous n'êtes pas encore inscrit à EOCON 2026 ?", subjectEn: "Not registered for EOCON 2026 yet?",
    bodyFr: p("Le programme se remplit vite. Ne manquez pas votre place pour la convention de cybersécurité de référence en Afrique.") + p("👉 Finalisez votre inscription."),
    bodyEn: p("The programme is filling up fast. Don't miss your seat at Africa's leading cybersecurity convention.") + p("👉 Complete your registration."),
  },
  {
    title: "Rappel deadline soumission présentations", date: "2026-10-08", axis: "speaker", segment: seg({ audience: "cfp_scheduled" }),
    subjectFr: "Rappel — deadline de soumission de votre présentation", subjectEn: "Reminder — your slides submission deadline",
    bodyFr: p("Dernier rappel : la deadline de soumission des présentations est le 15 octobre. Merci de nous faire parvenir votre support avant cette date."),
    bodyEn: p("Final reminder: the deadline to submit your slides is 15 October. Please send us your deck before that date."),
  },
  {
    title: "Programme complet dévoilé", date: "2026-10-14", axis: "session", segment: seg({ audience: "newsletter" }),
    subjectFr: "Le programme complet d'EOCON 2026 est en ligne", subjectEn: "The full EOCON 2026 programme is live",
    bodyFr: p("Talks, panels, workshops, Compétition (CTF) — le programme complet d'EOCON 2026 est désormais disponible.") + p("👉 Découvrez le programme."),
    bodyEn: p("Talks, panels, workshops, Competition (CTF) — the full EOCON 2026 programme is now available.") + p("👉 Explore the programme."),
  },
  {
    title: "Relance J-14", date: "2026-11-14", axis: "inscriptions", segment: seg({ audience: "newsletter" }),
    subjectFr: "J-14 avant EOCON 2026 — réservez votre place", subjectEn: "14 days to EOCON 2026 — grab your seat",
    bodyFr: p("Plus que deux semaines avant EOCON 2026. Programme complet, têtes d'affiche confirmées, Compétition (CTF) prête. Ne manquez pas ça.") + p("👉 Inscrivez-vous avant qu'il ne soit trop tard."),
    bodyEn: p("Only two weeks left before EOCON 2026. Full programme, confirmed headliners, Competition (CTF) ready. Don't miss it.") + p("👉 Register before it's too late."),
  },
  // ── Competition (CTF) — targeted at registrants who signed up as
  // competitors (hasCtf), distinct from the generic conversion relance ──
  {
    title: "Infos pratiques — Compétition (CTF)", date: "2026-11-14", axis: "ctf", segment: seg({ audience: "registrations", hasCtf: true }),
    subjectFr: "EOCON 2026 — infos pratiques Compétition (CTF)", subjectEn: "EOCON 2026 — Competition (CTF) practical info",
    bodyFr: p("Vous êtes inscrit·e à la Compétition (CTF) EOCON 2026. Voici les infos pratiques : règlement, catégories, calendrier des défis. Vos accès CTFd suivront séparément.") + p("Bonne préparation !"),
    bodyEn: p("You're registered for the EOCON 2026 Competition (CTF). Here's the practical info: rules, categories, challenge schedule. Your CTFd access will follow separately.") + p("Good luck preparing!"),
  },
  {
    title: "Relance J-7", date: "2026-11-21", axis: "inscriptions", segment: seg({ audience: "newsletter" }),
    subjectFr: "J-7 — dernière ligne droite pour EOCON 2026", subjectEn: "7 days — final stretch for EOCON 2026",
    bodyFr: p("Une semaine avant EOCON 2026. C'est le moment de confirmer votre présence — en présentiel à Douala ou en ligne.") + p("👉 Inscrivez-vous maintenant."),
    bodyEn: p("One week before EOCON 2026. Now is the time to confirm your spot — on-site in Douala or online.") + p("👉 Register now."),
  },
  {
    title: "Planning détaillé du jour J — bénévoles", date: "2026-11-21", axis: "volunteer", segment: seg({ audience: "volunteers" }),
    subjectFr: "Votre planning détaillé — EOCON 2026", subjectEn: "Your detailed schedule — EOCON 2026",
    bodyFr: p("Voici votre planning détaillé pour la semaine EOCON 2026 : horaires, zone d'affectation, point de rendez-vous, contact responsable."),
    bodyEn: p("Here is your detailed schedule for EOCON 2026 week: hours, assigned zone, meeting point, manager contact."),
  },
  {
    title: "Relance J-3", date: "2026-11-25", axis: "inscriptions", segment: seg({ audience: "newsletter" }),
    subjectFr: "J-3 — EOCON 2026 approche", subjectEn: "3 days — EOCON 2026 is almost here",
    bodyFr: p("Plus que 3 jours. Préparez votre venue ou votre connexion en ligne à EOCON 2026.") + p("👉 Dernière chance de vous inscrire."),
    bodyEn: p("Just 3 days left. Get ready to join EOCON 2026 on-site or online.") + p("👉 Last chance to register."),
  },
  {
    title: "Relance J-1", date: "2026-11-27", axis: "inscriptions", segment: seg({ audience: "newsletter" }),
    subjectFr: "C'est demain — EOCON 2026", subjectEn: "It's tomorrow — EOCON 2026",
    bodyFr: p("EOCON 2026 commence demain. Vérifiez votre billet et préparez-vous à nous rejoindre.") + p("À demain !"),
    bodyEn: p("EOCON 2026 starts tomorrow. Check your ticket and get ready to join us.") + p("See you tomorrow!"),
  },
  {
    title: "Accès semaine online", date: "2026-11-22", axis: "session", segment: seg({ audience: "registrations" }),
    subjectFr: "EOCON 2026 commence — votre accès en ligne", subjectEn: "EOCON 2026 begins — your online access",
    bodyFr: p("La semaine EOCON 2026 commence ! Voici tout ce qu'il faut pour suivre les sessions en ligne. Préparez votre agenda et rejoignez-nous.") + p("À très vite."),
    bodyEn: p("EOCON 2026 week is starting! Here's everything you need to follow the sessions online. Set your agenda and join us.") + p("See you very soon."),
  },
  {
    title: "Remerciements + rapport sponsors", date: "2026-12-15", axis: "custom", segment: seg({ audience: "newsletter" }),
    subjectFr: "Merci d'avoir fait vivre EOCON 2026", subjectEn: "Thank you for making EOCON 2026 happen",
    bodyFr: p("EOCON 2026 est derrière nous — merci à toutes et tous : participants, speakers, sponsors, bénévoles.") + p("Rendez-vous en 2027 !"),
    bodyEn: p("EOCON 2026 is behind us — thank you all: attendees, speakers, sponsors, volunteers.") + p("See you in 2027!"),
  },
];

export type PlanStrategicItem = { platform: string; category: string; date: string; phase: string };

// Priority-1 channels only (StrategicPlanPanel CHANNELS, priority === 1),
// grouped into small clusters and STAGGERED across several days within their
// phase window (2/day by default) — dumping 10+ channel activations on a
// single day isn't executable by a small team and defeats the point of a
// calendar. Anchored close to the matching dated Pilotage task for each
// cluster, so everything still points at the same moments.
function spreadDates(startDate: string, count: number, perDay = 2): string[] {
  const dates: string[] = [];
  const d = new Date(`${startDate}T00:00:00`);
  const pad = (n: number) => String(n).padStart(2, "0");
  for (let i = 0; i < count; i++) {
    if (i > 0 && i % perDay === 0) d.setDate(d.getDate() + 1);
    dates.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }
  return dates;
}

type Cluster = { phase: string; start: string; perDay: number; platforms: { platform: string; category: string }[] };

const CLUSTERS: Cluster[] = [
  {
    // Fondations générales — juillet, avant le point de contrôle du 25 juil.
    phase: "A", start: "2026-07-14", perDay: 2,
    platforms: [
      { platform: "eyesopensecurity.com", category: "Site officiel" },
      { platform: "Eventbrite", category: "Événementiel" },
      { platform: "LinkedIn Events", category: "Événementiel" },
      { platform: "Luma", category: "Événementiel" },
      { platform: "LinkedIn page EyesOpen", category: "Réseaux pros" },
      { platform: "Profils LinkedIn organisateurs", category: "Réseaux pros" },
      { platform: "X / Twitter", category: "Réseaux sociaux" },
      { platform: "Facebook Event", category: "Réseaux sociaux" },
      { platform: "Groupes Facebook tech/cyber Cameroun", category: "Réseaux sociaux" },
      { platform: "YouTube", category: "Réseaux sociaux" },
      { platform: "WhatsApp Channel EOCON", category: "Communautés directes" },
      { platform: "Telegram Channel", category: "Communautés directes" },
      { platform: "Newsletter EyesOpen / EOCON Brief", category: "Newsletters" },
    ],
  },
  {
    // Canaux Call For Speakers — se termine juste avant la tâche Pilotage du 25 juil.
    phase: "A", start: "2026-07-21", perDay: 2,
    platforms: [
      { platform: "Infosec Conferences", category: "Conférences cyber" },
      { platform: "Sessionize", category: "Call for Speakers" },
      { platform: "OWASP Chapters", category: "Communautés cyber" },
      { platform: "ISACA Chapters", category: "Communautés cyber" },
      { platform: "ISC2 Chapters", category: "Communautés cyber" },
    ],
  },
  {
    // Poussée sponsors — avant le "deck aux prospects tièdes" du 10 août.
    phase: "B", start: "2026-08-03", perDay: 2,
    platforms: [
      { platform: "Africa Tech Festival", category: "Écosystème Afrique" },
      { platform: "ANTIC / institutions cyber Cameroun", category: "Institutions" },
      { platform: "Ministères économie numérique", category: "Institutions" },
      { platform: "Pages LinkedIn banques", category: "Sponsors potentiels" },
      { platform: "Pages LinkedIn télécoms", category: "Sponsors potentiels" },
      { platform: "Pages LinkedIn fintechs", category: "Sponsors potentiels" },
      { platform: "Pages LinkedIn cloud/cyber vendors", category: "Sponsors potentiels" },
    ],
  },
  {
    // Rodage communauté Compétition — aligné sur la tâche Pilotage du 24 août.
    phase: "B", start: "2026-08-24", perDay: 1,
    platforms: [
      { platform: "CTFtime", category: "CTF / Hacking" },
      { platform: "Discord EyesOpenCTF", category: "Communautés directes" },
    ],
  },
  {
    // Campagne étudiants — autour de la tâche Pilotage du 16 sept.
    phase: "C", start: "2026-09-14", perDay: 2,
    platforms: [
      { platform: "Groupes WhatsApp étudiants/tech", category: "Communautés directes" },
      { platform: "Université de Douala", category: "Universités" },
      { platform: "Université de Yaoundé I", category: "Universités" },
      { platform: "Université de Buea", category: "Universités" },
      { platform: "ENSP / Polytechnique", category: "Universités" },
      { platform: "SUP'PTIC", category: "Universités" },
      { platform: "IAI Cameroun", category: "Universités" },
      { platform: "ICT University", category: "Universités" },
      { platform: "Google Developer Student Clubs / GDG", category: "Clubs étudiants" },
      { platform: "Cisco Networking Academy", category: "Clubs étudiants" },
      { platform: "Newsletters universitaires", category: "Newsletters" },
    ],
  },
  {
    // Campagne médias — autour de la tâche Pilotage du 6 oct.
    phase: "D", start: "2026-10-05", perDay: 2,
    platforms: [
      { platform: "CIO Africa", category: "Médias Afrique tech" },
      { platform: "TechAfrica News", category: "Médias Afrique tech" },
      { platform: "Digital Business Africa", category: "Médias Cameroun" },
      { platform: "Investir au Cameroun", category: "Médias Cameroun" },
      { platform: "Business in Cameroon", category: "Médias Cameroun" },
      { platform: "Agence Ecofin", category: "Médias panafricains" },
      { platform: "CIO Mag", category: "Médias panafricains" },
    ],
  },
];

export const PLAN_STRATEGIC_ITEMS: PlanStrategicItem[] = CLUSTERS.flatMap((cluster) => {
  const dates = spreadDates(cluster.start, cluster.platforms.length, cluster.perDay);
  return cluster.platforms.map(({ platform, category }, i) => ({
    platform, category, date: dates[i], phase: cluster.phase,
  }));
});
