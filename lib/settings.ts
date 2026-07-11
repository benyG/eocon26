import { prisma } from "@/lib/db";

let _cache: Record<string, string> | null = null;
let _cacheTime = 0;

export async function getEventSettings(): Promise<Record<string, string>> {
  // Cache for 60 seconds
  if (_cache && Date.now() - _cacheTime < 60_000) return _cache;
  const settings = await prisma.eventSetting.findMany();
  const map: Record<string, string> = {};
  settings.forEach((s: { key: string; value: string }) => { map[s.key] = s.value; });
  _cache = map;
  _cacheTime = Date.now();
  return map;
}

export function getCtaForContentType(type: string, settings: Record<string, string>, axis?: string): { text: string; textEn: string; url: string } | null {
  const base = settings.site_base_url || "https://eyesopensecurity.com";
  // Workshop on the "opportunity" axis = a call to trainers to host a paid
  // workshop, so the CTA invites them to propose one rather than to attend.
  if (type === "workshop" && axis === "opportunity") {
    return { text: "Proposer un workshop →", textEn: "Host a workshop →", url: settings.url_sponsor || `${base}/#contact` };
  }
  const ctaMap: Record<string, { text: string; textEn: string; url: string }> = {
    speaker:      { text: "Voir le programme →",        textEn: "View the programme →",      url: settings.url_programme  || `${base}/#programme` },
    session:      { text: "Voir le programme →",        textEn: "View the programme →",      url: settings.url_programme  || `${base}/#programme` },
    workshop:     { text: "S'inscrire maintenant →",    textEn: "Register now →",             url: settings.url_inscription || `${base}/#inscription` },
    inscriptions: { text: "S'inscrire à EOCON 2026 →", textEn: "Register for EOCON 2026 →", url: settings.url_inscription || `${base}/#inscription` },
    cfp:          { text: "Soumettre mon talk →",       textEn: "Submit my talk →",           url: settings.url_cfp       || `${base}/#cfp` },
    ctf:          { text: "Rejoindre l'EyesOpenCTF →", textEn: "Join EyesOpenCTF →",         url: settings.url_ctf       || `${base}/#ctf` },
    countdown:    { text: "S'inscrire →",               textEn: "Register →",                 url: settings.url_inscription || `${base}/#inscription` },
    sponsor:      { text: "Devenir partenaire →",       textEn: "Become a partner →",         url: settings.url_sponsor   || `${base}/#sponsors` },
    custom: null as unknown as { text: string; textEn: string; url: string },
  };
  return ctaMap[type] || null;
}
