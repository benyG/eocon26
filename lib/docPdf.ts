import PDFDocument from "pdfkit";
import { promises as fs } from "fs";
import path from "path";
import type { DocEntity } from "@/lib/documentEntities";

const MM = 72 / 25.4;
export const A4_W = 210 * MM;
export const A4_H = 297 * MM;

const INK = "#0f172a", SUB = "#475569", FAINT = "#94a3b8", LINE = "#e2e8f0", PANEL = "#f8fafc";
const M = 46;
const W = A4_W - M * 2;

export interface PerkLine { labelFr: string; labelEn: string; quantity: number | null; }

export async function loadEntityLogo(entity: DocEntity): Promise<Buffer | null> {
  if (entity.logoUrl && /^https?:\/\//.test(entity.logoUrl)) {
    try { const r = await fetch(entity.logoUrl); if (r.ok) return Buffer.from(await r.arrayBuffer()); } catch { /* local */ }
  }
  for (const ext of ["png", "jpg", "jpeg"]) {
    try { return await fs.readFile(path.join(process.cwd(), "public", "branding", `${entity.logoKey}.${ext}`)); } catch { /* next */ }
  }
  return null;
}

interface Doc { doc: PDFKit.PDFDocument; accent: string; y: number; }

function header(ctx: Doc, entity: DocEntity, logo: Buffer | null, title: string, subtitle: string, meta: [string, string][]) {
  const { doc, accent } = ctx;
  doc.rect(0, 0, A4_W, 8).fill(accent);
  let y = M;
  const cardW = 200, cardX = A4_W - M - cardW, cardH = Math.max(70, 34 + meta.length * 14);
  if (logo) { try { doc.image(logo, M, y + 4, { fit: [190, 62] }); } catch { doc.fillColor(accent).font("Helvetica-Bold").fontSize(19).text(entity.legalName, M, y + 8, { width: cardX - M - 12 }); } }
  else {
    doc.fillColor(accent).font("Helvetica-Bold").fontSize(19).text(entity.legalName, M, y + 6, { width: cardX - M - 12 });
    doc.fillColor(FAINT).font("Helvetica").fontSize(8).text("EOCON 2026", M, y + 32, { characterSpacing: 2 });
  }
  doc.roundedRect(cardX, y, cardW, cardH, 8).fill(PANEL);
  doc.rect(cardX, y, 4, cardH).fill(accent);
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(15).text(title, cardX + 16, y + 12, { width: cardW - 28 });
  if (subtitle) doc.fillColor(FAINT).font("Helvetica").fontSize(8).text(subtitle, cardX + 16, y + 30, { width: cardW - 28, characterSpacing: 1 });
  let my = y + 30 + (subtitle ? 14 : 0);
  for (const [l, v] of meta) {
    doc.fillColor(SUB).font("Helvetica").fontSize(8).text(l, cardX + 16, my, { width: 62 });
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(8).text(v, cardX + 76, my, { width: cardW - 90, align: "right" });
    my += 14;
  }
  ctx.y = Math.max(y + 72, y + cardH) + 18;
}

function issuerRecipient(ctx: Doc, entity: DocEntity, recipient: { name: string; lines: string[] } | null, lang: "fr" | "en") {
  const { doc, accent } = ctx;
  let y = ctx.y;
  const colGap = 16, colW = recipient ? (W - colGap) / 2 : W;
  const box = (x: number, label: string, title: string, lines: string[]) => {
    const h = 44 + lines.filter(Boolean).length * 12;
    doc.roundedRect(x, y, colW, h, 8).fill(PANEL);
    doc.fillColor(accent).font("Helvetica-Bold").fontSize(7.5).text(label, x + 14, y + 12, { characterSpacing: 1.4 });
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(11.5).text(title, x + 14, y + 25, { width: colW - 28 });
    doc.font("Helvetica").fontSize(8.5).fillColor(SUB);
    let ly = y + 42;
    for (const l of lines.filter(Boolean)) { doc.text(l, x + 14, ly, { width: colW - 28 }); ly += 12; }
    return h;
  };
  const h1 = box(M, lang === "en" ? "ISSUED BY" : "ÉMETTEUR", entity.legalName, [entity.address, entity.email, entity.phone, entity.taxId ? `ID: ${entity.taxId}` : ""]);
  let h2 = 0;
  if (recipient) h2 = box(M + colW + colGap, lang === "en" ? "TO" : "DESTINATAIRE", recipient.name, recipient.lines);
  ctx.y = y + Math.max(h1, h2) + 18;
}

function ensure(ctx: Doc, h: number) {
  if (ctx.y + h > A4_H - 80) {
    ctx.doc.addPage();
    ctx.doc.rect(0, 0, A4_W, 8).fill(ctx.accent);
    ctx.y = M + 6;
  }
}

