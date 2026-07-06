import { prisma } from "@/lib/db";
import { getBillingEntity } from "@/lib/sponsorBilling";
import { getEventContext, eventContextLine } from "@/lib/eventContext";
import PDFDocument from "pdfkit";
import { promises as fs } from "fs";
import path from "path";
import type { Prisma } from "@prisma/client";

const MM = 72 / 25.4;
const A4_W = 210 * MM;
const A4_H = 297 * MM;
const INK = "#0f172a", SUB = "#64748b", FAINT = "#94a3b8", LINE = "#e2e8f0", PANEL = "#f8fafc";

// pdfkit does NOT understand 8-digit hex (alpha). Produce a solid light tint of a color
// by blending it toward white — used for section bands so dark text stays readable.
function tint(hex: string, weight = 0.12): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return "#f1f5f9";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (c: number) => Math.round(255 - weight * (255 - c));
  return `#${[mix(r), mix(g), mix(b)].map(c => c.toString(16).padStart(2, "0")).join("")}`;
}

type ItemWithSponsor = Prisma.BudgetItemGetPayload<{ include: { sponsor: { include: { perks: true } } } }>;

async function loadLogo(logoUrl: string): Promise<Buffer | null> {
  if (logoUrl && /^https?:\/\//.test(logoUrl)) {
    try { const res = await fetch(logoUrl); if (res.ok) return Buffer.from(await res.arrayBuffer()); } catch { /* local */ }
  }
  for (const ext of ["png", "jpg", "jpeg"]) {
    try { return await fs.readFile(path.join(process.cwd(), "public", "branding", `examboot-logo.${ext}`)); } catch { /* next */ }
  }
  return null;
}

const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

