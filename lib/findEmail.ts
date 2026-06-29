// Email discovery: Hunter.io first, web scraping fallback.

export interface FoundEmail {
  email: string;
  name?: string;
  title?: string;
  source: "hunter" | "scrape";
  confidence?: number; // 0-100, Hunter score
}

// Extract the registrable domain from a URL (e.g. "https://www.acme.fr/contact" → "acme.fr")
function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    // Remove leading "www."
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

// Email regex — deliberately permissive to catch obfuscated formats too
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Addresses to ignore when scraping
const IGNORE_PREFIXES = ["noreply", "no-reply", "donotreply", "mailer", "bounce", "postmaster", "webmaster", "support", "info", "contact", "hello", "admin", "team"];

function isGeneric(email: string): boolean {
  const local = email.split("@")[0].toLowerCase();
  return IGNORE_PREFIXES.some(p => local === p);
}

// Fetch a URL and return text, silently returning "" on error
async function safeFetch(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EOCON-bot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

// ── Hunter.io ────────────────────────────────────────────────────────────────

interface HunterResult {
  data?: {
    emails?: Array<{
      value: string;
      first_name?: string;
      last_name?: string;
      position?: string;
      confidence: number;
    }>;
  };
  errors?: Array<{ details: string }>;
}

async function tryHunter(domain: string): Promise<FoundEmail[]> {
  const key = process.env.HUNTER_API_KEY;
  if (!key) return [];
  try {
    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${key}&limit=10`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const json = (await res.json()) as HunterResult;
    const entries = json.data?.emails ?? [];
    return entries
      .filter(e => e.value && e.confidence >= 50)
      .sort((a, b) => b.confidence - a.confidence)
      .map(e => ({
        email: e.value,
        name: [e.first_name, e.last_name].filter(Boolean).join(" ") || undefined,
        title: e.position || undefined,
        source: "hunter" as const,
        confidence: e.confidence,
      }));
  } catch {
    return [];
  }
}

// ── Web scraping fallback ─────────────────────────────────────────────────────

async function tryScrape(websiteUrl: string, domain: string): Promise<FoundEmail[]> {
  const base = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
  const contactPaths = ["/contact", "/contact-us", "/nous-contacter", "/about", "/equipe", "/team", "/a-propos"];

  const pages = await Promise.all([
    safeFetch(base),
    ...contactPaths.map(p => safeFetch(`https://${domain}${p}`)),
  ]);

  const allText = pages.join(" ");
  // Also decode HTML entities: &#64; → @, [at] → @, (at) → @
  const decoded = allText
    .replace(/&#64;/g, "@")
    .replace(/\[at\]/gi, "@")
    .replace(/\(at\)/gi, "@")
    .replace(/\s+at\s+/gi, "@");

  const found = new Map<string, FoundEmail>();
  for (const match of Array.from(decoded.matchAll(EMAIL_RE))) {
    const email = match[0].toLowerCase();
    if (!email.includes(domain)) continue; // only emails on this domain
    if (isGeneric(email)) continue;
    if (!found.has(email)) {
      found.set(email, { email, source: "scrape" });
    }
  }

  // If nothing domain-specific, widen to non-generic emails from any domain
  if (found.size === 0) {
    for (const match of Array.from(decoded.matchAll(EMAIL_RE))) {
      const email = match[0].toLowerCase();
      if (isGeneric(email)) continue;
      if (!found.has(email)) {
        found.set(email, { email, source: "scrape" });
      }
    }
  }

  return Array.from(found.values()).slice(0, 5);
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function findProspectEmails(websiteUrl: string): Promise<FoundEmail[]> {
  const domain = extractDomain(websiteUrl);

  // Try Hunter.io first
  const hunterResults = await tryHunter(domain);
  if (hunterResults.length > 0) return hunterResults;

  // Fallback: scrape the website
  return tryScrape(websiteUrl, domain);
}
