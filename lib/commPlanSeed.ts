// Shared source data for the unified editorial calendar (CommPlanItem).
// Server-only — deliberately self-contained (small duplication of the priority-1
// subset of StrategicPlanPanel's channel list) rather than importing a "use
// client" component file into API routes.

export type PlanEmailItem = {
  title: string;
  date: string; // ISO day
  axis: string;
  segment: string;
  subjectFr: string; subjectEn: string;
  bodyFr: string; bodyEn: string;
};

const p = (s: string) => `<p>${s}</p>`;

// Every dated email touchpoint of the communication plan (11 Jul → 15 Dec).
export const PLAN_EMAIL_ITEMS: PlanEmailItem[] = [
  {
    title: "Lancement EOCON 2026", date: "2026-07-15", axis: "custom", segment: "newsletter",
    subjectFr: "EOCON 2026 est lancé 🚀", subjectEn: "EOCON 2026 is live 🚀",
    bodyFr: p("La 7ᵉ édition d'EOCON — la convention de cybersécurité bilingue de référence en Afrique — se prépare. Rendez-vous le 28 novembre 2026 à Douala, et en ligne partout dans le monde.") + p("Call For Speakers ouvert, appel à formateurs de workshops, et bien plus à venir."),
    bodyEn: p("The 7th edition of EOCON — Africa's leading bilingual cybersecurity convention — is on. Join us on 28 November 2026 in Douala, and online worldwide.") + p("Call For Speakers open, workshop trainer call, and much more to come."),
  },
  {
    title: "Appel à volontaires", date: "2026-07-12", axis: "volunteer", segment: "newsletter",
    subjectFr: "Rejoignez l'équipe EOCON 2026 — appel à volontaires", subjectEn: "Join the EOCON 2026 team — call for volunteers",
    bodyFr: p("L'appel à volontaires EOCON 2026 est ouvert. Aidez-nous à faire vivre la convention (support en ligne, logistique, accueil) et vivez l'événement de l'intérieur : expérience concrète, certificat, réseau.") + p("👉 Candidatez dès maintenant."),
    bodyEn: p("The EOCON 2026 call for volunteers is open. Help us run the convention (online support, logistics, welcome) and experience it from the inside: hands-on experience, certificate, networking.") + p("👉 Apply now."),
  },
  {
    title: "Séquence de bienvenue automatisée", date: "2026-07-15", axis: "custom", segment: "newsletter",
    subjectFr: "Bienvenue dans l'écosystème EOCON 2026", subjectEn: "Welcome to the EOCON 2026 ecosystem",
    bodyFr: p("Merci de nous suivre. Vous recevrez ici les grandes étapes d'EOCON 2026 : programme, speakers, Compétition (CTF), inscriptions.") + p("On se retrouve très vite avec les premières annonces."),
    bodyEn: p("Thanks for following along. You'll receive the key EOCON 2026 milestones here: programme, speakers, Competition (CTF), registration.") + p("See you soon with the first announcements."),
  },
  {
    title: "Sponsor confirmé — annonce", date: "2026-08-31", axis: "sponsor", segment: "newsletter",
    subjectFr: "EOCON 2026 accueille un nouveau partenaire", subjectEn: "EOCON 2026 welcomes a new partner",
    bodyFr: p("Nous sommes ravis d'annoncer un nouveau partenariat pour EOCON 2026 — un signal fort de confiance dans la convention de référence de la cybersécurité en Afrique."),
    bodyEn: p("We're thrilled to announce a new partnership for EOCON 2026 — a strong signal of trust in Africa's leading cybersecurity convention."),
  },
  {
    title: "Ouverture des inscriptions", date: "2026-09-15", axis: "inscriptions", segment: "newsletter",
    subjectFr: "Les inscriptions EOCON 2026 sont ouvertes", subjectEn: "EOCON 2026 registration is open",
    bodyFr: p("Ça y est : les inscriptions à EOCON 2026 sont ouvertes. Réservez votre place pour la convention, les workshops et la Compétition (CTF).") + p("👉 Inscrivez-vous maintenant."),
    bodyEn: p("It's here: registration for EOCON 2026 is open. Secure your seat for the convention, the workshops and the Competition (CTF).") + p("👉 Register now."),
  },
  {
    title: "Relance intérêt non converti", date: "2026-09-30", axis: "inscriptions", segment: "newsletter",
    subjectFr: "Vous n'êtes pas encore inscrit à EOCON 2026 ?", subjectEn: "Not registered for EOCON 2026 yet?",
    bodyFr: p("Le programme se remplit vite. Ne manquez pas votre place pour la convention de cybersécurité de référence en Afrique.") + p("👉 Finalisez votre inscription."),
    bodyEn: p("The programme is filling up fast. Don't miss your seat at Africa's leading cybersecurity convention.") + p("👉 Complete your registration."),
  },
  {
    title: "Programme complet dévoilé", date: "2026-10-14", axis: "session", segment: "newsletter",
    subjectFr: "Le programme complet d'EOCON 2026 est en ligne", subjectEn: "The full EOCON 2026 programme is live",
    bodyFr: p("Talks, panels, workshops, Compétition (CTF) — le programme complet d'EOCON 2026 est désormais disponible.") + p("👉 Découvrez le programme."),
    bodyEn: p("Talks, panels, workshops, Competition (CTF) — the full EOCON 2026 programme is now available.") + p("👉 Explore the programme."),
  },
  {
    title: "Relance J-14", date: "2026-11-14", axis: "inscriptions", segment: "newsletter",
    subjectFr: "J-14 avant EOCON 2026 — réservez votre place", subjectEn: "14 days to EOCON 2026 — grab your seat",
    bodyFr: p("Plus que deux semaines avant EOCON 2026. Programme complet, têtes d'affiche confirmées, Compétition (CTF) prête. Ne manquez pas ça.") + p("👉 Inscrivez-vous avant qu'il ne soit trop tard."),
    bodyEn: p("Only two weeks left before EOCON 2026. Full programme, confirmed headliners, Competition (CTF) ready. Don't miss it.") + p("👉 Register before it's too late."),
  },
  {
    title: "Relance J-7", date: "2026-11-21", axis: "inscriptions", segment: "newsletter",
    subjectFr: "J-7 — dernière ligne droite pour EOCON 2026", subjectEn: "7 days — final stretch for EOCON 2026",
    bodyFr: p("Une semaine avant EOCON 2026. C'est le moment de confirmer votre présence — en présentiel à Douala ou en ligne.") + p("👉 Inscrivez-vous maintenant."),
    bodyEn: p("One week before EOCON 2026. Now is the time to confirm your spot — on-site in Douala or online.") + p("👉 Register now."),
  },
  {
    title: "Relance J-3", date: "2026-11-25", axis: "inscriptions", segment: "newsletter",
    subjectFr: "J-3 — EOCON 2026 approche", subjectEn: "3 days — EOCON 2026 is almost here",
    bodyFr: p("Plus que 3 jours. Préparez votre venue ou votre connexion en ligne à EOCON 2026.") + p("👉 Dernière chance de vous inscrire."),
    bodyEn: p("Just 3 days left. Get ready to join EOCON 2026 on-site or online.") + p("👉 Last chance to register."),
  },
  {
    title: "Relance J-1", date: "2026-11-27", axis: "inscriptions", segment: "newsletter",
    subjectFr: "C'est demain — EOCON 2026", subjectEn: "It's tomorrow — EOCON 2026",
    bodyFr: p("EOCON 2026 commence demain. Vérifiez votre billet et préparez-vous à nous rejoindre.") + p("À demain !"),
    bodyEn: p("EOCON 2026 starts tomorrow. Check your ticket and get ready to join us.") + p("See you tomorrow!"),
  },
  {
    title: "Accès semaine online", date: "2026-11-22", axis: "session", segment: "registrations",
    subjectFr: "EOCON 2026 commence — votre accès en ligne", subjectEn: "EOCON 2026 begins — your online access",
    bodyFr: p("La semaine EOCON 2026 commence ! Voici tout ce qu'il faut pour suivre les sessions en ligne. Préparez votre agenda et rejoignez-nous.") + p("À très vite."),
    bodyEn: p("EOCON 2026 week is starting! Here's everything you need to follow the sessions online. Set your agenda and join us.") + p("See you very soon."),
  },
  {
    title: "Remerciements + rapport sponsors", date: "2026-12-15", axis: "custom", segment: "newsletter",
    subjectFr: "Merci d'avoir fait vivre EOCON 2026", subjectEn: "Thank you for making EOCON 2026 happen",
    bodyFr: p("EOCON 2026 est derrière nous — merci à toutes et tous : participants, speakers, sponsors, bénévoles.") + p("Rendez-vous en 2027 !"),
    bodyEn: p("EOCON 2026 is behind us — thank you all: attendees, speakers, sponsors, volunteers.") + p("See you in 2027!"),
  },
];

