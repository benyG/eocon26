import { prisma } from "@/lib/db";

// Granular audience filter persisted as JSON on Campaign.segment.
// `audience` picks the base pool; the remaining keys further narrow it and only
// apply to the "registrations" pool (the others have no such attributes).
export interface CampaignSegment {
  audience: "registrations" | "newsletter" | "cfp_accepted" | "volunteers";
  // registrations-only granular filters (empty/undefined = no constraint):
  statuses?: string[];     // registration.status (pending | paid | …)
  ticketTypes?: string[];  // registration.ticketType
  countries?: string[];    // registration.country
  langs?: string[];        // registration.langExpression (fr | en)
  hasCtf?: boolean;        // true = only CTF competitors, false = only non-CTF
  checkedIn?: boolean;     // true = only checked-in, false = only not-checked-in
}

export interface Recipient {
  email: string;
  fname?: string;
  lname?: string;
  org?: string | null;
  country?: string | null;
  ticketType?: string | null;
}

export function parseSegment(raw: string | null | undefined): CampaignSegment {
  if (!raw) return { audience: "registrations" };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.audience) return parsed as CampaignSegment;
  } catch { /* fall through */ }
  // Backward compatibility with the old single-string segment format.
  const legacy = String(raw);
  if (legacy === "newsletter") return { audience: "newsletter" };
  if (legacy === "cfp_accepted") return { audience: "cfp_accepted" };
  if (legacy === "volunteers") return { audience: "volunteers" };
  return { audience: "registrations" };
}

// Resolve a segment to a de-duplicated recipient list.
export async function resolveRecipients(seg: CampaignSegment): Promise<Recipient[]> {
  if (seg.audience === "newsletter") {
    const subs = await prisma.newsletterSubscriber.findMany({ select: { email: true } });
    return dedupe(subs.map(s => ({ email: s.email })));
  }
  if (seg.audience === "cfp_accepted") {
    const cfps = await prisma.cFPSubmission.findMany({ where: { status: "accepted" }, select: { email: true, name: true } });
    return dedupe(cfps.map(c => ({ email: c.email, fname: c.name || undefined })));
  }
  if (seg.audience === "volunteers") {
    const vols = await prisma.volunteerApplication.findMany({ where: { status: "accepted" }, select: { email: true, name: true } });
    return dedupe(vols.map(v => ({ email: v.email, fname: v.name || undefined })));
  }

  // registrations + granular filters
  const where: Record<string, unknown> = {};
  if (seg.statuses?.length) where.status = { in: seg.statuses };
  if (seg.ticketTypes?.length) where.ticketType = { in: seg.ticketTypes };
  if (seg.countries?.length) where.country = { in: seg.countries };
  if (seg.langs?.length) where.langExpression = { in: seg.langs };
  if (seg.checkedIn === true) where.checkedInAt = { not: null };
  if (seg.checkedIn === false) where.checkedInAt = null;
  if (seg.hasCtf === true) where.ctfCompetitorName = { not: null };
  if (seg.hasCtf === false) where.ctfCompetitorName = null;

  const regs = await prisma.registration.findMany({
    where,
    select: { email: true, fname: true, lname: true, org: true, country: true, ticketType: true },
  });
  return dedupe(regs.map(r => ({
    email: r.email, fname: r.fname, lname: r.lname, org: r.org, country: r.country, ticketType: r.ticketType,
  })));
}

function dedupe(list: Recipient[]): Recipient[] {
  const seen = new Set<string>();
  const out: Recipient[] = [];
  for (const r of list) {
    const key = r.email?.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

// Replace {{fname}}, {{lname}}, {{email}}, {{org}}, {{country}}, {{ticketType}}.
// Unknown placeholders are left untouched; missing values become "".
export function personalize(html: string, r: Recipient): string {
  return html.replace(/\{\{\s*(fname|lname|email|org|country|ticketType)\s*\}\}/g, (_m, key: string) => {
    const v = (r as unknown as Record<string, unknown>)[key];
    return v == null ? "" : String(v);
  });
}

// Distinct values available for building the filter UI.
export async function audienceFacets() {
  const regs = await prisma.registration.findMany({
    select: { status: true, ticketType: true, country: true, langExpression: true },
  });
  const uniq = (arr: (string | null)[]) =>
    Array.from(new Set(arr.filter((v): v is string => !!v))).sort();
  return {
    statuses: uniq(regs.map(r => r.status)),
    ticketTypes: uniq(regs.map(r => r.ticketType)),
    countries: uniq(regs.map(r => r.country)),
    langs: uniq(regs.map(r => r.langExpression)),
    total: regs.length,
  };
}
