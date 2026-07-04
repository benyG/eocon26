import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Domains/patterns that are almost certainly not real contact emails
const NOISE = [
  "sentry.io", "example.com", "example.org", "wixpress.com", "squarespace.com",
  "wordpress.com", "schema.org", "w3.org", "domain.com", "@2x", ".png", ".jpg",
  ".svg", ".gif", ".webp", "noreply", "no-reply", "donotreply", "mailer-daemon",
  "postmaster", "webmaster@localhost",
];

function isNoise(email: string) {
  const low = email.toLowerCase();
  return NOISE.some(n => low.includes(n));
}

function extractEmails(html: string): string[] {
  const found = new Set<string>();

  // Prefer mailto: links — most reliable signal
  const mailtoRe = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g;
  let m: RegExpExecArray | null;
  while ((m = mailtoRe.exec(html)) !== null) {
    const e = m[1].toLowerCase();
    if (!isNoise(e)) found.add(e);
  }

  // Also scan plain text (catches obfuscated-but-visible addresses)
  const plain = html.replace(/<[^>]+>/g, " ");
  while ((m = EMAIL_RE.exec(plain)) !== null) {
    const e = m[0].toLowerCase();
    if (!isNoise(e)) found.add(e);
  }

  return Array.from(found);
}

async function fetchPage(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; EOCON-Prospect-Scraper/1.0; +https://eyesopensecurity.com)",
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (!res.ok) return "";
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("text/plain")) return "";
    return await res.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

function contactPaths(base: string): string[] {
  const b = base.replace(/\/$/, "");
  return [
    `${b}/contact`,
    `${b}/contactez-nous`,
    `${b}/nous-joindre`,
    `${b}/contact-us`,
    `${b}/nous-contacter`,
    `${b}/about`,
    `${b}/a-propos`,
  ];
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("logistics", "write")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { prospectId } = await req.json();
  if (!prospectId) return NextResponse.json({ error: "prospectId required" }, { status: 400 });

  const prospect = await prisma.logisticsProspect.findUnique({ where: { id: Number(prospectId) } });
  if (!prospect) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!prospect.website) return NextResponse.json({ error: "No website on this prospect" }, { status: 400 });

  const base = prospect.website.startsWith("http") ? prospect.website : `https://${prospect.website}`;

  // Scrape main page first
  const emailSet = new Set<string>();
  const mainHtml = await fetchPage(base);
  for (const e of extractEmails(mainHtml)) emailSet.add(e);

  // If nothing found yet, probe contact pages in parallel
  if (emailSet.size === 0) {
    const pages = await Promise.all(contactPaths(base).map(fetchPage));
    for (const html of pages) {
      for (const e of extractEmails(html)) emailSet.add(e);
      if (emailSet.size >= 5) break; // plenty
    }
  }

  const found = Array.from(emailSet).slice(0, 10);

  // Auto-fill if the prospect has no email yet
  let updated = false;
  if (found.length > 0 && !prospect.email) {
    await prisma.logisticsProspect.update({
      where: { id: prospect.id },
      data: { email: found[0] },
    });
    updated = true;
  }

  return NextResponse.json({ found, autoFilled: updated, autoFilledEmail: updated ? found[0] : null });
}