export type PlanStrategicItem = { platform: string; category: string; date: string; phase: string };

// Priority-1 channels only (StrategicPlanPanel CHANNELS, priority === 1), each
// dated to the phase where it belongs per the "one spearhead at a time"
// sequencing — anchored on the same dates already used by the Pilotage plan
// tasks, so everything points at the same moments.
const PHASE_A = "2026-07-25"; // fondations + canaux Call For Speakers
const PHASE_B_SPONSORS = "2026-08-10"; // poussée sponsors
const PHASE_B_CTF = "2026-08-24"; // rodage communauté Compétition
const PHASE_C = "2026-09-16"; // campagne étudiants
const PHASE_D = "2026-10-06"; // campagne médias

const PRIORITY1_CHANNELS: { platform: string; category: string }[] = [
  { platform: "eyesopensecurity.com", category: "Site officiel" },
  { platform: "Eventbrite", category: "Événementiel" },
  { platform: "LinkedIn Events", category: "Événementiel" },
  { platform: "Luma", category: "Événementiel" },
  { platform: "Infosec Conferences", category: "Conférences cyber" },
  { platform: "Sessionize", category: "Call for Speakers" },
  { platform: "LinkedIn page EyesOpen", category: "Réseaux pros" },
  { platform: "Profils LinkedIn organisateurs", category: "Réseaux pros" },
  { platform: "X / Twitter", category: "Réseaux sociaux" },
  { platform: "Facebook Event", category: "Réseaux sociaux" },
  { platform: "Groupes Facebook tech/cyber Cameroun", category: "Réseaux sociaux" },
  { platform: "YouTube", category: "Réseaux sociaux" },
  { platform: "WhatsApp Channel EOCON", category: "Communautés directes" },
  { platform: "Telegram Channel", category: "Communautés directes" },
  { platform: "OWASP Chapters", category: "Communautés cyber" },
  { platform: "ISACA Chapters", category: "Communautés cyber" },
  { platform: "ISC2 Chapters", category: "Communautés cyber" },
  { platform: "Newsletter EyesOpen / EOCON Brief", category: "Newsletters" },
  { platform: "CTFtime", category: "CTF / Hacking" },
  { platform: "Discord EyesOpenCTF", category: "Communautés directes" },
  { platform: "Africa Tech Festival", category: "Écosystème Afrique" },
  { platform: "ANTIC / institutions cyber Cameroun", category: "Institutions" },
  { platform: "Ministères économie numérique", category: "Institutions" },
  { platform: "Pages LinkedIn banques", category: "Sponsors potentiels" },
  { platform: "Pages LinkedIn télécoms", category: "Sponsors potentiels" },
  { platform: "Pages LinkedIn fintechs", category: "Sponsors potentiels" },
  { platform: "Pages LinkedIn cloud/cyber vendors", category: "Sponsors potentiels" },
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
  { platform: "CIO Africa", category: "Médias Afrique tech" },
  { platform: "TechAfrica News", category: "Médias Afrique tech" },
  { platform: "Digital Business Africa", category: "Médias Cameroun" },
  { platform: "Investir au Cameroun", category: "Médias Cameroun" },
  { platform: "Business in Cameroon", category: "Médias Cameroun" },
  { platform: "Agence Ecofin", category: "Médias panafricains" },
  { platform: "CIO Mag", category: "Médias panafricains" },
];

