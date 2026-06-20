"use client";
import { useState, useEffect, useCallback } from "react";

// ─── Static strategy data ───────────────────────────────────────────────────

type Priority = 1 | 2 | 3;
type ChannelStatus = "todo" | "in-progress" | "done";

interface Channel {
  category: string;
  platform: string;
  objective: string;
  what: string;
  priority: Priority;
  action: string;
}

const CHANNELS: Channel[] = [
  { category: "Site officiel", platform: "eyesopensecurity.com", objective: "Source officielle", what: "Page EOCON 2026, inscription, sponsoring, CFP, CTF", priority: 1, action: "Centraliser tous les liens ici" },
  { category: "Événementiel", platform: "Eventbrite", objective: "Billetterie + visibilité Google", what: "Annonce générale + inscription", priority: 1, action: "Créer une page EOCON 2026" },
  { category: "Événementiel", platform: "LinkedIn Events", objective: "Sponsors, speakers, décideurs", what: "Événement officiel + posts réguliers", priority: 1, action: "Créer un événement LinkedIn depuis la page EyesOpen" },
  { category: "Événementiel", platform: "Luma", objective: "Page moderne + partage rapide", what: "Page événement, side-events, meetups", priority: 1, action: "Créer une page EOCON + pages ateliers" },
  { category: "Événementiel", platform: "Meetup", objective: "Communauté locale et tech", what: "Meetup Cybersecurity Douala / Africa", priority: 2, action: "Créer un groupe ou publier via groupes existants" },
  { category: "Événementiel", platform: "10times", objective: "Annuaire international business", what: "Listing conférence", priority: 2, action: "Soumettre EOCON comme conférence internationale" },
  { category: "Événementiel", platform: "Humanitix", objective: "Billetterie alternative + impact social", what: "Page événement", priority: 3, action: "Utile si tu veux insister sur l'impact éducatif" },
  { category: "Conférences cyber", platform: "Infosec Conferences", objective: "Visibilité communauté cyber mondiale", what: "Listing EOCON", priority: 1, action: "Soumettre EOCON dans l'annuaire cyber" },
  { category: "Conférences cyber", platform: "Cybersecurity Directories", objective: "Référencement cyber", what: "Listing conférence", priority: 2, action: "Soumettre dans plusieurs annuaires" },
  { category: "Call for Speakers", platform: "Sessionize", objective: "Gestion professionnelle du CFP", what: "Appel à conférenciers", priority: 1, action: "Créer le CFP EOCON 2026" },
  { category: "Call for Speakers", platform: "Papercall.io", objective: "Speakers tech/dev/cyber", what: "CFP technique", priority: 2, action: "Publier l'appel à speakers" },
  { category: "Call for Speakers", platform: "WikiCFP", objective: "Chercheurs, universitaires", what: "CFP académique et technique", priority: 2, action: "Publier les thèmes EOCON" },
  { category: "CTF / Hacking", platform: "CTFtime", objective: "Attirer équipes CTF internationales", what: "EyesOpenCTF 2026", priority: 1, action: "Soumettre la compétition CTF" },
  { category: "CTF / Hacking", platform: "Devpost", objective: "Hackathon / challenge / compétition", what: "EyesOpenCTF ou challenge parallèle", priority: 2, action: "Créer une page compétition" },
  { category: "CTF / Hacking", platform: "Hack The Box community", objective: "Talents cyber offensifs", what: "Annonce CTF + conférence", priority: 2, action: "Demander relais communautaire" },
  { category: "CTF / Hacking", platform: "TryHackMe community", objective: "Débutants/intermédiaires cyber", what: "Annonce CTF + workshops", priority: 2, action: "Publier dans communautés pertinentes" },
  { category: "CTF / Hacking", platform: "Root-Me community", objective: "Communauté francophone cyber", what: "EyesOpenCTF + CFP", priority: 2, action: "Demander relais ou publication" },
  { category: "Réseaux pros", platform: "LinkedIn page EyesOpen", objective: "Crédibilité + sponsors + speakers", what: "Posts officiels, chiffres, sponsors, speakers", priority: 1, action: "Publier 2 à 3 fois par semaine" },
  { category: "Réseaux pros", platform: "Profils LinkedIn organisateurs", objective: "Amplification humaine", what: "Posts personnels + storytelling", priority: 1, action: "Chaque membre clé doit relayer" },
  { category: "Réseaux pros", platform: "Groupes LinkedIn cybersécurité", objective: "Audience cyber ciblée", what: "CFP, sponsor call, CTF", priority: 2, action: "Publier sans spam, avec angle expertise" },
  { category: "Réseaux sociaux", platform: "X / Twitter", objective: "Communauté infosec, CTF, bug bounty", what: "Threads, visuels, CFP, CTF", priority: 1, action: "Poster régulièrement avec hashtags cyber" },
  { category: "Réseaux sociaux", platform: "Facebook Event", objective: "Public local, étudiants, diaspora", what: "Événement officiel + rappels", priority: 1, action: "Créer l'événement Facebook" },
  { category: "Réseaux sociaux", platform: "Groupes Facebook tech/cyber Cameroun", objective: "Étudiants, développeurs, communautés locales", what: "Annonce + visuel + lien", priority: 1, action: "Publier dans groupes ciblés" },
  { category: "Réseaux sociaux", platform: "Instagram", objective: "Image de marque + désirabilité", what: "Reels, carrousels, speakers, teasers", priority: 2, action: "Publier visuels premium" },
  { category: "Réseaux sociaux", platform: "TikTok", objective: "Jeunes, étudiants, sensibilisation", what: "Vidéos courtes cyber/carrière/CTF", priority: 2, action: "Créer contenus éducatifs courts" },
  { category: "Réseaux sociaux", platform: "YouTube", objective: "Crédibilité longue durée", what: "Teaser, interviews, anciennes éditions", priority: 1, action: "Publier teaser officiel + playlist EOCON" },
  { category: "Réseaux sociaux", platform: "YouTube Shorts", objective: "Découverte rapide", what: "Extraits courts, chiffres, appels", priority: 2, action: "Recycler les vidéos longues" },
  { category: "Communautés directes", platform: "WhatsApp Channel EOCON", objective: "Diffusion massive en Afrique", what: "Annonces officielles", priority: 1, action: "Créer un canal officiel" },
  { category: "Communautés directes", platform: "Groupes WhatsApp étudiants/tech", objective: "Acquisition participants", what: "Annonce courte + visuel + lien", priority: 1, action: "Diffusion via ambassadeurs" },
  { category: "Communautés directes", platform: "Telegram Channel", objective: "Public tech/cyber", what: "Annonces, CTF, workshops", priority: 1, action: "Créer canal Telegram" },
  { category: "Communautés directes", platform: "Discord EyesOpenCTF", objective: "Animation CTF + support technique", what: "Règlement, défis, annonces, support", priority: 1, action: "Créer serveur Discord dédié" },
  { category: "Communautés directes", platform: "Discord cyber/dev existants", objective: "Recruter participants CTF", what: "Annonce CTF + CFP", priority: 2, action: "Demander autorisation aux admins" },
  { category: "Communautés cyber", platform: "OWASP Chapters", objective: "AppSec, API security, web security", what: "CFP + annonce conférence", priority: 1, action: "Contacter OWASP Cameroun/Africa/France/Montréal" },
  { category: "Communautés cyber", platform: "ISACA Chapters", objective: "GRC, audit, risque, compliance", what: "Annonce panels + sponsors", priority: 1, action: "Contacter chapitres Afrique/Canada/France" },
  { category: "Communautés cyber", platform: "ISC2 Chapters", objective: "Professionnels certifiés cyber", what: "CFP + invitation professionnels", priority: 1, action: "Demander relais officiel" },
  { category: "Communautés cyber", platform: "FIRST / CERT / CSIRT", objective: "Incident response, institutions cyber", what: "Invitation speakers + partenaires", priority: 2, action: "Contacter CERT/CSIRT africains" },
  { category: "Communautés cyber", platform: "Bug bounty communities", objective: "Hackers éthiques", what: "CTF + offensive security talks", priority: 2, action: "Publier annonce orientée challenge" },
  { category: "Communautés dev", platform: "GitHub", objective: "Développeurs, open source", what: "Repo ressources EOCON/CTF", priority: 3, action: "Créer repo public si pertinent" },
  { category: "Communautés dev", platform: "Dev.to", objective: "Développeurs et tech writers", what: "Article 'Why EOCON 2026 matters'", priority: 2, action: "Publier article en anglais" },
  { category: "Communautés dev", platform: "Hashnode", objective: "Développeurs, cloud, security", what: "Article technique / annonce", priority: 2, action: "Publier article sponsor/speaker" },
  { category: "Communautés dev", platform: "Product Hunt", objective: "Visibilité tech", what: "Page initiative / communauté", priority: 3, action: "Seulement si angle produit/plateforme" },
  { category: "Reddit", platform: "r/cybersecurity", objective: "Large public cyber", what: "Annonce non commerciale", priority: 2, action: "Respecter règles de publication" },
  { category: "Reddit", platform: "r/netsec", objective: "Public cyber avancé", what: "CFP technique uniquement", priority: 2, action: "Poster seulement si contenu technique solide" },
  { category: "Reddit", platform: "r/bugbounty", objective: "Bug bounty hunters", what: "CTF + talks offensive security", priority: 2, action: "Publier annonce CTF" },
  { category: "Reddit", platform: "r/osint", objective: "OSINT community", what: "CTF OSINT + talks OSINT", priority: 2, action: "Publier annonce ciblée" },
  { category: "Reddit", platform: "r/ReverseEngineering", objective: "Reverse engineers", what: "Challenges reverse + CFP", priority: 2, action: "Publier uniquement si contenu reverse réel" },
  { category: "Reddit", platform: "r/blueteamsec", objective: "Blue team / SOC", what: "Talks SOC, threat hunting, DFIR", priority: 2, action: "Publier angle défense" },
  { category: "Médias Afrique tech", platform: "TechCabal", objective: "Audience tech/startup africaine", what: "Communiqué de presse", priority: 2, action: "Envoyer pitch média" },
  { category: "Médias Afrique tech", platform: "Techpoint Africa", objective: "Startups, tech, Nigeria/West Africa", what: "Communiqué + angle Afrique digitale", priority: 2, action: "Envoyer pitch média" },
  { category: "Médias Afrique tech", platform: "CIO Africa", objective: "CIO, DSI, décideurs IT", what: "Annonce business/cyber", priority: 1, action: "Pitcher partenariat média" },
  { category: "Médias Afrique tech", platform: "TechAfrica News", objective: "Télécoms, digital, cyber Afrique", what: "Communiqué presse", priority: 1, action: "Pitcher angle cybersécurité Afrique" },
  { category: "Médias Afrique tech", platform: "Disrupt Africa", objective: "Startup/innovation Afrique", what: "Annonce si angle startup/sponsors", priority: 2, action: "Pitcher côté opportunités business" },
  { category: "Écosystème Afrique", platform: "Africa Tech Festival", objective: "Sponsors, décideurs, télécoms, cloud, fintech", what: "Annonce + networking", priority: 1, action: "Identifier partenaires et relais" },
  { category: "Écosystème Afrique", platform: "GITEX Africa community", objective: "Tech, startups, institutions", what: "Relais partenaires", priority: 2, action: "Cibler exposants/sponsors" },
  { category: "Écosystème Afrique", platform: "AfriLabs network", objective: "Hubs innovation africains", what: "Appel ambassadeurs/partenaires", priority: 2, action: "Contacter hubs membres" },
  { category: "Médias Cameroun", platform: "Digital Business Africa", objective: "Numérique, télécoms, cyber, Cameroun", what: "Communiqué de presse", priority: 1, action: "Média très pertinent" },
  { category: "Médias Cameroun", platform: "Investir au Cameroun", objective: "Business, économie, institutions", what: "Communiqué business", priority: 1, action: "Angle Douala + économie numérique" },
  { category: "Médias Cameroun", platform: "Business in Cameroon", objective: "Décideurs économiques", what: "Article annonce", priority: 1, action: "Pitch sponsor/business" },
  { category: "Médias Cameroun", platform: "Cameroon Tribune", objective: "Institutionnel", what: "Communiqué officiel", priority: 2, action: "Angle souveraineté numérique" },
  { category: "Médias Cameroun", platform: "Journal du Cameroun", objective: "Grand public + local", what: "Annonce événement", priority: 2, action: "Angle jeunesse/innovation" },
  { category: "Médias panafricains", platform: "Agence Ecofin", objective: "Économie, tech, institutions Afrique", what: "Communiqué de presse", priority: 1, action: "Très bon pour crédibilité" },
  { category: "Médias panafricains", platform: "CIO Mag", objective: "DSI, décideurs IT francophones", what: "Article / partenariat média", priority: 1, action: "Angle cybersécurité entreprise" },
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
  { category: "Clubs étudiants", platform: "Cisco Networking Academy", objective: "Réseau, sécurité, étudiants", what: "CTF + ateliers", priority: 1, action: "Très pertinent pour cyber/réseau" },
  { category: "Newsletters", platform: "Newsletter EyesOpen / EOCON Brief", objective: "Fidélisation audience", what: "Updates réguliers", priority: 1, action: "Lancer une newsletter officielle" },
  { category: "Newsletters", platform: "Newsletters cyber africaines", objective: "Audience spécialisée", what: "CFP + annonce", priority: 2, action: "Demander relais" },
  { category: "Newsletters", platform: "Newsletters universitaires", objective: "Étudiants, bénévoles", what: "Appel participants", priority: 1, action: "Préparer message court" },
  { category: "Institutions", platform: "ANTIC / institutions cyber Cameroun", objective: "Crédibilité institutionnelle", what: "Invitation officielle", priority: 1, action: "Demander soutien/relais" },
  { category: "Institutions", platform: "Ministères économie numérique", objective: "Institutionnel", what: "Note officielle", priority: 1, action: "Préparer courrier formel" },
  { category: "Institutions", platform: "Chambres de commerce", objective: "Sponsors, entreprises", what: "Annonce business", priority: 2, action: "Demander diffusion membre" },
  { category: "Institutions", platform: "Ambassades / missions économiques", objective: "Partenaires internationaux", what: "Invitation institutionnelle", priority: 2, action: "Cibler Canada, France, UE, USA" },
  { category: "Sponsors potentiels", platform: "Pages LinkedIn banques", objective: "Sponsors", what: "Commentaires + messages directs", priority: 1, action: "Cibler directions marketing/IT" },
  { category: "Sponsors potentiels", platform: "Pages LinkedIn télécoms", objective: "Sponsors stratégiques", what: "Sponsorship deck", priority: 1, action: "Cibler MTN, Orange, Camtel, etc." },
  { category: "Sponsors potentiels", platform: "Pages LinkedIn fintechs", objective: "Sponsors/startups", what: "Pitch business/cyber", priority: 1, action: "Cibler paiements, mobile money" },
  { category: "Sponsors potentiels", platform: "Pages LinkedIn cloud/cyber vendors", objective: "Sponsors techniques", what: "Pitch visibilité + workshop", priority: 1, action: "Cibler vendors cyber/cloud" },
];

