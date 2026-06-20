"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Priority = 1 | 2 | 3;
type ChannelStatus = "todo" | "in-progress" | "done";
type SubTab = "channels" | "phases" | "hashtags";

interface Channel {
  category: string;
  platform: string;
  objective: string;
  what: string;
  priority: Priority;
  action: string;
  defaultUrl?: string;
  isCustom?: boolean;
}

interface DbData {
  statuses: Record<string, ChannelStatus>;
  urls: Record<string, string>;
  custom: Channel[];
  hidden: string[];
}

interface AiResult {
  message_fr: string;
  message_en: string;
  notes: string;
}

// ─── Static data ─────────────────────────────────────────────────────────────

const CHANNELS: Channel[] = [
  { category: "Site officiel", platform: "eyesopensecurity.com", objective: "Source officielle", what: "Page EOCON 2026, inscription, sponsoring, CFP, CTF", priority: 1, action: "Centraliser tous les liens ici", defaultUrl: "https://eyesopensecurity.com" },
  { category: "Événementiel", platform: "Eventbrite", objective: "Billetterie + visibilité Google", what: "Annonce générale + inscription", priority: 1, action: "Créer une page EOCON 2026", defaultUrl: "https://www.eventbrite.com/manage/events/create/" },
  { category: "Événementiel", platform: "LinkedIn Events", objective: "Sponsors, speakers, décideurs", what: "Événement officiel + posts réguliers", priority: 1, action: "Créer un événement LinkedIn depuis la page EyesOpen", defaultUrl: "https://www.linkedin.com/events/new" },
  { category: "Événementiel", platform: "Luma", objective: "Page moderne + partage rapide", what: "Page événement, side-events, meetups", priority: 1, action: "Créer une page EOCON + pages ateliers", defaultUrl: "https://lu.ma/" },
  { category: "Événementiel", platform: "Meetup", objective: "Communauté locale et tech", what: "Meetup Cybersecurity Douala / Africa", priority: 2, action: "Créer un groupe ou publier via groupes existants", defaultUrl: "https://www.meetup.com/" },
  { category: "Événementiel", platform: "10times", objective: "Annuaire international business", what: "Listing conférence", priority: 2, action: "Soumettre EOCON comme conférence internationale", defaultUrl: "https://10times.com/add-event" },
  { category: "Événementiel", platform: "Humanitix", objective: "Billetterie alternative + impact social", what: "Page événement", priority: 3, action: "Utile si tu veux insister sur l'impact éducatif", defaultUrl: "https://humanitix.com/" },
  { category: "Conférences cyber", platform: "Infosec Conferences", objective: "Visibilité communauté cyber mondiale", what: "Listing EOCON", priority: 1, action: "Soumettre EOCON dans l'annuaire cyber" },
  { category: "Conférences cyber", platform: "Cybersecurity Directories", objective: "Référencement cyber", what: "Listing conférence", priority: 2, action: "Soumettre dans plusieurs annuaires" },
  { category: "Call for Speakers", platform: "Sessionize", objective: "Gestion professionnelle du CFP", what: "Appel à conférenciers", priority: 1, action: "Créer le CFP EOCON 2026", defaultUrl: "https://sessionize.com/" },
  { category: "Call for Speakers", platform: "Papercall.io", objective: "Speakers tech/dev/cyber", what: "CFP technique", priority: 2, action: "Publier l'appel à speakers", defaultUrl: "https://www.papercall.io/" },
  { category: "Call for Speakers", platform: "WikiCFP", objective: "Chercheurs, universitaires", what: "CFP académique et technique", priority: 2, action: "Publier les thèmes EOCON", defaultUrl: "http://www.wikicfp.com/cfp/" },
  { category: "CTF / Hacking", platform: "CTFtime", objective: "Attirer équipes CTF internationales", what: "EyesOpenCTF 2026", priority: 1, action: "Soumettre la compétition CTF", defaultUrl: "https://ctftime.org/" },
  { category: "CTF / Hacking", platform: "Devpost", objective: "Hackathon / challenge / compétition", what: "EyesOpenCTF ou challenge parallèle", priority: 2, action: "Créer une page compétition", defaultUrl: "https://devpost.com/" },
  { category: "CTF / Hacking", platform: "Hack The Box community", objective: "Talents cyber offensifs", what: "Annonce CTF + conférence", priority: 2, action: "Demander relais communautaire" },
  { category: "CTF / Hacking", platform: "TryHackMe community", objective: "Débutants/intermédiaires cyber", what: "Annonce CTF + workshops", priority: 2, action: "Publier dans communautés pertinentes" },
  { category: "CTF / Hacking", platform: "Root-Me community", objective: "Communauté francophone cyber", what: "EyesOpenCTF + CFP", priority: 2, action: "Demander relais ou publication", defaultUrl: "https://www.root-me.org/" },
  { category: "Réseaux pros", platform: "LinkedIn page EyesOpen", objective: "Crédibilité + sponsors + speakers", what: "Posts officiels, chiffres, sponsors, speakers", priority: 1, action: "Publier 2 à 3 fois par semaine", defaultUrl: "https://www.linkedin.com/company/eyesopensecurity/" },
  { category: "Réseaux pros", platform: "Profils LinkedIn organisateurs", objective: "Amplification humaine", what: "Posts personnels + storytelling", priority: 1, action: "Chaque membre clé doit relayer", defaultUrl: "https://www.linkedin.com/" },
  { category: "Réseaux pros", platform: "Groupes LinkedIn cybersécurité", objective: "Audience cyber ciblée", what: "CFP, sponsor call, CTF", priority: 2, action: "Publier sans spam, avec angle expertise", defaultUrl: "https://www.linkedin.com/groups/" },
  { category: "Réseaux sociaux", platform: "X / Twitter", objective: "Communauté infosec, CTF, bug bounty", what: "Threads, visuels, CFP, CTF", priority: 1, action: "Poster régulièrement avec hashtags cyber", defaultUrl: "https://x.com/" },
  { category: "Réseaux sociaux", platform: "Facebook Event", objective: "Public local, étudiants, diaspora", what: "Événement officiel + rappels", priority: 1, action: "Créer l'événement Facebook", defaultUrl: "https://www.facebook.com/events/create/" },
  { category: "Réseaux sociaux", platform: "Groupes Facebook tech/cyber Cameroun", objective: "Étudiants, développeurs, communautés locales", what: "Annonce + visuel + lien", priority: 1, action: "Publier dans groupes ciblés", defaultUrl: "https://www.facebook.com/groups/" },
  { category: "Réseaux sociaux", platform: "Instagram", objective: "Image de marque + désirabilité", what: "Reels, carrousels, speakers, teasers", priority: 2, action: "Publier visuels premium", defaultUrl: "https://www.instagram.com/" },
  { category: "Réseaux sociaux", platform: "TikTok", objective: "Jeunes, étudiants, sensibilisation", what: "Vidéos courtes cyber/carrière/CTF", priority: 2, action: "Créer contenus éducatifs courts", defaultUrl: "https://www.tiktok.com/" },
  { category: "Réseaux sociaux", platform: "YouTube", objective: "Crédibilité longue durée", what: "Teaser, interviews, anciennes éditions", priority: 1, action: "Publier teaser officiel + playlist EOCON", defaultUrl: "https://www.youtube.com/@EOCON" },
  { category: "Réseaux sociaux", platform: "YouTube Shorts", objective: "Découverte rapide", what: "Extraits courts, chiffres, appels", priority: 2, action: "Recycler les vidéos longues", defaultUrl: "https://www.youtube.com/@EOCON" },
  { category: "Communautés directes", platform: "WhatsApp Channel EOCON", objective: "Diffusion massive en Afrique", what: "Annonces officielles", priority: 1, action: "Créer un canal officiel", defaultUrl: "https://www.whatsapp.com/channel/create" },
  { category: "Communautés directes", platform: "Groupes WhatsApp étudiants/tech", objective: "Acquisition participants", what: "Annonce courte + visuel + lien", priority: 1, action: "Diffusion via ambassadeurs" },
  { category: "Communautés directes", platform: "Telegram Channel", objective: "Public tech/cyber", what: "Annonces, CTF, workshops", priority: 1, action: "Créer canal Telegram", defaultUrl: "https://t.me/" },
  { category: "Communautés directes", platform: "Discord EyesOpenCTF", objective: "Animation CTF + support technique", what: "Règlement, défis, annonces, support", priority: 1, action: "Créer serveur Discord dédié", defaultUrl: "https://discord.com/" },
  { category: "Communautés directes", platform: "Discord cyber/dev existants", objective: "Recruter participants CTF", what: "Annonce CTF + CFP", priority: 2, action: "Demander autorisation aux admins", defaultUrl: "https://discord.com/" },
  { category: "Communautés cyber", platform: "OWASP Chapters", objective: "AppSec, API security, web security", what: "CFP + annonce conférence", priority: 1, action: "Contacter OWASP Cameroun/Africa/France/Montréal", defaultUrl: "https://owasp.org/chapters/" },
  { category: "Communautés cyber", platform: "ISACA Chapters", objective: "GRC, audit, risque, compliance", what: "Annonce panels + sponsors", priority: 1, action: "Contacter chapitres Afrique/Canada/France", defaultUrl: "https://www.isaca.org/chapters" },
  { category: "Communautés cyber", platform: "ISC2 Chapters", objective: "Professionnels certifiés cyber", what: "CFP + invitation professionnels", priority: 1, action: "Demander relais officiel", defaultUrl: "https://www.isc2.org/Chapters" },
  { category: "Communautés cyber", platform: "FIRST / CERT / CSIRT", objective: "Incident response, institutions cyber", what: "Invitation speakers + partenaires", priority: 2, action: "Contacter CERT/CSIRT africains" },
  { category: "Communautés cyber", platform: "Bug bounty communities", objective: "Hackers éthiques", what: "CTF + offensive security talks", priority: 2, action: "Publier annonce orientée challenge" },
  { category: "Communautés dev", platform: "GitHub", objective: "Développeurs, open source", what: "Repo ressources EOCON/CTF", priority: 3, action: "Créer repo public si pertinent", defaultUrl: "https://github.com/" },
  { category: "Communautés dev", platform: "Dev.to", objective: "Développeurs et tech writers", what: "Article 'Why EOCON 2026 matters'", priority: 2, action: "Publier article en anglais", defaultUrl: "https://dev.to/" },
  { category: "Communautés dev", platform: "Hashnode", objective: "Développeurs, cloud, security", what: "Article technique / annonce", priority: 2, action: "Publier article sponsor/speaker", defaultUrl: "https://hashnode.com/" },
  { category: "Communautés dev", platform: "Product Hunt", objective: "Visibilité tech", what: "Page initiative / communauté", priority: 3, action: "Seulement si angle produit/plateforme", defaultUrl: "https://www.producthunt.com/" },
  { category: "Reddit", platform: "r/cybersecurity", objective: "Large public cyber", what: "Annonce non commerciale", priority: 2, action: "Respecter règles de publication", defaultUrl: "https://www.reddit.com/r/cybersecurity/" },
  { category: "Reddit", platform: "r/netsec", objective: "Public cyber avancé", what: "CFP technique uniquement", priority: 2, action: "Poster seulement si contenu technique solide", defaultUrl: "https://www.reddit.com/r/netsec/" },
  { category: "Reddit", platform: "r/bugbounty", objective: "Bug bounty hunters", what: "CTF + talks offensive security", priority: 2, action: "Publier annonce CTF", defaultUrl: "https://www.reddit.com/r/bugbounty/" },
  { category: "Reddit", platform: "r/osint", objective: "OSINT community", what: "CTF OSINT + talks OSINT", priority: 2, action: "Publier annonce ciblée", defaultUrl: "https://www.reddit.com/r/osint/" },
  { category: "Reddit", platform: "r/ReverseEngineering", objective: "Reverse engineers", what: "Challenges reverse + CFP", priority: 2, action: "Publier uniquement si contenu reverse réel", defaultUrl: "https://www.reddit.com/r/ReverseEngineering/" },
  { category: "Reddit", platform: "r/blueteamsec", objective: "Blue team / SOC", what: "Talks SOC, threat hunting, DFIR", priority: 2, action: "Publier angle défense", defaultUrl: "https://www.reddit.com/r/blueteamsec/" },
  { category: "Médias Afrique tech", platform: "TechCabal", objective: "Audience tech/startup africaine", what: "Communiqué de presse", priority: 2, action: "Envoyer pitch média", defaultUrl: "https://techcabal.com/" },
  { category: "Médias Afrique tech", platform: "Techpoint Africa", objective: "Startups, tech, Nigeria/West Africa", what: "Communiqué + angle Afrique digitale", priority: 2, action: "Envoyer pitch média", defaultUrl: "https://techpoint.africa/" },
  { category: "Médias Afrique tech", platform: "CIO Africa", objective: "CIO, DSI, décideurs IT", what: "Annonce business/cyber", priority: 1, action: "Pitcher partenariat média" },
  { category: "Médias Afrique tech", platform: "TechAfrica News", objective: "Télécoms, digital, cyber Afrique", what: "Communiqué presse", priority: 1, action: "Pitcher angle cybersécurité Afrique" },
  { category: "Médias Afrique tech", platform: "Disrupt Africa", objective: "Startup/innovation Afrique", what: "Annonce si angle startup/sponsors", priority: 2, action: "Pitcher côté opportunités business", defaultUrl: "https://disrupt-africa.com/" },
  { category: "Écosystème Afrique", platform: "Africa Tech Festival", objective: "Sponsors, décideurs, télécoms, cloud, fintech", what: "Annonce + networking", priority: 1, action: "Identifier partenaires et relais", defaultUrl: "https://africatechfestival.com/" },
  { category: "Écosystème Afrique", platform: "GITEX Africa community", objective: "Tech, startups, institutions", what: "Relais partenaires", priority: 2, action: "Cibler exposants/sponsors", defaultUrl: "https://gitexafrica.com/" },
  { category: "Écosystème Afrique", platform: "AfriLabs network", objective: "Hubs innovation africains", what: "Appel ambassadeurs/partenaires", priority: 2, action: "Contacter hubs membres", defaultUrl: "https://www.afrilabs.com/" },
  { category: "Médias Cameroun", platform: "Digital Business Africa", objective: "Numérique, télécoms, cyber, Cameroun", what: "Communiqué de presse", priority: 1, action: "Média très pertinent" },
  { category: "Médias Cameroun", platform: "Investir au Cameroun", objective: "Business, économie, institutions", what: "Communiqué business", priority: 1, action: "Angle Douala + économie numérique", defaultUrl: "https://www.investiraucameroun.com/" },
  { category: "Médias Cameroun", platform: "Business in Cameroon", objective: "Décideurs économiques", what: "Article annonce", priority: 1, action: "Pitch sponsor/business", defaultUrl: "https://www.businessincameroon.com/" },
  { category: "Médias Cameroun", platform: "Cameroon Tribune", objective: "Institutionnel", what: "Communiqué officiel", priority: 2, action: "Angle souveraineté numérique" },
  { category: "Médias Cameroun", platform: "Journal du Cameroun", objective: "Grand public + local", what: "Annonce événement", priority: 2, action: "Angle jeunesse/innovation", defaultUrl: "https://www.journalducameroun.com/" },
  { category: "Médias panafricains", platform: "Agence Ecofin", objective: "Économie, tech, institutions Afrique", what: "Communiqué de presse", priority: 1, action: "Très bon pour crédibilité", defaultUrl: "https://www.agenceecofin.com/" },
  { category: "Médias panafricains", platform: "CIO Mag", objective: "DSI, décideurs IT francophones", what: "Article / partenariat média", priority: 1, action: "Angle cybersécurité entreprise", defaultUrl: "https://www.cio-mag.com/" },
  { category: "Médias panafricains", platform: "We Are Tech Africa", objective: "Digital economy africaine", what: "Article annonce", priority: 2, action: "Pitch transformation numérique" },
  { category: "Universités", platform: "Université de Douala", objective: "Participants étudiants, bénévoles", what: "Annonce + appel étudiants", priority: 1, action: "Contacter administration + clubs" },
  { category: "Universités", platform: "Université de Yaoundé I", objective: "Étudiants IT, recherche", what: "Annonce + CFP étudiant", priority: 1, action: "Relais départements informatique" },
  { category: "Universités", platform: "Université de Buea", objective: "Étudiants anglophones, tech", what: "Annonce bilingue", priority: 1, action: "Relais clubs tech" },
  { category: "Universités", platform: "ENSP / Polytechnique", objective: "Ingénieurs, chercheurs", what: "CFP + workshops", priority: 1, action: "Contacter clubs et enseignants" },
  { category: "Universités", platform: "SUP'PTIC", objective: "Télécoms, réseaux, sécurité", what: "Annonce + ateliers", priority: 1, action: "Partenariat académique" },
  { category: "Universités", platform: "IAI Cameroun", objective: "Informatique, dev, cyber", what: "Annonce + bénévolat", priority: 1, action: "Relais étudiants" },
  { category: "Universités", platform: "ICT University", objective: "Tech, international, anglophone", what: "Annonce bilingue", priority: 1, action: "Relais officiel" },
  { category: "Clubs étudiants", platform: "Google Developer Student Clubs / GDG", objective: "Développeurs étudiants", what: "Annonce + workshops", priority: 1, action: "Demander relais ambassadeurs" },
  { category: "Clubs étudiants", platform: "Microsoft Learn Student Ambassadors", objective: "Cloud, sécurité, étudiants", what: "Annonce + CFP jeunes", priority: 2, action: "Identifier ambassadeurs locaux" },
  { category: "Clubs étudiants", platform: "Cisco Networking Academy", objective: "Réseau, sécurité, étudiants", what: "CTF + ateliers", priority: 1, action: "Très pertinent pour cyber/réseau", defaultUrl: "https://www.netacad.com/" },
  { category: "Newsletters", platform: "Newsletter EyesOpen / EOCON Brief", objective: "Fidélisation audience", what: "Updates réguliers", priority: 1, action: "Lancer une newsletter officielle" },
  { category: "Newsletters", platform: "Newsletters cyber africaines", objective: "Audience spécialisée", what: "CFP + annonce", priority: 2, action: "Demander relais" },
  { category: "Newsletters", platform: "Newsletters universitaires", objective: "Étudiants, bénévoles", what: "Appel participants", priority: 1, action: "Préparer message court" },
  { category: "Institutions", platform: "ANTIC / institutions cyber Cameroun", objective: "Crédibilité institutionnelle", what: "Invitation officielle", priority: 1, action: "Demander soutien/relais" },
  { category: "Institutions", platform: "Ministères économie numérique", objective: "Institutionnel", what: "Note officielle", priority: 1, action: "Préparer courrier formel" },
  { category: "Institutions", platform: "Chambres de commerce", objective: "Sponsors, entreprises", what: "Annonce business", priority: 2, action: "Demander diffusion membre" },
  { category: "Institutions", platform: "Ambassades / missions économiques", objective: "Partenaires internationaux", what: "Invitation institutionnelle", priority: 2, action: "Cibler Canada, France, UE, USA" },
  { category: "Sponsors potentiels", platform: "Pages LinkedIn banques", objective: "Sponsors", what: "Commentaires + messages directs", priority: 1, action: "Cibler directions marketing/IT", defaultUrl: "https://www.linkedin.com/" },
  { category: "Sponsors potentiels", platform: "Pages LinkedIn télécoms", objective: "Sponsors stratégiques", what: "Sponsorship deck", priority: 1, action: "Cibler MTN, Orange, Camtel, etc.", defaultUrl: "https://www.linkedin.com/" },
  { category: "Sponsors potentiels", platform: "Pages LinkedIn fintechs", objective: "Sponsors/startups", what: "Pitch business/cyber", priority: 1, action: "Cibler paiements, mobile money", defaultUrl: "https://www.linkedin.com/" },
  { category: "Sponsors potentiels", platform: "Pages LinkedIn cloud/cyber vendors", objective: "Sponsors techniques", what: "Pitch visibilité + workshop", priority: 1, action: "Cibler vendors cyber/cloud", defaultUrl: "https://www.linkedin.com/" },
];