// Per-platform date/phase override for the handful of channels whose timing
// diverges from their category's default (e.g. most "Communautés directes"
// launch in Phase A, but the student WhatsApp groups only make sense once the
// student campaign starts in Phase C).
const OVERRIDE: Record<string, { date: string; phase: string }> = {
  "Discord EyesOpenCTF": { date: PHASE_B_CTF, phase: "B" },
  "CTFtime": { date: PHASE_B_CTF, phase: "B" },
  "Africa Tech Festival": { date: PHASE_B_SPONSORS, phase: "B" },
  "ANTIC / institutions cyber Cameroun": { date: PHASE_B_SPONSORS, phase: "B" },
  "Ministères économie numérique": { date: PHASE_B_SPONSORS, phase: "B" },
  "Pages LinkedIn banques": { date: PHASE_B_SPONSORS, phase: "B" },
  "Pages LinkedIn télécoms": { date: PHASE_B_SPONSORS, phase: "B" },
  "Pages LinkedIn fintechs": { date: PHASE_B_SPONSORS, phase: "B" },
  "Pages LinkedIn cloud/cyber vendors": { date: PHASE_B_SPONSORS, phase: "B" },
  "Groupes WhatsApp étudiants/tech": { date: PHASE_C, phase: "C" },
  "Université de Douala": { date: PHASE_C, phase: "C" },
  "Université de Yaoundé I": { date: PHASE_C, phase: "C" },
  "Université de Buea": { date: PHASE_C, phase: "C" },
  "ENSP / Polytechnique": { date: PHASE_C, phase: "C" },
  "SUP'PTIC": { date: PHASE_C, phase: "C" },
  "IAI Cameroun": { date: PHASE_C, phase: "C" },
  "ICT University": { date: PHASE_C, phase: "C" },
  "Google Developer Student Clubs / GDG": { date: PHASE_C, phase: "C" },
  "Cisco Networking Academy": { date: PHASE_C, phase: "C" },
  "Newsletters universitaires": { date: PHASE_C, phase: "C" },
  "CIO Africa": { date: PHASE_D, phase: "D" },
  "TechAfrica News": { date: PHASE_D, phase: "D" },
  "Digital Business Africa": { date: PHASE_D, phase: "D" },
  "Investir au Cameroun": { date: PHASE_D, phase: "D" },
  "Business in Cameroon": { date: PHASE_D, phase: "D" },
  "Agence Ecofin": { date: PHASE_D, phase: "D" },
  "CIO Mag": { date: PHASE_D, phase: "D" },
};

export const PLAN_STRATEGIC_ITEMS: PlanStrategicItem[] = PRIORITY1_CHANNELS.map(({ platform, category }) => {
  const o = OVERRIDE[platform];
  return { platform, category, date: o?.date ?? PHASE_A, phase: o?.phase ?? "A" };
});
