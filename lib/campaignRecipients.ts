import { prisma } from "@/lib/db";

// Granular audience filter persisted as JSON on Campaign.segment.
// `audience` picks the base pool; the remaining keys further narrow it and only
// apply to the "registrations" pool (the others have no such attributes).
export interface CampaignSegment {
  audience: "registrations" | "newsletter" | "cfp_accepted" | "cfp_onboarding" | "cfp_confirmed" | "cfp_scheduled" | "volunteers";
  // registrations-only granular filters (empty/undefined = no constraint):
  statuses?: string[];     // registration.status (pending | paid | …)
  ticketTypes?: string[];  // registration.ticketType
  countries?: string[];    // registration.country
  langs?: string[];        // registration.langExpression (fr | en)
  hasCtf?: boolean;        // true = only CTF competitors, false = only non-CTF
  checkedIn?: boolean;     // true = only checked-in, false = only not-checked-in
  roles?: string[];        // volunteers-only filter by role/affectation
}

export interface Recipient {
  email: string;
  fname?: string;
  lname?: string;
  org?: string | null;
  country?: string | null;
  ticketType?: string | null;
  talkTitle?: string | null; // speaker's talk title (cfp_* audiences)
  // Programmed-session details (cfp_scheduled audience) — auto-filled in the speaker
  // "Programmé" template via {{date}} {{time}} {{endTime}} {{mode}} {{zoomLink}} {{slidesDeadline}}.
  date?: string | null;
  time?: string | null;
  endTime?: string | null;
  mode?: string | null;
  zoomLink?: string | null;
  slidesDeadline?: string | null;
  lang?: "fr" | "en"; // recipient's preferred language (drives FR/EN content)
}

// Normalize any stored language value to "fr" | "en" (default fr).
function normLang(v: string | null | undefined): "fr" | "en" {
  return String(v || "").toLowerCase().startsWith("en") ? "en" : "fr";
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
  if (legacy === "cfp_onboarding" || legacy === "cfp_confirmed" || legacy === "cfp_scheduled") return { audience: legacy };
  if (legacy === "volunteers") return { audience: "volunteers" };
  return { audience: "registrations" };
}