const PHASES = [
  { phase: 1, period: "Immédiatement", actions: "Créer les pages officielles", platforms: "Site, LinkedIn Events, Eventbrite, Luma, Facebook Event" },
  { phase: 2, period: "Immédiatement après", actions: "Lancer CFP", platforms: "Sessionize, WikiCFP, LinkedIn, OWASP, ISACA, ISC2" },
  { phase: 3, period: "Après CFP", actions: "Lancer sponsors", platforms: "LinkedIn, médias business, chambres de commerce, emails directs" },
  { phase: 4, period: "3–6 mois avant", actions: "Lancer CTF", platforms: "CTFtime, Discord, Telegram, X, Root-Me, Hack The Box" },
  { phase: 5, period: "2–4 mois avant", actions: "Campagne étudiants", platforms: "Universités, WhatsApp, Facebook Groups, GDG, Cisco Academy" },
  { phase: 6, period: "1–3 mois avant", actions: "Campagne médias", platforms: "Digital Business Africa, Agence Ecofin, CIO Africa, Business in Cameroon" },
  { phase: 7, period: "Dernier mois", actions: "Conversion massive", platforms: "WhatsApp, Telegram, LinkedIn, Facebook, Instagram, TikTok" },
  { phase: 8, period: "Après événement", actions: "Capitaliser", platforms: "YouTube, LinkedIn, médias, newsletter, rapport sponsor" },
];