const ANNOUNCEMENTS = [
  { title: "Annonce générale EOCON 2026", target: "Participants, grand public tech, médias", message: "La 7ème édition d'EOCON arrive à Douala", platforms: "Site, LinkedIn, Eventbrite, Facebook, Luma, médias", cta: "S'inscrire", color: "#00ff9d" },
  { title: "Call for Speakers", target: "Experts cyber, chercheurs, praticiens", message: "Partagez votre expertise et façonnez l'avenir de la cybersécurité en Afrique", platforms: "Sessionize, LinkedIn, WikiCFP, OWASP, ISACA, ISC2, X", cta: "Soumettre une conférence", color: "#cc00ff" },
  { title: "Call for Sponsors & Partners", target: "Entreprises, institutions, médias, diaspora business", message: "Associez votre marque au grand rendez-vous cyber africain", platforms: "LinkedIn, médias business, chambres de commerce, emails directs", cta: "Recevoir le sponsoring deck", color: "#ffaa00" },
  { title: "EyesOpenCTF 2026", target: "Étudiants, hackers éthiques, CTF teams", message: "48h de compétition, 40+ défis, 8 disciplines", platforms: "CTFtime, Discord, Telegram, X, Root-Me, Hack The Box, TryHackMe", cta: "S'inscrire au CTF", color: "#ff6600" },
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

const TARGETS = [
  { target: "Sponsors", angle: "Visibilité + impact + accès à talents cyber", message: "Associez votre marque à la cybersécurité africaine", channel: "LinkedIn + email direct", color: "#ffaa00" },
  { target: "Speakers", angle: "Expertise + influence + contribution continentale", message: "Partagez votre expertise avec l'écosystème cyber africain", channel: "Sessionize + LinkedIn", color: "#cc00ff" },
  { target: "Étudiants", angle: "Formation + CTF + networking + carrière", message: "Viens apprendre, pratiquer et rencontrer des experts", channel: "WhatsApp + universités", color: "#00ccff" },
  { target: "Professionnels cyber", angle: "Contenu technique + networking", message: "Conférences, ateliers et panels de haut niveau", channel: "LinkedIn + X", color: "#00ff9d" },
  { target: "Entrepreneurs", angle: "Risque cyber + opportunités business", message: "La cybersécurité est un enjeu business", channel: "LinkedIn + médias business", color: "#ff6600" },
  { target: "Diaspora", angle: "Contribution au continent + réseau", message: "Connecter la diaspora aux talents cyber africains", channel: "LinkedIn + WhatsApp", color: "#0066ff" },
  { target: "Institutions", angle: "Souveraineté numérique + sensibilisation", message: "Renforcer l'écosystème cyber africain", channel: "Courrier + médias", color: "#888" },
  { target: "Médias", angle: "Actualité tech + impact Afrique", message: "Douala accueille une conférence cyber internationale", channel: "Communiqué presse", color: "#00ccff" },
  { target: "CTF players", angle: "Challenge + réputation + compétition", message: "48h, 40+ défis, 8 disciplines", channel: "CTFtime + Discord", color: "#ff0066" },
  { target: "Bénévoles", angle: "Expérience + réseau + certificat", message: "Participe aux coulisses d'un événement international", channel: "Universités + WhatsApp", color: "#00ff9d" },
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

// ─── Helper components ───────────────────────────────────────────────────────

const PRIORITY_LABELS: Record<Priority, { label: string; color: string }> = {
  1: { label: "Haute", color: "#ff0066" },
  2: { label: "Moyenne", color: "#ffaa00" },
  3: { label: "Basse", color: "#888" },
};

const STATUS_OPTIONS: { value: ChannelStatus; label: string; color: string; icon: string }[] = [
  { value: "todo", label: "À faire", color: "#555", icon: "○" },
  { value: "in-progress", label: "En cours", color: "#ffaa00", icon: "◑" },
  { value: "done", label: "Fait", color: "#00ff9d", icon: "●" },
];

function PriorityBadge({ p }: { p: Priority }) {
  const { label, color } = PRIORITY_LABELS[p];
  return (
    <span className="text-xs px-2 py-0.5 rounded font-mono shrink-0" style={{ background: color + "20", color, fontFamily: "'Share Tech Mono', monospace" }}>
      P{p} {label}
    </span>
  );
}

function StatusSelect({ value, onChange, disabled }: { value: ChannelStatus; onChange: (v: ChannelStatus) => void; disabled?: boolean }) {
  const opt = STATUS_OPTIONS.find(o => o.value === value) || STATUS_OPTIONS[0];
  return (
    <div className="flex gap-1">
      {STATUS_OPTIONS.map(o => (
        <button
          key={o.value}
          onClick={() => !disabled && onChange(o.value)}
          title={o.label}
          className="text-xs px-2 py-1 rounded transition-all"
          style={{
            background: value === o.value ? o.color + "30" : "#1a1a1a",
            color: value === o.value ? o.color : "#555",
            border: `1px solid ${value === o.value ? o.color + "60" : "#333"}`,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          {o.icon} {o.label}
        </button>
      ))}
    </div>
  );
}

interface AiResult {
  message_fr: string;
  message_en: string;
  notes: string;
}

function AiResultPanel({ result, title, onClose }: { result: AiResult; title: string; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="w-full max-w-2xl rounded-xl overflow-hidden" style={{ background: "#0d0d0d", border: "1px solid #00ff9d40" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #1a1a1a" }}>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Contenu généré par IA</div>
            <div className="text-white font-bold text-sm">{title}</div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {[
            { key: "fr", label: "Français", content: result.message_fr },
            { key: "en", label: "English", content: result.message_en },
          ].map(({ key, label, content }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
                <button
                  onClick={() => copy(content, key)}
                  className="text-xs px-3 py-1 rounded transition-colors"
                  style={{ background: copied === key ? "#00ff9d20" : "#1a1a1a", color: copied === key ? "#00ff9d" : "#888", border: "1px solid #333" }}
                >
                  {copied === key ? "Copié !" : "Copier"}
                </button>
              </div>
              <div className="text-sm text-gray-300 whitespace-pre-wrap rounded-lg p-3" style={{ background: "#111", border: "1px solid #222" }}>
                {content}
              </div>
            </div>
          ))}
          {result.notes && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Notes & conseils</div>
              <div className="text-sm rounded-lg p-3" style={{ background: "#ffaa0010", border: "1px solid #ffaa0030", color: "#ffaa00" }}>
                {result.notes}
              </div>
            </div>
          )}
        </div>
        <div className="px-5 py-3 flex justify-end" style={{ borderTop: "1px solid #1a1a1a" }}>
          <button onClick={onClose} className="text-sm px-4 py-2 rounded" style={{ background: "#1a1a1a", color: "#888" }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

type SubTab = "channels" | "announcements" | "phases" | "targets" | "hashtags";

export default function StrategicPlanPanel({ canWrite = true }: { canWrite?: boolean }) {
  const [activeTab, setActiveTab] = useState<SubTab>("channels");
  const [statuses, setStatuses] = useState<Record<string, ChannelStatus>>({});
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | 0>(0);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiTitle, setAiTitle] = useState("");

  const loadStatuses = useCallback(async () => {
    const r = await fetch("/api/admin/strategic-plan");
    if (r.ok) setStatuses(await r.json());
  }, []);

  useEffect(() => { loadStatuses(); }, [loadStatuses]);

  const updateStatus = async (platform: string, status: ChannelStatus) => {
    if (!canWrite) return;
    setStatuses(prev => ({ ...prev, [platform]: status }));
    await fetch("/api/admin/strategic-plan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [platform]: status }),
    });
  };

  const generate = async (type: "channel" | "announcement" | "target", context: Record<string, unknown>, title: string) => {
    setGenerating(title);
    setAiResult(null);
    setAiTitle(title);
    const r = await fetch("/api/admin/ai/strategic-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, context }),
    });
    if (r.ok) setAiResult(await r.json());
    setGenerating(null);
  };

  // Progress stats
  const done = CHANNELS.filter(c => statuses[c.platform] === "done").length;
  const inProgress = CHANNELS.filter(c => statuses[c.platform] === "in-progress").length;
  const total = CHANNELS.length;
  const progressPct = Math.round((done / total) * 100);

  const categories = Array.from(new Set(CHANNELS.map(c => c.category)));

  const filteredChannels = CHANNELS.filter(c => {
    const matchSearch = !search || c.platform.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase()) || c.objective.toLowerCase().includes(search.toLowerCase());
    const matchPriority = !priorityFilter || c.priority === priorityFilter;
    const matchCat = !categoryFilter || c.category === categoryFilter;
    return matchSearch && matchPriority && matchCat;
  });

  const SUB_TABS: { id: SubTab; label: string; icon: string }[] = [
    { id: "channels", label: "Canaux & Plateformes", icon: "◉" },
    { id: "announcements", label: "4 Annonces clés", icon: "◈" },
    { id: "phases", label: "Plan d'exécution", icon: "◎" },
    { id: "targets", label: "Messages par cible", icon: "◇" },
    { id: "hashtags", label: "Hashtags", icon: "#" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            STRATEGIC PLAN
          </h1>
          <p className="text-gray-500 text-sm mt-1">Plan de diffusion & communication EOCON 2026</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl font-black font-mono" style={{ color: progressPct >= 70 ? "#00ff9d" : progressPct >= 30 ? "#ffaa00" : "#ff0066", fontFamily: "'Share Tech Mono', monospace" }}>
            {progressPct}%
          </div>
          <div className="text-xs text-gray-500">{done} / {total} canaux activés</div>
        </div>
      </div>

      {/* Global progress bar */}
      <div className="rounded-lg overflow-hidden" style={{ height: 6, background: "#1a1a1a" }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${progressPct}%`, background: progressPct >= 70 ? "#00ff9d" : progressPct >= 30 ? "#ffaa00" : "#ff0066" }}
        />
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Fait", value: done, color: "#00ff9d" },
          { label: "En cours", value: inProgress, color: "#ffaa00" },
          { label: "À faire", value: total - done - inProgress, color: "#555" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: "#111", border: "1px solid #1a1a1a" }}>
            <div className="text-2xl font-black font-mono mb-1" style={{ color: s.color, fontFamily: "'Share Tech Mono', monospace" }}>{s.value}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 flex-wrap" style={{ borderBottom: "1px solid #1a1a1a", paddingBottom: 0 }}>
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
            <span className="mr-1.5 opacity-70">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── CHANNELS TAB ── */}
      {activeTab === "channels" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Rechercher une plateforme..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-48 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none"
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
          </div>

          <div className="text-xs text-gray-600">{filteredChannels.length} canaux affichés</div>

          {/* Table */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a1a1a" }}>
            <div className="grid text-xs text-gray-500 uppercase tracking-wider px-4 py-2.5" style={{ gridTemplateColumns: "1fr 1.5fr 1fr 1fr auto", background: "#111", gap: "1rem" }}>
              <span>Plateforme</span>
              <span>Objectif</span>
              <span>Priorité</span>
              <span>Statut</span>
              <span>IA</span>
            </div>
            <div className="divide-y" style={{ borderColor: "#1a1a1a" }}>
              {filteredChannels.map((ch, i) => {
                const status = statuses[ch.platform] as ChannelStatus || "todo";
                const isGenerating = generating === ch.platform;
                return (
                  <div key={i} className="grid items-center px-4 py-3 gap-4 hover:bg-white/[0.02] transition-colors" style={{ gridTemplateColumns: "1fr 1.5fr 1fr 1fr auto" }}>
                    <div>
                      <div className="text-sm text-white font-medium leading-tight">{ch.platform}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{ch.category}</div>
                    </div>
                    <div className="text-xs text-gray-400 leading-relaxed">{ch.objective}</div>
                    <PriorityBadge p={ch.priority} />
                    <StatusSelect value={status} onChange={v => updateStatus(ch.platform, v)} disabled={!canWrite} />
                    <button
                      onClick={() => generate("channel", { platform: ch.platform, category: ch.category, objective: ch.objective, what: ch.what, action: ch.action, priority: ch.priority }, ch.platform)}
                      disabled={isGenerating || !!generating}
                      className="text-xs px-3 py-1.5 rounded font-mono transition-all shrink-0"
                      style={{
                        background: isGenerating ? "#cc00ff20" : "#1a1a1a",
                        color: isGenerating ? "#cc00ff" : "#888",
                        border: "1px solid #333",
                        cursor: isGenerating || generating ? "not-allowed" : "pointer",
                      }}
                    >
                      {isGenerating ? "..." : "IA"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── ANNOUNCEMENTS TAB ── */}
      {activeTab === "announcements" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ANNOUNCEMENTS.map((ann, i) => {
            const isGenerating = generating === ann.title;
            return (
              <div key={i} className="rounded-xl p-5 space-y-3" style={{ background: "#111", border: `1px solid ${ann.color}30` }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-base font-bold text-white leading-tight">{ann.title}</div>
                  <span className="text-xs px-2 py-0.5 rounded shrink-0" style={{ background: ann.color + "20", color: ann.color }}>Annonce {i + 1}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-600">Cible :</span> <span className="text-gray-300">{ann.target}</span></div>
                  <div className="rounded-lg p-3" style={{ background: "#0a0a0a", border: `1px solid ${ann.color}20` }}>
                    <div className="text-xs text-gray-500 mb-1">Message central</div>
                    <div className="text-white font-medium italic">"{ann.message}"</div>
                  </div>
                  <div><span className="text-gray-600">Plateformes :</span> <span className="text-gray-400 text-xs">{ann.platforms}</span></div>
                  <div><span className="text-gray-600">CTA :</span> <span className="font-mono text-xs" style={{ color: ann.color }}>{ann.cta}</span></div>
                </div>
                <button
                  onClick={() => generate("announcement", { title: ann.title, target: ann.target, message: ann.message, platforms: ann.platforms, cta: ann.cta }, ann.title)}
                  disabled={isGenerating || !!generating}
                  className="w-full py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: isGenerating ? ann.color + "20" : "#0a0a0a",
                    color: isGenerating ? ann.color : "#888",
                    border: `1px solid ${isGenerating ? ann.color + "50" : "#333"}`,
                    cursor: isGenerating || generating ? "not-allowed" : "pointer",
                  }}
                >
                  {isGenerating ? "Génération en cours..." : "Générer le contenu avec l'IA"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PHASES TAB ── */}
      {activeTab === "phases" && (
        <div className="space-y-3">
          {PHASES.map((ph) => {
            const colors = ["#00ff9d", "#cc00ff", "#ffaa00", "#ff6600", "#00ccff", "#0066ff", "#ff0066", "#888"];
            const color = colors[ph.phase - 1];
            return (
              <div key={ph.phase} className="flex gap-4 rounded-xl p-4" style={{ background: "#111", border: `1px solid ${color}25` }}>
                <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-black font-mono text-sm" style={{ background: color + "20", color, border: `1px solid ${color}50` }}>
                  {ph.phase}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
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

      {/* ── TARGETS TAB ── */}
      {activeTab === "targets" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TARGETS.map((tgt, i) => {
            const isGenerating = generating === tgt.target;
            return (
              <div key={i} className="rounded-xl p-4 space-y-3" style={{ background: "#111", border: `1px solid ${tgt.color}25` }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: tgt.color }} />
                  <span className="text-white font-bold">{tgt.target}</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div><span className="text-gray-600 text-xs">Angle :</span> <span className="text-gray-300 text-xs">{tgt.angle}</span></div>
                  <div className="rounded-lg px-3 py-2" style={{ background: tgt.color + "10", border: `1px solid ${tgt.color}20` }}>
                    <span className="text-xs font-medium" style={{ color: tgt.color }}>"{tgt.message}"</span>
                  </div>
                  <div><span className="text-gray-600 text-xs">Canal :</span> <span className="text-gray-400 text-xs">{tgt.channel}</span></div>
                </div>
                <button
                  onClick={() => generate("target", { target: tgt.target, angle: tgt.angle, message: tgt.message, channel: tgt.channel }, tgt.target)}
                  disabled={isGenerating || !!generating}
                  className="w-full py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: isGenerating ? tgt.color + "20" : "#0a0a0a",
                    color: isGenerating ? tgt.color : "#666",
                    border: `1px solid ${isGenerating ? tgt.color + "50" : "#333"}`,
                    cursor: isGenerating || generating ? "not-allowed" : "pointer",
                  }}
                >
                  {isGenerating ? "Génération en cours..." : "Générer message IA"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── HASHTAGS TAB ── */}
      {activeTab === "hashtags" && (
        <div className="space-y-4">
          <div className="text-xs text-gray-500">Cliquez sur un hashtag pour le copier. Cliquez sur le groupe pour copier tous les hashtags.</div>
          {HASHTAGS.map(grp => {
            const allTags = grp.tags.join(" ");
            return (
              <div key={grp.group} className="rounded-xl p-4" style={{ background: "#111", border: `1px solid ${grp.color}25` }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold" style={{ color: grp.color }}>{grp.group}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(allTags); }}
                    className="text-xs px-3 py-1 rounded transition-colors"
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
                      className="text-sm px-3 py-1.5 rounded-lg font-mono transition-all hover:scale-105 active:scale-95"
                      style={{
                        background: grp.color + "15",
                        color: grp.color,
                        border: `1px solid ${grp.color}30`,
                        fontFamily: "'Share Tech Mono', monospace",
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="rounded-xl p-4" style={{ background: "#111", border: "1px solid #1a1a1a" }}>
            <div className="text-sm text-gray-500 mb-3">Tous les hashtags combinés</div>
            <button
              onClick={() => navigator.clipboard.writeText(HASHTAGS.flatMap(g => g.tags).join(" "))}
              className="text-xs px-4 py-2 rounded-lg w-full transition-colors"
              style={{ background: "#00ff9d15", color: "#00ff9d", border: "1px solid #00ff9d30" }}
            >
              Copier tous les hashtags ({HASHTAGS.flatMap(g => g.tags).length} hashtags)
            </button>
          </div>
        </div>
      )}

      {/* AI Result Modal */}
      {aiResult && (
        <AiResultPanel result={aiResult} title={aiTitle} onClose={() => setAiResult(null)} />
      )}
    </div>
  );
}