// Resolve a segment to a de-duplicated recipient list.
export async function resolveRecipients(seg: CampaignSegment): Promise<Recipient[]> {
  if (seg.audience === "newsletter") {
    const subs = await prisma.newsletterSubscriber.findMany({ select: { email: true } });
    return dedupe(subs.map(s => ({ email: s.email })));
  }
  // Speaker (CFP) pools — share the same shape, differ only by pipeline stage.
  // NB: the distinguishing field is `pipelineStage` (the `status` column stays
  // "accepted" for onboarding/confirmed/scheduled). talkTitle is exposed so
  // {{talkTitle}} can be auto-personalized in speaker emails.
  const cfpStage: Record<string, string> = {
    cfp_accepted: "accepted",
    cfp_onboarding: "onboarding",
    cfp_confirmed: "confirmed",
    cfp_scheduled: "scheduled",
  };
  if (cfpStage[seg.audience]) {
    const cfps = await prisma.cFPSubmission.findMany({
      where: { pipelineStage: cfpStage[seg.audience] },
      select: { email: true, name: true, talkTitle: true, langPresentation: true, speakerId: true },
    });

    // For scheduled speakers, pull the programmed session details so the
    // "Programmé" template can auto-fill {{date}} {{time}} {{mode}} {{zoomLink}} {{slidesDeadline}}.
    let sessionsBySpeaker = new Map<number, { date: string | null; time: string; endTime: string | null; mode: string | null; zoomLink: string | null; slidesDeadline: string | null }>();
    if (seg.audience === "cfp_scheduled") {
      const speakerIds = cfps.map(c => c.speakerId).filter((v): v is number => v != null);
      if (speakerIds.length) {
        const sessions = await prisma.conferenceSession.findMany({
          where: { speakerId: { in: speakerIds }, date: { not: null } },
          select: { speakerId: true, date: true, time: true, endTime: true, mode: true, zoomLink: true, slidesDeadline: true },
        });
        sessionsBySpeaker = new Map(sessions.filter(s => s.speakerId != null).map(s => [s.speakerId as number, s]));
      }
    }

    return dedupe(cfps.map(c => {
      const sess = c.speakerId != null ? sessionsBySpeaker.get(c.speakerId) : undefined;
      return {
        email: c.email,
        fname: c.name || undefined,
        talkTitle: c.talkTitle,
        lang: normLang(c.langPresentation),
        date: sess?.date ?? null,
        time: sess?.time ?? null,
        endTime: sess?.endTime ?? null,
        mode: sess?.mode ?? null,
        zoomLink: sess?.zoomLink ?? null,
        slidesDeadline: sess?.slidesDeadline ?? null,
      };
    }));
  }
  if (seg.audience === "volunteers") {
    const where: Record<string, unknown> = { status: "accepted" };
    if (seg.roles?.length) where.role = { in: seg.roles };
    const vols = await prisma.volunteerApplication.findMany({ where, select: { email: true, name: true, langExpression: true } });
    return dedupe(vols.map(v => ({ email: v.email, fname: v.name || undefined, lang: normLang(v.langExpression) })));
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
    select: { email: true, fname: true, lname: true, org: true, country: true, ticketType: true, langExpression: true },
  });
  return dedupe(regs.map(r => ({
    email: r.email, fname: r.fname, lname: r.lname, org: r.org, country: r.country, ticketType: r.ticketType, lang: normLang(r.langExpression),
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

// Bilingual content snapshot carried by a campaign (FR primary, EN optional).
export interface BilingualContent {
  subject: string;
  htmlBody: string;
  subjectEn?: string | null;
  htmlBodyEn?: string | null;
}

// Pick the subject/body matching the recipient's language. Falls back to FR when
// the EN version is missing so a recipient is never left without content.
export function pickContent(c: BilingualContent, lang: "fr" | "en" | undefined): { subject: string; htmlBody: string; lang: "fr" | "en" } {
  if (lang === "en" && c.subjectEn && c.htmlBodyEn) {
    return { subject: c.subjectEn, htmlBody: c.htmlBodyEn, lang: "en" };
  }
  return { subject: c.subject, htmlBody: c.htmlBody, lang: "fr" };
}

// Replace {{fname}}, {{lname}}, {{email}}, {{org}}, {{country}}, {{ticketType}},
// {{talkTitle}}, and the programmed-session tokens {{date}} {{time}} {{endTime}}
// {{mode}} {{zoomLink}} {{slidesDeadline}}.
// Unknown placeholders are left untouched; missing values become "".
export function personalize(html: string, r: Recipient): string {
  return html.replace(/\{\{\s*(fname|lname|email|org|country|ticketType|talkTitle|date|time|endTime|mode|zoomLink|slidesDeadline)\s*\}\}/g, (_m, key: string) => {
    const v = (r as unknown as Record<string, unknown>)[key];
    return v == null ? "" : String(v);
  });
}

// Resolve the FR/EN content snapshot for a campaign. When a templateId is given,
// pull the four bilingual fields from the template; otherwise fall back to any
// raw subject/htmlBody passed in (manual/legacy path).
export async function templateSnapshot(
  templateId: number | null | undefined,
  fallback: { subject?: string; htmlBody?: string },
): Promise<{ subject: string; htmlBody: string; subjectEn: string | null; htmlBodyEn: string | null }> {
  if (templateId) {
    const tpl = await prisma.emailTemplate.findUnique({ where: { id: templateId } });
    if (tpl) {
      return {
        subject: tpl.subject,
        htmlBody: tpl.htmlBody,
        subjectEn: tpl.subjectEn ?? null,
        htmlBodyEn: tpl.htmlBodyEn ?? null,
      };
    }
  }
  return {
    subject: (fallback.subject || "").trim(),
    htmlBody: fallback.htmlBody || "",
    subjectEn: null,
    htmlBodyEn: null,
  };
}

// Map a campaign segment to the appropriate reply-to address.
export function getReplyTo(seg: CampaignSegment): string | undefined {
  const a = seg.audience;
  if (a === "cfp_accepted" || a === "cfp_onboarding" || a === "cfp_confirmed" || a === "cfp_scheduled") {
    return "speakers@eyesopensecurity.com";
  }
  if (seg.hasCtf === true) {
    return "ctf@eyesopensecurity.com";
  }
  if (a === "registrations" || a === "volunteers") {
    return "registration@eyesopensecurity.com";
  }
  return undefined;
}

// Distinct values available for building the filter UI.
export async function audienceFacets() {
  const regs = await prisma.registration.findMany({
    select: { status: true, ticketType: true, country: true, langExpression: true },
  });
  const vols = await prisma.volunteerApplication.findMany({ where: { status: "accepted" }, select: { role: true } });
  const uniq = (arr: (string | null)[]) =>
    Array.from(new Set(arr.filter((v): v is string => !!v))).sort();
  return {
    statuses: uniq(regs.map(r => r.status)),
    ticketTypes: uniq(regs.map(r => r.ticketType)),
    countries: uniq(regs.map(r => r.country)),
    langs: uniq(regs.map(r => r.langExpression)),
    volunteerRoles: uniq(vols.map(v => v.role)),
    total: regs.length,
  };
}