const HASHTAGS = [
  { group: "Général", color: "#00ff9d", tags: ["#EOCON2026", "#EOCON", "#EyesOpenSecurity", "#SecureTheFuture"] },
  { group: "Cyber", color: "#cc00ff", tags: ["#Cybersecurity", "#InfoSec", "#CyberSecurityAfrica", "#AppSec", "#CloudSecurity"] },
  { group: "CTF", color: "#ff0066", tags: ["#CTF", "#CaptureTheFlag", "#EthicalHacking", "#RedTeam", "#BlueTeam"] },
  { group: "Afrique", color: "#ffaa00", tags: ["#AfricaTech", "#DigitalAfrica", "#AfricaCybersecurity", "#TechAfrica"] },
  { group: "Cameroun", color: "#00ccff", tags: ["#CameroonTech", "#Douala", "#Cameroun", "#DigitalCameroon"] },
  { group: "Business", color: "#ff6600", tags: ["#DigitalTransformation", "#CyberRisk", "#GRC", "#Innovation", "#TechLeadership"] },
  { group: "Étudiants", color: "#0066ff", tags: ["#StudentsInTech", "#WomenInCyber", "#CyberTalent", "#TechCareers"] },
];

// ─── Constants ───────────────────────────────────────────────────────────────

const PRIORITY_LABELS: Record<Priority, { label: string; color: string }> = {
  1: { label: "Haute", color: "#ff0066" },
  2: { label: "Moyenne", color: "#ffaa00" },
  3: { label: "Basse", color: "#888" },
};