function perkBullets(ctx: Doc, perks: PerkLine[], lang: "fr" | "en") {
  const { doc } = ctx;
  if (perks.length === 0) { ensure(ctx, 16); doc.fillColor(FAINT).font("Helvetica").fontSize(9.5).text("—", M + 14, ctx.y); ctx.y += 16; return; }
  for (const p of perks) {
    const label = (p.quantity && p.quantity > 1 ? `${p.quantity}× ` : "") + (lang === "en" ? p.labelEn : p.labelFr);
    doc.font("Helvetica").fontSize(9.5);
    const h = doc.heightOfString(label, { width: W - 34 }) + 4;
    ensure(ctx, h);
    doc.fillColor(ctx.accent).text("•", M + 12, ctx.y);
    doc.fillColor(INK).text(label, M + 24, ctx.y, { width: W - 34 });
    ctx.y += h;
  }
  ctx.y += 4;
}

function signature(ctx: Doc, leftRole: string, leftName: string, rightRole: string, rightName: string) {
  const { doc } = ctx;
  ensure(ctx, 96);
  ctx.y += 10;
  const colW = (W - 30) / 2;
  const block = (x: number, role: string, name: string) => {
    doc.fillColor(SUB).font("Helvetica").fontSize(8.5).text(role, x, ctx.y);
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(10).text(name, x, ctx.y + 13, { width: colW });
    doc.strokeColor(LINE).lineWidth(1).moveTo(x, ctx.y + 56).lineTo(x + colW - 10, ctx.y + 56).stroke();
    doc.fillColor(FAINT).font("Helvetica").fontSize(7.5).text("Nom, signature & date · Name, signature & date", x, ctx.y + 60, { width: colW });
  };
  block(M, leftRole, leftName);
  block(M + colW + 30, rightRole, rightName);
  ctx.y += 84;
}

function body(ctx: Doc, text: string, perks: PerkLine[], lang: "fr" | "en", sig?: { leftRole: string; leftName: string; rightRole: string; rightName: string }) {
  const { doc } = ctx;
  const lines = text.split("\n");
  let para: string[] = [];
  const flushPara = () => {
    if (!para.length) return;
    const t = para.join(" ").trim();
    para = [];
    if (!t) return;
    doc.font("Helvetica").fontSize(9.5);
    const h = doc.heightOfString(t, { width: W }) + 6;
    ensure(ctx, h);
    doc.fillColor(INK).text(t, M, ctx.y, { width: W, align: "left" });
    ctx.y += h;
  };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (line.trim() === "{{PERKS}}") { flushPara(); perkBullets(ctx, perks, lang); continue; }
    if (line.trim() === "{{SIGNATURE}}") { flushPara(); if (sig) signature(ctx, sig.leftRole, sig.leftName, sig.rightRole, sig.rightName); continue; }
    if (line.startsWith("## ")) {
      flushPara();
      ctx.y += 6;
      const t = line.slice(3);
      doc.font("Helvetica-Bold").fontSize(11);
      const h = doc.heightOfString(t, { width: W }) + 6;
      ensure(ctx, h + 6);
      doc.fillColor(ctx.accent).text(t, M, ctx.y, { width: W });
      ctx.y += h;
      continue;
    }
    if (line.startsWith("- ")) {
      flushPara();
      const t = line.slice(2);
      doc.font("Helvetica").fontSize(9.5);
      const h = doc.heightOfString(t, { width: W - 22 }) + 4;
      ensure(ctx, h);
      doc.fillColor(ctx.accent).text("•", M + 4, ctx.y);
      doc.fillColor(INK).text(t, M + 16, ctx.y, { width: W - 22 });
      ctx.y += h;
      continue;
    }
    if (line.trim() === "") { flushPara(); ctx.y += 5; continue; }
    para.push(line);
  }
  flushPara();
}

function footer(doc: PDFKit.PDFDocument, entity: DocEntity, ref: string) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.strokeColor(LINE).lineWidth(0.5).moveTo(M, A4_H - 54).lineTo(A4_W - M, A4_H - 54).stroke();
    doc.fillColor(FAINT).font("Helvetica").fontSize(7)
      .text(`${entity.legalName}  ·  ${entity.email}  ·  ${entity.phone}`, M, A4_H - 46, { width: W, align: "center" });
    doc.fillColor(FAINT).font("Helvetica").fontSize(7)
      .text(`${ref}  —  EOCON 2026  ·  Page ${i + 1}/${range.count}`, M, A4_H - 34, { width: W, align: "center" });
  }
}

