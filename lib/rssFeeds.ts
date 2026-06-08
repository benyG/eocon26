export type RssFeedCategory = "mondial" | "francophone" | "africain" | "threat_intel" | "bonus";

export interface RssFeed {
  id: string;
  name: string;
  url: string;
  category: RssFeedCategory;
  description: string;
}

export const RSS_FEEDS: RssFeed[] = [
  // Mondial
  {
    id: "krebs",
    name: "Krebs on Security",
    url: "https://krebsonsecurity.com/feed/",
    category: "mondial",
    description: "Investigations cybercrime & sécurité",
  },
  {
    id: "hackernews",
    name: "The Hacker News",
    url: "https://feeds.feedburner.com/TheHackersNews",
    category: "mondial",
    description: "Actualités cyber quotidiennes",
  },
  {
    id: "darkreading",
    name: "Dark Reading",
    url: "https://www.darkreading.com/rss/all.xml",
    category: "mondial",
    description: "Tendances CISO & sécurité entreprise",
  },
  // Francophone
  {
    id: "lemonde_info",
    name: "Le Monde Informatique",
    url: "https://www.lemondeinformatique.fr/flux-rss/thematique/securite/rss.xml",
    category: "francophone",
    description: "Sécurité informatique en français",
  },
  // Africain
  {
    id: "itnewsafrica",
    name: "IT News Africa",
    url: "https://www.itnewsafrica.com/feed/",
    category: "africain",
    description: "Tech & cyber sur le continent africain",
  },
  {
    id: "ciomag",
    name: "CIO Mag Africa",
    url: "https://www.cio-mag.com/feed/",
    category: "africain",
    description: "DSI, transformation digitale Afrique",
  },
  {
    id: "jeuneafrique",
    name: "Jeune Afrique",
    url: "https://www.jeuneafrique.com/feed/",
    category: "africain",
    description: "Économie, tech & cyber africaine",
  },
  {
    id: "africacyber",
    name: "Africa Cybersecurity Mag",
    url: "https://africacybersecuritymagazine.com/feed/",
    category: "africain",
    description: "Sécurité numérique en Afrique",
  },
  // Threat intel
  {
    id: "mandiant",
    name: "Mandiant Blog",
    url: "https://www.mandiant.com/resources/blog/rss.xml",
    category: "threat_intel",
    description: "APT, incidents & géopolitique cyber",
  },
  {
    id: "sans_isc",
    name: "SANS Internet Storm Center",
    url: "https://isc.sans.edu/rssfeed_full.xml",
    category: "threat_intel",
    description: "Diary quotidien & analyses techniques",
  },
  // Bonus
  {
    id: "hibp",
    name: "Have I Been Pwned",
    url: "https://feeds.feedburner.com/HaveIBeenPwnedLatestBreaches",
    category: "bonus",
    description: "Annonces de fuites de données",
  },
];

export const CATEGORY_LABELS: Record<RssFeedCategory, string> = {
  mondial: "Mondial",
  francophone: "Francophone",
  africain: "Afrique",
  threat_intel: "Threat Intel",
  bonus: "Bonus",
};

export const CATEGORY_COLORS: Record<RssFeedCategory, string> = {
  mondial: "#00ff9d",
  francophone: "#0066ff",
  africain: "#ff9900",
  threat_intel: "#ff0066",
  bonus: "#cc00ff",
};