const STATUS_OPTIONS = [
  { value: "todo" as ChannelStatus, label: "À faire", color: "#555", icon: "○" },
  { value: "in-progress" as ChannelStatus, label: "En cours", color: "#ffaa00", icon: "◑" },
  { value: "done" as ChannelStatus, label: "Fait", color: "#00ff9d", icon: "●" },
];

// ─── PriorityBadge ───────────────────────────────────────────────────────────

function PriorityBadge({ p }: { p: Priority }) {
  const { label, color } = PRIORITY_LABELS[p];
  return (
    <span className="text-xs px-2 py-0.5 rounded shrink-0" style={{ background: color + "20", color, fontFamily: "'Share Tech Mono', monospace" }}>
      P{p} {label}
    </span>
  );
}

// ─── ChannelCard ─────────────────────────────────────────────────────────────

interface ChannelCardProps {
  channel: Channel;
  status: ChannelStatus;
  url: string;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (s: ChannelStatus) => void;
  onUrlSave: (url: string) => void;
  onDelete: () => void;
  canWrite: boolean;
  aiResult?: AiResult;
  onGenerate: () => void;
  isGenerating: boolean;
  anyGenerating: boolean;
}

function ChannelCard({
  channel, status, url, expanded, onToggle,
  onStatusChange, onUrlSave, onDelete, canWrite,
  aiResult, onGenerate, isGenerating, anyGenerating,
}: ChannelCardProps) {
  const [localUrl, setLocalUrl] = useState(url);
  const [aiLang, setAiLang] = useState<"fr" | "en">("fr");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocalUrl(url); }, [url]);

  const handleUrlChange = (val: string) => {
    setLocalUrl(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onUrlSave(val), 800);
  };

  const getContent = (lang: "fr" | "en") => {
    const key = `${channel.platform}__${lang}`;
    if (edits[key] !== undefined) return edits[key];
    return lang === "fr" ? (aiResult?.message_fr || "") : (aiResult?.message_en || "");
  };

  const setContent = (lang: "fr" | "en", val: string) => {
    setEdits(prev => ({ ...prev, [`${channel.platform}__${lang}`]: val }));
  };

  const copy = () => {
    navigator.clipboard.writeText(getContent(aiLang));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusOpt = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
  const displayUrl = localUrl || channel.defaultUrl || "";

  return (
    <div className="rounded-xl overflow-hidden transition-all" style={{ background: "#111", border: `1px solid ${expanded ? "#00ff9d25" : "#1a1a1a"}` }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ cursor: "pointer" }} onClick={onToggle}>
        <span className="text-gray-600 shrink-0 text-xs select-none">{expanded ? "▼" : "▶"}</span>
        <div className="flex-1 min-w-0 select-none">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white font-medium truncate">{channel.platform}</span>
            {channel.isCustom && (
              <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ background: "#cc00ff20", color: "#cc00ff", fontSize: 10 }}>
                Custom
              </span>
            )}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">{channel.category}</div>
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          <PriorityBadge p={channel.priority} />

          <select
            value={status}
            onChange={e => onStatusChange(e.target.value as ChannelStatus)}
            disabled={!canWrite}
            className="text-xs rounded px-2 py-1 outline-none"
            style={{ background: statusOpt.color + "20", color: statusOpt.color, border: `1px solid ${statusOpt.color}50` }}
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.icon} {o.label}</option>
            ))}
          </select>

          <button
            onClick={() => { onGenerate(); if (!expanded) onToggle(); }}
            disabled={anyGenerating}
            title="Générer contenu avec IA"
            className="text-xs px-2.5 py-1 rounded font-mono transition-all shrink-0"
            style={{
              background: isGenerating ? "#cc00ff20" : aiResult ? "#00ff9d10" : "#1a1a1a",
              color: isGenerating ? "#cc00ff" : aiResult ? "#00ff9d" : "#666",
              border: `1px solid ${isGenerating ? "#cc00ff50" : aiResult ? "#00ff9d30" : "#333"}`,
              cursor: anyGenerating ? "not-allowed" : "pointer",
            }}
          >
            {isGenerating ? "···" : aiResult ? "↺ IA" : "◉ IA"}
          </button>

          {canWrite && (
            deleteConfirm ? (
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => { onDelete(); setDeleteConfirm(false); }}
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: "#ff006620", color: "#ff0066", border: "1px solid #ff006640" }}
                >
                  Oui
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: "#1a1a1a", color: "#555" }}
                >
                  Non
                </button>
              </div>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); setDeleteConfirm(true); }}
                title="Supprimer ce canal"
                className="text-xs w-6 h-6 flex items-center justify-center rounded transition-colors opacity-30 hover:opacity-100"
                style={{ color: "#ff0066" }}
              >
                ✕
              </button>
            )
          )}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4" style={{ borderTop: "1px solid #1a1a1a" }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 text-xs">
            <div>
              <div className="text-gray-600 mb-1">Objectif</div>
              <div className="text-gray-400 leading-relaxed">{channel.objective}</div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">Quoi publier</div>
              <div className="text-gray-400 leading-relaxed">{channel.what}</div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">Action</div>
              <div className="text-gray-400 leading-relaxed">{channel.action}</div>
            </div>
          </div>

          {/* URL */}
          <div>
            <div className="text-xs text-gray-600 mb-1.5">URL de la plateforme</div>
            <div className="flex gap-2">
              <input
                type="url"
                value={localUrl}
                onChange={e => handleUrlChange(e.target.value)}
                placeholder={channel.defaultUrl || "https://..."}
                disabled={!canWrite}
                className="flex-1 text-xs rounded-lg px-3 py-2 text-white placeholder-gray-700 outline-none"
                style={{ background: "#0a0a0a", border: "1px solid #222" }}
              />
              {displayUrl && (
                <a
                  href={displayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-2 rounded-lg shrink-0 flex items-center"
                  style={{ background: "#0a0a0a", color: "#555", border: "1px solid #222" }}
                  title="Ouvrir"
                >
                  ↗
                </a>
              )}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={onGenerate}
            disabled={anyGenerating}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: isGenerating ? "#cc00ff10" : "#0a0a0a",
              color: isGenerating ? "#cc00ff" : "#888",
              border: `1px solid ${isGenerating ? "#cc00ff40" : "#222"}`,
              cursor: anyGenerating ? "not-allowed" : "pointer",
            }}
          >
            {isGenerating ? "Génération en cours..." : aiResult ? "↺ Régénérer le contenu IA" : "◉ Générer le contenu avec l'IA"}
          </button>

          {/* AI result */}
          {aiResult && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #00ff9d20", background: "#0a0a0a" }}>
              <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid #1a1a1a" }}>
                <div className="flex gap-1">
                  {(["fr", "en"] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setAiLang(lang)}
                      className="text-xs px-3 py-1 rounded uppercase tracking-wider"
                      style={{
                        background: aiLang === lang ? "#00ff9d20" : "transparent",
                        color: aiLang === lang ? "#00ff9d" : "#555",
                        border: `1px solid ${aiLang === lang ? "#00ff9d40" : "transparent"}`,
                      }}
                    >
                      {lang === "fr" ? "Français" : "English"}
                    </button>
                  ))}
                </div>
                <button
                  onClick={copy}
                  className="text-xs px-3 py-1 rounded transition-colors"
                  style={{ background: copied ? "#00ff9d20" : "#1a1a1a", color: copied ? "#00ff9d" : "#666", border: "1px solid #333" }}
                >
                  {copied ? "Copié !" : "Copier"}
                </button>
              </div>
              <div className="p-4">
                <textarea
                  value={getContent(aiLang)}
                  onChange={e => setContent(aiLang, e.target.value)}
                  className="w-full text-sm text-gray-300 bg-transparent outline-none resize-none leading-relaxed"
                  rows={7}
                  style={{ fontFamily: "inherit" }}
                />
                {aiResult.notes && (
                  <div className="mt-3 text-xs rounded-lg p-3" style={{ background: "#ffaa0010", border: "1px solid #ffaa0020", color: "#ffaa00" }}>
                    <div className="font-medium mb-1 opacity-70">Notes & conseils</div>
                    {aiResult.notes}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AddChannelModal ──────────────────────────────────────────────────────────

function AddChannelModal({ onAdd, onClose, existingCategories }: {
  onAdd: (ch: Channel) => void;
  onClose: () => void;
  existingCategories: string[];
}) {
  const [form, setForm] = useState<{ category: string; platform: string; objective: string; what: string; action: string; priority: Priority; defaultUrl: string }>({
    category: "", platform: "", objective: "", what: "", action: "", priority: 2, defaultUrl: "",
  });

  const valid = !!(form.platform.trim() && form.category.trim() && form.objective.trim());

  const submit = () => {
    if (!valid) return;
    onAdd({
      category: form.category.trim(),
      platform: form.platform.trim(),
      objective: form.objective.trim(),
      what: form.what.trim(),
      action: form.action.trim(),
      priority: form.priority,
      defaultUrl: form.defaultUrl.trim() || undefined,
      isCustom: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ background: "#0d0d0d", border: "1px solid #00ff9d30" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #1a1a1a" }}>
          <div className="text-white font-bold">Ajouter un canal</div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg">✕</button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Plateforme *</label>
              <input
                type="text"
                value={form.platform}
                onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                placeholder="ex: Substack, Medium..."
                className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                style={{ background: "#111", border: "1px solid #222" }}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Catégorie *</label>
              <input
                type="text"
                list="cat-options"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="ex: Réseaux sociaux..."
                className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                style={{ background: "#111", border: "1px solid #222" }}
              />
              <datalist id="cat-options">
                {existingCategories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Objectif *</label>
            <input
              type="text"
              value={form.objective}
              onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}
              placeholder="ex: Attirer sponsors B2B francophones"
              className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
              style={{ background: "#111", border: "1px solid #222" }}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Quoi publier</label>
            <input
              type="text"
              value={form.what}
              onChange={e => setForm(f => ({ ...f, what: e.target.value }))}
              placeholder="ex: Annonce générale + CTA inscription"
              className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
              style={{ background: "#111", border: "1px solid #222" }}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Action</label>
            <input
              type="text"
              value={form.action}
              onChange={e => setForm(f => ({ ...f, action: e.target.value }))}
              placeholder="ex: Envoyer communiqué presse"
              className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
              style={{ background: "#111", border: "1px solid #222" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">URL</label>
              <input
                type="url"
                value={form.defaultUrl}
                onChange={e => setForm(f => ({ ...f, defaultUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                style={{ background: "#111", border: "1px solid #222" }}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Priorité</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) as Priority }))}
                className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                style={{ background: "#111", border: "1px solid #222" }}
              >
                <option value={1}>P1 — Haute</option>
                <option value={2}>P2 — Moyenne</option>
                <option value={3}>P3 — Basse</option>
              </select>
            </div>
          </div>
        </div>
        <div className="px-5 py-3 flex justify-end gap-2" style={{ borderTop: "1px solid #1a1a1a" }}>
          <button onClick={onClose} className="text-sm px-4 py-2 rounded" style={{ background: "#1a1a1a", color: "#888" }}>Annuler</button>
          <button
            onClick={submit}
            disabled={!valid}
            className="text-sm px-4 py-2 rounded font-medium"
            style={{ background: valid ? "#00ff9d20" : "#111", color: valid ? "#00ff9d" : "#444", border: `1px solid ${valid ? "#00ff9d40" : "#222"}` }}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function StrategicPlanPanel({ canWrite = true }: { canWrite?: boolean }) {
  const [activeTab, setActiveTab] = useState<SubTab>("channels");
  const [db, setDb] = useState<DbData>({ statuses: {}, urls: {}, custom: [], hidden: [] });
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | 0>(0);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<Record<string, AiResult>>({});
  const [showAddModal, setShowAddModal] = useState(false);

  const loadDb = useCallback(async () => {
    const r = await fetch("/api/admin/strategic-plan");
    if (!r.ok) return;
    const raw = await r.json();
    if (!raw || typeof raw !== "object") return;
    // Migrate from old format { platform: status }
    if (!("statuses" in raw)) {
      const statuses: Record<string, ChannelStatus> = {};
      for (const [k, v] of Object.entries(raw)) {
        if (v === "todo" || v === "in-progress" || v === "done") statuses[k] = v as ChannelStatus;
      }
      setDb({ statuses, urls: {}, custom: [], hidden: [] });
    } else {
      setDb({ statuses: raw.statuses || {}, urls: raw.urls || {}, custom: raw.custom || [], hidden: raw.hidden || [] });
    }
  }, []);

  useEffect(() => { loadDb(); }, [loadDb]);

  const saveDb = useCallback(async (updated: DbData) => {
    await fetch("/api/admin/strategic-plan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  }, []);

  const updateStatus = (platform: string, status: ChannelStatus) => {
    if (!canWrite) return;
    const updated = { ...db, statuses: { ...db.statuses, [platform]: status } };
    setDb(updated);
    saveDb(updated);
  };

  const updateUrl = (platform: string, url: string) => {
    if (!canWrite) return;
    const updated = { ...db, urls: { ...db.urls, [platform]: url } };
    setDb(updated);
    saveDb(updated);
  };

  const addChannel = async (ch: Channel) => {
    const updated = { ...db, custom: [...(db.custom || []), ch] };
    setDb(updated);
    setShowAddModal(false);
    await saveDb(updated);
  };

  const deleteChannel = async (platform: string) => {
    const isCustom = (db.custom || []).some(c => c.platform === platform);
    let updated: DbData;
    if (isCustom) {
      updated = { ...db, custom: (db.custom || []).filter(c => c.platform !== platform) };
    } else {
      updated = { ...db, hidden: [...(db.hidden || []), platform] };
    }
    const statuses = { ...updated.statuses };
    const urls = { ...updated.urls };
    delete statuses[platform];
    delete urls[platform];
    updated = { ...updated, statuses, urls };
    setDb(updated);
    await saveDb(updated);
  };

  const generate = async (ch: Channel) => {
    setGenerating(ch.platform);
    const url = db.urls[ch.platform] || ch.defaultUrl || "";
    try {
      const r = await fetch("/api/admin/ai/strategic-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "channel",
          context: { platform: ch.platform, category: ch.category, objective: ch.objective, what: ch.what, action: ch.action, priority: ch.priority, url },
        }),
      });
      if (r.ok) {
        const result = await r.json();
        setAiResults(prev => ({ ...prev, [ch.platform]: result }));
        setExpandedChannels(prev => new Set([...prev, ch.platform]));
      }
    } finally {
      setGenerating(null);
    }
  };

  const toggleExpand = (platform: string) => {
    setExpandedChannels(prev => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform); else next.add(platform);
      return next;
    });
  };

  const allChannels: Channel[] = [
    ...CHANNELS.filter(c => !(db.hidden || []).includes(c.platform)),
    ...(db.custom || []).map(c => ({ ...c, isCustom: true })),
  ];

  const categories = Array.from(new Set(allChannels.map(c => c.category)));

  const filteredChannels = allChannels.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = !s || c.platform.toLowerCase().includes(s) || c.category.toLowerCase().includes(s) || c.objective.toLowerCase().includes(s);
    return matchSearch && (!priorityFilter || c.priority === priorityFilter) && (!categoryFilter || c.category === categoryFilter);
  });

  const done = allChannels.filter(c => db.statuses[c.platform] === "done").length;
  const inProgress = allChannels.filter(c => db.statuses[c.platform] === "in-progress").length;
  const total = allChannels.length;
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

  const SUB_TABS: { id: SubTab; label: string; icon: string }[] = [
    { id: "channels", label: "Canaux & Plateformes", icon: "◉" },
    { id: "phases", label: "Plan d'exécution", icon: "◎" },
    { id: "hashtags", label: "Hashtags", icon: "#" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Share Tech Mono', monospace" }}>STRATEGIC PLAN</h1>
          <p className="text-gray-500 text-sm mt-1">Plan de diffusion & communication EOCON 2026</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl font-black" style={{ color: progressPct >= 70 ? "#00ff9d" : progressPct >= 30 ? "#ffaa00" : "#ff0066", fontFamily: "'Share Tech Mono', monospace" }}>
            {progressPct}%
          </div>
          <div className="text-xs text-gray-500">{done} / {total} canaux activés</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-lg overflow-hidden" style={{ height: 6, background: "#1a1a1a" }}>
        <div className="h-full transition-all duration-500" style={{ width: `${progressPct}%`, background: progressPct >= 70 ? "#00ff9d" : progressPct >= 30 ? "#ffaa00" : "#ff0066" }} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Fait", value: done, color: "#00ff9d" },
          { label: "En cours", value: inProgress, color: "#ffaa00" },
          { label: "À faire", value: total - done - inProgress, color: "#555" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: "#111", border: "1px solid #1a1a1a" }}>
            <div className="text-2xl font-black mb-1" style={{ color: s.color, fontFamily: "'Share Tech Mono', monospace" }}>{s.value}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap" style={{ borderBottom: "1px solid #1a1a1a" }}>
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2.5 text-sm font-medium transition-all rounded-t-lg"
            style={{
              background: activeTab === tab.id ? "#0d0d0d" : "transparent",
              color: activeTab === tab.id ? "#00ff9d" : "#555",
              borderBottom: activeTab === tab.id ? "2px solid #00ff9d" : "2px solid transparent",
            }}
          >
            <span className="mr-1.5 opacity-70">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* ── CHANNELS ── */}
      {activeTab === "channels" && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Rechercher une plateforme..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-40 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none"
              style={{ background: "#111", border: "1px solid #222" }}
            />
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(Number(e.target.value) as Priority | 0)}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={{ background: "#111", border: "1px solid #222" }}
            >
              <option value={0}>Toutes priorités</option>
              <option value={1}>P1 — Haute</option>
              <option value={2}>P2 — Moyenne</option>
              <option value={3}>P3 — Basse</option>
            </select>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={{ background: "#111", border: "1px solid #222" }}
            >
              <option value="">Toutes catégories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {canWrite && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium shrink-0 transition-colors"
                style={{ background: "#00ff9d15", color: "#00ff9d", border: "1px solid #00ff9d30" }}
              >
                + Ajouter
              </button>
            )}
          </div>

          <div className="text-xs text-gray-600">{filteredChannels.length} canaux</div>

          <div className="space-y-2">
            {filteredChannels.map((ch, i) => (
              <ChannelCard
                key={`${ch.platform}-${i}`}
                channel={ch}
                status={db.statuses[ch.platform] as ChannelStatus || "todo"}
                url={db.urls[ch.platform] || ch.defaultUrl || ""}
                expanded={expandedChannels.has(ch.platform)}
                onToggle={() => toggleExpand(ch.platform)}
                onStatusChange={s => updateStatus(ch.platform, s)}
                onUrlSave={url => updateUrl(ch.platform, url)}
                onDelete={() => deleteChannel(ch.platform)}
                canWrite={canWrite}
                aiResult={aiResults[ch.platform]}
                onGenerate={() => generate(ch)}
                isGenerating={generating === ch.platform}
                anyGenerating={!!generating}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── PHASES ── */}
      {activeTab === "phases" && (
        <div className="space-y-3">
          {PHASES.map(ph => {
            const colors = ["#00ff9d", "#cc00ff", "#ffaa00", "#ff6600", "#00ccff", "#0066ff", "#ff0066", "#888"];
            const color = colors[ph.phase - 1];
            return (
              <div key={ph.phase} className="flex gap-4 rounded-xl p-4" style={{ background: "#111", border: `1px solid ${color}25` }}>
                <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-black text-sm" style={{ background: color + "20", color, border: `1px solid ${color}50`, fontFamily: "'Share Tech Mono', monospace" }}>
                  {ph.phase}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: color + "15", color }}>{ph.period}</span>
                    <span className="text-white font-semibold text-sm">{ph.actions}</span>
                  </div>
                  <div className="text-xs text-gray-500 flex flex-wrap gap-1">
                    {ph.platforms.split(", ").map(p => (
                      <span key={p} className="px-2 py-0.5 rounded" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>{p}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── HASHTAGS ── */}
      {activeTab === "hashtags" && (
        <div className="space-y-4">
          <div className="text-xs text-gray-500">Cliquez sur un hashtag pour le copier.</div>
          {HASHTAGS.map(grp => (
            <div key={grp.group} className="rounded-xl p-4" style={{ background: "#111", border: `1px solid ${grp.color}25` }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold" style={{ color: grp.color }}>{grp.group}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(grp.tags.join(" "))}
                  className="text-xs px-3 py-1 rounded"
                  style={{ background: grp.color + "15", color: grp.color, border: `1px solid ${grp.color}30` }}
                >
                  Copier tout
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {grp.tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => navigator.clipboard.writeText(tag)}
                    className="text-sm px-3 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95"
                    style={{ background: grp.color + "15", color: grp.color, border: `1px solid ${grp.color}30`, fontFamily: "'Share Tech Mono', monospace" }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="rounded-xl p-4" style={{ background: "#111", border: "1px solid #1a1a1a" }}>
            <button
              onClick={() => navigator.clipboard.writeText(HASHTAGS.flatMap(g => g.tags).join(" "))}
              className="text-xs px-4 py-2 rounded-lg w-full"
              style={{ background: "#00ff9d15", color: "#00ff9d", border: "1px solid #00ff9d30" }}
            >
              Copier tous les hashtags ({HASHTAGS.flatMap(g => g.tags).length})
            </button>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddChannelModal
          onAdd={addChannel}
          onClose={() => setShowAddModal(false)}
          existingCategories={categories}
        />
      )}
    </div>
  );
}
