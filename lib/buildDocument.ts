import { prisma } from "@/lib/db";
import { getEventSettings } from "@/lib/settings";
import { getSponsorDeadlines } from "@/lib/sponsorBilling";
import { getIssuerEntity } from "@/lib/documentEntities";
import { DOC_TYPES, DEFAULT_TEMPLATES, fillTemplate, docType } from "@/lib/documentTemplates";
import { renderBrandedDoc, renderPricingPdf, type PerkLine, type PricingPkg } from "@/lib/docPdf";
import { buildInvoicePdf } from "@/lib/invoicePdf";

export interface BuiltDoc {
  buffer: Buffer;
  filename: string;
  docNumber: string;
  recipientName: string;
  recipientEmail: string | null;
}

const fcfa = (n: number, lang: "fr" | "en") => n > 0 ? `${Math.round(n).toLocaleString("fr-FR")} FCFA` : (lang === "en" ? "to be agreed" : "à convenir");
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "doc";
const parseJson = (s?: string | null): string[] => { try { const v = JSON.parse(s || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };

interface Ctx {
  name: string; website: string; email: string | null; tier: string;
  amount: number; perks: PerkLine[]; sector: string; contact: string;
}

async function sponsorCtx(sponsorId: number): Promise<Ctx | null> {
  const sp = await prisma.sponsor.findUnique({ where: { id: sponsorId }, include: { perks: { orderBy: { sortOrder: "asc" } }, budgetItems: true } });
  if (!sp) return null;
  const revenue = sp.budgetItems.find(b => b.category === "revenue");
  return {
    name: sp.name, website: sp.website || "", email: sp.email, tier: sp.tier,
    amount: sp.dealAmount ?? revenue?.planned ?? 0,
    perks: sp.perks.map(p => ({ labelFr: p.labelFr, labelEn: p.labelEn, quantity: p.quantity })),
    sector: "", contact: "",
  };
}

async function prospectCtx(prospectId: number): Promise<Ctx | null> {
  const pr = await prisma.sponsorProspect.findUnique({ where: { id: prospectId } });
  if (!pr) return null;
  const tier = (pr.package || "").toUpperCase();
  const pkg = tier ? await prisma.sponsorPackage.findFirst({ where: { tier }, include: { packagePerks: { include: { perk: true }, orderBy: { sortOrder: "asc" } } } }) : null;
  return {
    name: pr.org, website: pr.website || "", email: pr.email, tier: pr.package || "",
    amount: pkg?.price ?? 0,
    perks: (pkg?.packagePerks || []).map(pp => ({ labelFr: pp.perk.labelFr, labelEn: pp.perk.labelEn, quantity: pp.quantity })),
    sector: "", contact: pr.contact || "",
  };
}

// Build any journey document. Throws on invalid target so callers can 400.
export async function buildDocument(opts: { type: string; sponsorId?: number; prospectId?: number; lang: "fr" | "en" }): Promise<BuiltDoc> {
  const dt = docType(opts.type);
  if (!dt) throw new Error("Unknown document type");
  const lang = opts.lang;

  // ── Pricing sheet (no target) ──
  if (dt.kind === "pricing") {
    const entity = await getIssuerEntity();
    const pkgs = await prisma.sponsorPackage.findMany({ where: { isVisible: true }, orderBy: { sortOrder: "asc" } });
    const pricing: PricingPkg[] = pkgs.map(p => ({
      tier: p.tier, nameFr: p.nameFr, nameEn: p.nameEn, price: p.price, maxSponsors: p.maxSponsors,
      highlightColor: p.highlightColor, perksFr: parseJson(p.perksFr), perksEn: parseJson(p.perksEn),
    }));
    const docNumber = `EOC-PRICING-2026`;
    const buffer = await renderPricingPdf(entity, pricing, lang, docNumber);
    return { buffer, filename: `grille-tarifaire-eocon2026-${lang}.pdf`, docNumber, recipientName: "", recipientEmail: null };
  }

  // ── Proforma / Invoice (billing entity, table layout) ──
  if (dt.kind === "proforma" || dt.kind === "invoice") {
    if (!opts.sponsorId) throw new Error("A concluded sponsor is required");
    const item = await prisma.budgetItem.findFirst({
      where: { sponsorId: opts.sponsorId, category: "revenue" },
      include: { sponsor: { include: { perks: { orderBy: { sortOrder: "asc" } } } } },
    });
    if (!item || !item.sponsor) throw new Error("No revenue line for this sponsor — conclude it first");
    const { buffer, docNumber } = await buildInvoicePdf(item, dt.kind);
    return { buffer, filename: `${dt.kind}-${docNumber}.pdf`, docNumber, recipientName: item.sponsor.name, recipientEmail: item.sponsor.email };
  }

  // ── Template documents (organizer entity) ──
  const ctx = opts.sponsorId ? await sponsorCtx(opts.sponsorId) : opts.prospectId ? await prospectCtx(opts.prospectId) : null;
  if (!ctx) throw new Error("A target (sponsor or prospect) is required");

  const entity = await getIssuerEntity();
  const settings = await getEventSettings();
  const deadlines = await getSponsorDeadlines();
  const fmtDate = (d?: Date) => d ? d.toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR") : "";
  const eventDate = (lang === "en" ? settings.event_date_display_en : settings.event_date_display_fr) || (lang === "en" ? "November 28, 2026" : "28 novembre 2026");
  const eventVenue = settings.event_venue ? `${settings.event_venue}, ${settings.event_city || "Douala"}` : "Douala, Cameroun";
  const idPart = opts.sponsorId ? `S${opts.sponsorId}` : `P${opts.prospectId}`;
  const docNumber = `EOC-${opts.type.toUpperCase().slice(0, 6)}-2026-${idPart}`;

  const vars: Record<string, string> = {
    sponsor_name: ctx.name, tier: ctx.tier || "—", amount: fcfa(ctx.amount, lang),
    sponsor_email: ctx.email || "", contact_name: ctx.contact || "", sector: ctx.sector || (lang === "en" ? "the partner's sector" : "le secteur du partenaire"),
    date: new Date().toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR"),
    event_date: eventDate, event_venue: eventVenue,
    organizer_name: entity.legalName, organizer_email: entity.email,
    deadline_print: fmtDate(deadlines.find(d => d.key === "print")?.date) || "31/10/2026",
    deadline_digital: fmtDate(deadlines.find(d => d.key === "digital")?.date) || "15/11/2026",
    doc_number: docNumber,
  };

  // DB template override, else the code default.
  const tpl = await prisma.documentTemplate.findUnique({ where: { docKey: opts.type } });
  const def = DEFAULT_TEMPLATES[opts.type];
  const rawBody = tpl ? (lang === "en" ? tpl.bodyEn : tpl.bodyFr) : (lang === "en" ? def?.bodyEn : def?.bodyFr);
  if (!rawBody) throw new Error("No template body");
  const filledBody = fillTemplate(rawBody, vars);

  const buffer = await renderBrandedDoc(entity, {
    title: (lang === "en" ? dt.nameEn : dt.nameFr).toUpperCase(),
    subtitle: `EOCON 2026 · ${ctx.tier || ""}`.trim(),
    docNumber, lang,
    recipient: { name: ctx.name, lines: [ctx.website, ctx.email || "", ctx.tier ? `${lang === "en" ? "Partner" : "Partenaire"} ${ctx.tier}` : ""].filter(Boolean) },
    filledBody,
    perks: ctx.perks,
    signature: {
      leftRole: lang === "en" ? "The Organizer" : "L'Organisateur", leftName: entity.legalName,
      rightRole: lang === "en" ? "The Partner" : "Le Partenaire", rightName: ctx.name,
    },
  });

  return { buffer, filename: `${opts.type}-${slug(ctx.name)}-${lang}.pdf`, docNumber, recipientName: ctx.name, recipientEmail: ctx.email };
}

export { DOC_TYPES };
