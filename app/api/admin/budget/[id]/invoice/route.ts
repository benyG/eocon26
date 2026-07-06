export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { getBillingEntity } from "@/lib/sponsorBilling";
import { formatPerkLabel } from "@/lib/packagePerks";
import PDFDocument from "pdfkit";
import { promises as fs } from "fs";
import path from "path";

const MM = 72 / 25.4;
const A4_W = 210 * MM;

// Resolve the Examboot logo as a Buffer: remote URL setting first, then a file
// dropped in public/branding/examboot-logo.(png|jpg|jpeg). Returns null if none.
async function loadLogo(logoUrl: string): Promise<Buffer | null> {
  if (logoUrl && /^https?:\/\//.test(logoUrl)) {
    try {
      const res = await fetch(logoUrl);
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    } catch { /* fall through to local */ }
  }
  for (const ext of ["png", "jpg", "jpeg"]) {
    try {
      return await fs.readFile(path.join(process.cwd(), "public", "branding", `examboot-logo.${ext}`));
    } catch { /* try next */ }
  }
  return null;
}

const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("budget", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const type = req.nextUrl.searchParams.get("type") === "invoice" ? "invoice" : "proforma";
  const item = await prisma.budgetItem.findUnique({
    where: { id: parseInt(params.id) },
    include: { sponsor: { include: { perks: { orderBy: { sortOrder: "asc" } } } } },
  });
  if (!item) return NextResponse.json({ error: "Budget line not found" }, { status: 404 });
  if (!item.sponsor) return NextResponse.json({ error: "This budget line is not linked to a sponsor." }, { status: 400 });

  const sponsor = item.sponsor;
  const entity = await getBillingEntity();
  const logo = await loadLogo(entity.logoUrl);
  const now = new Date();

  // Assign a stable document number on first generation.
  const year = 2026;
  let docNumber = type === "invoice" ? sponsor.invoiceNumber : sponsor.proformaNumber;
  if (!docNumber) {
    const prefix = type === "invoice" ? "INV" : "PRO";
    docNumber = `EXB-${prefix}-${year}-${String(sponsor.id).padStart(4, "0")}`;
    await prisma.sponsor.update({
      where: { id: sponsor.id },
      data: type === "invoice"
        ? { invoiceNumber: docNumber, invoiceAt: now }
        : { proformaNumber: docNumber, proformaAt: now },
    });
  }

  const amount = sponsor.dealAmount ?? item.planned ?? 0;
  const title = type === "invoice" ? "FACTURE / INVOICE" : "PROFORMA";

  const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: `${title} ${docNumber}` } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));

  const margin = 48;
  const contentW = A4_W - margin * 2;
  let y = margin;

  // ── Header: logo + billing entity (left), document meta (right) ──
  if (logo) {
    try { doc.image(logo, margin, y, { fit: [130, 54] }); } catch { /* ignore bad image */ }
  } else {
    doc.fillColor("#0a7d4b").fontSize(18).font("Helvetica-Bold").text(entity.legalName, margin, y);
  }
  doc.fillColor("#111827").fontSize(20).font("Helvetica-Bold").text(title, margin, y, { width: contentW, align: "right" });
  doc.fillColor("#6b7280").fontSize(9).font("Helvetica").text(`N° ${docNumber}`, margin, y + 26, { width: contentW, align: "right" });
  doc.text(`Date : ${now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`, margin, y + 40, { width: contentW, align: "right" });
  y += 66;

  // Billing entity details (left column)
  doc.fillColor("#111827").fontSize(10).font("Helvetica-Bold").text(entity.legalName, margin, y);
  y += 14;
  doc.fillColor("#6b7280").fontSize(8.5).font("Helvetica");
  for (const line of [entity.address, entity.email, entity.phone, entity.taxId ? `ID fiscal : ${entity.taxId}` : ""].filter(Boolean)) {
    doc.text(line, margin, y); y += 12;
  }
  y += 10;

  doc.strokeColor("#e5e7eb").lineWidth(1).moveTo(margin, y).lineTo(A4_W - margin, y).stroke();
  y += 18;

  // ── Bill-to ──
  doc.fillColor("#9ca3af").fontSize(8).font("Helvetica-Bold").text(type === "invoice" ? "FACTURÉ À / BILL TO" : "DESTINATAIRE / TO", margin, y);
  y += 14;
  doc.fillColor("#111827").fontSize(12).font("Helvetica-Bold").text(sponsor.name, margin, y);
  y += 16;
  doc.fillColor("#6b7280").fontSize(9).font("Helvetica");
  for (const line of [sponsor.website || "", sponsor.email || "", `Partenariat EOCON 2026 — ${sponsor.tier}`].filter(Boolean)) {
    doc.text(line, margin, y); y += 12;
  }
  y += 14;

  // ── Perks table ──
  const col1 = margin + 8;
  const col2 = A4_W - margin - 60;
  doc.fillColor("#111827").rect(margin, y, contentW, 22).fill("#f3f4f6");
  doc.fillColor("#374151").fontSize(9).font("Helvetica-Bold")
    .text("Contreparties incluses / Included benefits", col1, y + 7)
    .text("Qté", col2, y + 7, { width: 52, align: "right" });
  y += 22;

  doc.font("Helvetica").fontSize(9.5).fillColor("#111827");
  sponsor.perks.forEach((p, i) => {
    if (i % 2 === 1) doc.rect(margin, y, contentW, 20).fill("#fafafa").fillColor("#111827");
    const label = `${p.labelFr}${p.labelEn && p.labelEn !== p.labelFr ? `  ·  ${p.labelEn}` : ""}`;
    doc.fillColor("#111827").text(label, col1, y + 6, { width: col2 - col1 - 10 });
    doc.fillColor("#374151").text(p.quantity && p.quantity > 1 ? String(p.quantity) : "✓", col2, y + 6, { width: 52, align: "right" });
    y += 20;
  });
  if (sponsor.perks.length === 0) {
    doc.fillColor("#9ca3af").text("—", col1, y + 6); y += 20;
  }

  doc.strokeColor("#e5e7eb").lineWidth(1).moveTo(margin, y).lineTo(A4_W - margin, y).stroke();
  y += 12;

  // ── Total ──
  doc.fillColor("#111827").fontSize(12).font("Helvetica-Bold")
    .text(`TOTAL : ${fcfa(amount)}`, margin, y, { width: contentW, align: "right" });
  y += 28;

  // ── Note ──
  const note = type === "invoice"
    ? "Merci pour votre partenariat. Paiement à réception. / Thank you for your partnership. Payment due upon receipt."
    : "Proforma sans valeur comptable, valable 30 jours. / Proforma only, valid for 30 days.";
  doc.fillColor("#6b7280").fontSize(8.5).font("Helvetica").text(note, margin, y, { width: contentW });
  y += 24;

  // ── Footer ──
  doc.fillColor("#9ca3af").fontSize(7.5).font("Helvetica")
    .text(`${entity.legalName} · ${entity.email} · ${entity.phone} — EOCON 2026 · Douala, 28 Nov. 2026`, margin, 800, { width: contentW, align: "center" });

  doc.end();
  await new Promise<void>(res => doc.on("end", res));
  const pdf = Buffer.concat(chunks);

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${type}-${docNumber}.pdf"`,
    },
  });
}