async function finish(doc: PDFKit.PDFDocument): Promise<Buffer> {
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  doc.end();
  await new Promise<void>(res => doc.on("end", res));
  return Buffer.concat(chunks);
}

// ── Public: render a text/template document ──
export async function renderBrandedDoc(entity: DocEntity, opts: {
  title: string; subtitle: string; docNumber: string; lang: "fr" | "en";
  recipient: { name: string; lines: string[] } | null;
  filledBody: string; perks: PerkLine[];
  signature?: { leftRole: string; leftName: string; rightRole: string; rightName: string };
}): Promise<Buffer> {
  const accent = /^#[0-9a-fA-F]{6}$/.test(entity.accentColor) ? entity.accentColor : "#0a7d4b";
  const doc = new PDFDocument({ size: "A4", margin: M, bufferPages: true, info: { Title: `${opts.title} ${opts.docNumber}`, Author: entity.legalName } });
  const logo = await loadEntityLogo(entity);
  const ctx: Doc = { doc, accent, y: M };
  const now = new Date();
  header(ctx, entity, logo, opts.title, opts.subtitle, [["Réf.", opts.docNumber], [opts.lang === "en" ? "Date" : "Date", now.toLocaleDateString(opts.lang === "en" ? "en-GB" : "fr-FR")]]);
  issuerRecipient(ctx, entity, opts.recipient, opts.lang);
  body(ctx, opts.filledBody, opts.perks, opts.lang, opts.signature);
  footer(doc, entity, opts.docNumber);
  return finish(doc);
}

// ── Public: render the pricing / packages sheet ──
export interface PricingPkg { tier: string; nameFr: string; nameEn: string; price: number; maxSponsors: number; highlightColor: string | null; perksFr: string[]; perksEn: string[]; }
export async function renderPricingPdf(entity: DocEntity, packages: PricingPkg[], lang: "fr" | "en", docNumber: string): Promise<Buffer> {
  const accent = /^#[0-9a-fA-F]{6}$/.test(entity.accentColor) ? entity.accentColor : "#0a7d4b";
  const doc = new PDFDocument({ size: "A4", margin: M, bufferPages: true, info: { Title: `EOCON 2026 — ${lang === "en" ? "Pricing" : "Grille tarifaire"}` } });
  const logo = await loadEntityLogo(entity);
  const ctx: Doc = { doc, accent, y: M };
  header(ctx, entity, logo, lang === "en" ? "PRICING" : "GRILLE TARIFAIRE", "EOCON 2026 · Packages", [["Réf.", docNumber]]);
  doc.fillColor(SUB).font("Helvetica").fontSize(9).text(lang === "en"
    ? "Partnership tiers for EOCON 2026 — 7th edition · 28 Nov 2026 · Douala, hybrid."
    : "Niveaux de partenariat pour EOCON 2026 — 7ème édition · 28 nov. 2026 · Douala, hybride.", M, ctx.y, { width: W });
  ctx.y += 26;

  for (const p of packages) {
    const perks = lang === "en" ? p.perksEn : p.perksFr;
    const color = /^#[0-9a-fA-F]{6}$/.test(p.highlightColor || "") ? p.highlightColor! : accent;
    const estH = 46 + perks.length * 13 + 14;
    ensure(ctx, estH);
    // tier header band
    doc.roundedRect(M, ctx.y, W, 30, 6).fill(color + "18");
    doc.rect(M, ctx.y, 4, 30).fill(color);
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(13).text(lang === "en" ? p.nameEn : p.nameFr, M + 14, ctx.y + 8, { width: W - 180 });
    doc.fillColor(color).font("Helvetica-Bold").fontSize(13).text(p.price > 0 ? `${p.price.toLocaleString("fr-FR")} FCFA` : (lang === "en" ? "Partnership" : "Partenariat"), M + W - 170, ctx.y + 8, { width: 156, align: "right" });
    ctx.y += 38;
    for (const perk of perks) {
      doc.font("Helvetica").fontSize(9);
      const h = doc.heightOfString(perk, { width: W - 40 }) + 3;
      ensure(ctx, h);
      doc.fillColor(color).text("✓", M + 16, ctx.y);
      doc.fillColor(INK).text(perk, M + 30, ctx.y, { width: W - 44 });
      ctx.y += h;
    }
    ctx.y += 14;
  }
  doc.fillColor(FAINT).font("Helvetica").fontSize(8).text(lang === "en"
    ? "Custom package available on request — sponsors@eyesopensecurity.com"
    : "Package sur-mesure disponible sur demande — sponsors@eyesopensecurity.com", M, ctx.y, { width: W });
  footer(doc, entity, docNumber);
  return finish(doc);
}