// Build a proforma or invoice PDF for a sponsor-linked budget line. Assigns and
// persists a stable document number on first generation.
export async function buildInvoicePdf(item: ItemWithSponsor, type: "proforma" | "invoice"): Promise<{ buffer: Buffer; docNumber: string }> {
  const sponsor = item.sponsor!;
  const entity = await getBillingEntity();
  const logo = await loadLogo(entity.logoUrl);
  const accent = /^#[0-9a-fA-F]{6}$/.test(entity.accentColor) ? entity.accentColor : "#0a7d4b";
  const accentSoft = tint(accent, 0.12);
  const eventLine = eventContextLine(await getEventContext(), "fr");
  const now = new Date();

  let docNumber = type === "invoice" ? sponsor.invoiceNumber : sponsor.proformaNumber;
  if (!docNumber) {
    const prefix = type === "invoice" ? "INV" : "PRO";
    docNumber = `EXB-${prefix}-2026-${String(sponsor.id).padStart(4, "0")}`;
    await prisma.sponsor.update({
      where: { id: sponsor.id },
      data: type === "invoice" ? { invoiceNumber: docNumber, invoiceAt: now } : { proformaNumber: docNumber, proformaAt: now },
    });
  }

  const amount = sponsor.dealAmount ?? item.planned ?? 0;
  const titleFr = type === "invoice" ? "FACTURE" : "PROFORMA";
  const titleEn = type === "invoice" ? "INVOICE" : "PRO-FORMA";

  const M = 46, W = A4_W - M * 2;
  const doc = new PDFDocument({ size: "A4", margin: M, bufferPages: true, info: { Title: `${titleFr} ${docNumber}`, Author: entity.legalName } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const hline = (y: number, x0 = M, x1 = A4_W - M, color = LINE, w = 1) => doc.strokeColor(color).lineWidth(w).moveTo(x0, y).lineTo(x1, y).stroke();
  let y = 0;

  doc.rect(0, 0, A4_W, 8).fill(accent); y = M;
  const cardW = 200, cardX = A4_W - M - cardW, cardY = y, cardH = 92;
  if (logo) { try { doc.image(logo, M, y + 4, { fit: [190, 66] }); } catch { doc.fillColor(accent).font("Helvetica-Bold").fontSize(20).text(entity.legalName, M, y + 8, { width: cardX - M - 10 }); } }
  else { doc.fillColor(accent).font("Helvetica-Bold").fontSize(20).text(entity.legalName, M, y + 6, { width: cardX - M - 12 });
    doc.fillColor(FAINT).font("Helvetica").fontSize(8).text("BILLING · FACTURATION", M, y + 34, { characterSpacing: 2 }); }
  doc.roundedRect(cardX, cardY, cardW, cardH, 8).fill(PANEL); doc.rect(cardX, cardY, 4, cardH).fill(accent);
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(17).text(titleFr, cardX + 16, cardY + 12, { width: cardW - 28 });
  doc.fillColor(FAINT).font("Helvetica").fontSize(8).text(titleEn, cardX + 16, cardY + 31, { width: cardW - 28, characterSpacing: 1 });
  const metaRow = (l: string, v: string, yy: number) => {
    doc.fillColor(SUB).font("Helvetica").fontSize(8).text(l, cardX + 16, yy, { width: 70 });
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(8.5).text(v, cardX + 78, yy, { width: cardW - 92, align: "right" });
  };
  metaRow("N°", docNumber, cardY + 48);
  metaRow(type === "invoice" ? "Date" : "Émis le", now.toLocaleDateString("fr-FR"), cardY + 62);
  metaRow(type === "invoice" ? "Échéance" : "Valide 30 j", type === "invoice" ? "À réception" : new Date(now.getTime() + 30 * 86400000).toLocaleDateString("fr-FR"), cardY + 76);
  y = cardY + cardH + 22;

  const colGap = 16, colW = (W - colGap) / 2, panelH = 96;
  const panel = (x: number, label: string, title: string, lines: string[]) => {
    doc.roundedRect(x, y, colW, panelH, 8).fill(PANEL);
    doc.fillColor(accent).font("Helvetica-Bold").fontSize(7.5).text(label, x + 14, y + 12, { characterSpacing: 1.5 });
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(12).text(title, x + 14, y + 26, { width: colW - 28 });
    doc.font("Helvetica").fontSize(8.5).fillColor(SUB); let ly = y + 44;
    for (const l of lines.filter(Boolean)) { doc.text(l, x + 14, ly, { width: colW - 28 }); ly += 12; }
  };
  panel(M, "ÉMETTEUR · FROM", entity.legalName, [entity.address, entity.email, entity.phone, entity.taxId ? `ID fiscal : ${entity.taxId}` : ""]);
  panel(M + colW + colGap, type === "invoice" ? "FACTURÉ À · BILL TO" : "DESTINATAIRE · TO", sponsor.name, [sponsor.website || "", sponsor.email || "", sponsor.phone || ""]);
  y += panelH + 18;

  doc.fillColor(SUB).font("Helvetica").fontSize(9).text("Objet · Subject", M, y);
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(10).text(`Partenariat EOCON 2026 — Sponsor ${sponsor.tier}`, M, y + 12, { width: W });
  doc.fillColor(FAINT).font("Helvetica").fontSize(8).text(eventLine, M, y + 27, { width: W });
  y += 46;

  const qtyW = 70, descX = M + 14, descW = W - qtyW - 28;
  doc.rect(M, y, W, 24).fill(accentSoft);
  doc.fillColor(accent).font("Helvetica-Bold").fontSize(8.5)
    .text("CONTREPARTIES INCLUSES · INCLUDED BENEFITS", descX, y + 8, { width: descW })
    .text("QTÉ", A4_W - M - qtyW - 6, y + 8, { width: qtyW, align: "right" });
  y += 24;

  const ensure = (h: number) => { if (y + h > A4_H - 96) { doc.addPage(); doc.rect(0, 0, A4_W, 8).fill(accent); y = M + 6; } };
  const perks = sponsor.perks;
  perks.forEach((p, i) => {
    const label = p.labelFr + (p.labelEn && p.labelEn !== p.labelFr ? `  ·  ${p.labelEn}` : "");
    doc.font("Helvetica").fontSize(9);
    const h = Math.max(20, doc.heightOfString(label, { width: descW }) + 12);
    ensure(h);
    if (i % 2 === 1) doc.rect(M, y, W, h).fill(PANEL);
    doc.fillColor(INK).font("Helvetica").fontSize(9).text(label, descX, y + 6, { width: descW });
    doc.fillColor(SUB).font("Helvetica-Bold").fontSize(9).text(p.quantity && p.quantity > 1 ? String(p.quantity) : "✓", A4_W - M - qtyW - 6, y + 6, { width: qtyW, align: "right" });
    hline(y + h, M, A4_W - M, LINE, 0.5);
    y += h;
  });
  if (perks.length === 0) { ensure(24); doc.fillColor(FAINT).font("Helvetica").fontSize(9).text("—", descX, y + 6); y += 24; }
  y += 14;

  ensure(60);
  const totalW = 240, totalX = A4_W - M - totalW;
  doc.roundedRect(totalX, y, totalW, 50, 8).fill(accent);
  doc.fillColor("#ffffff").font("Helvetica").fontSize(9).text(type === "invoice" ? "MONTANT DÛ · AMOUNT DUE" : "TOTAL PARTENARIAT · TOTAL", totalX + 16, y + 12, { width: totalW - 32 });
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(18).text(fcfa(amount), totalX + 16, y + 24, { width: totalW - 32 });
  y += 66;

  ensure(70);
  const noteLines = [
    type === "invoice" ? "Paiement à réception. / Payment due upon receipt." : "Document proforma — sans valeur comptable, valable 30 jours. / Pro-forma only, valid 30 days.",
    entity.paymentTerms || "",
  ].filter(Boolean);
  const noteH = 22 + noteLines.reduce((s, l) => s + doc.heightOfString(l, { width: W - 28 }) + 4, 0);
  doc.roundedRect(M, y, W, Math.max(52, noteH), 8).fill(PANEL);
  doc.fillColor(accent).font("Helvetica-Bold").fontSize(7.5).text(type === "invoice" ? "MODALITÉS DE PAIEMENT · PAYMENT" : "INFORMATIONS · NOTES", M + 14, y + 12, { characterSpacing: 1.2 });
  let ny = y + 26;
  doc.font("Helvetica").fontSize(8.5).fillColor(SUB);
  for (const l of noteLines) { doc.text(l, M + 14, ny, { width: W - 28 }); ny += doc.heightOfString(l, { width: W - 28 }) + 4; }

  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    hline(A4_H - 54, M, A4_W - M, LINE, 0.5);
    doc.fillColor(FAINT).font("Helvetica").fontSize(7).text(`${entity.legalName}  ·  ${entity.email}  ·  ${entity.phone}`, M, A4_H - 46, { width: W, align: "center" });
    doc.fillColor(FAINT).font("Helvetica").fontSize(7).text(`${titleFr} ${docNumber}  —  EOCON 2026  ·  Page ${i + 1}/${range.count}`, M, A4_H - 34, { width: W, align: "center" });
  }

  doc.end();
  await new Promise<void>(res => doc.on("end", res));
  return { buffer: Buffer.concat(chunks), docNumber };
}
