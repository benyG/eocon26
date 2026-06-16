export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateBadgeSvg, BadgeType, svgToBase64 } from "@/lib/badgeSvg";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";

const MM_TO_PT = 72 / 25.4;
const A4_W = 210 * MM_TO_PT;
const A4_H = 297 * MM_TO_PT;

export async function GET(_req: NextRequest, { params }: { params: { uuid: string } }) {
  const badge = await prisma.badgeCredential.findUnique({ where: { uuid: params.uuid } });
  if (!badge) return NextResponse.json({ error: "Badge not found" }, { status: 404 });

  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://eyesopensecurity.com";
  const verifyUrl = `${baseUrl}/verify/${badge.uuid}`;

  // Generate QR code PNG for the verify URL
  const qrBuffer = await QRCode.toBuffer(verifyUrl, { width: 250, margin: 2, color: { dark: "#000000", light: "#ffffff" } });

  // Generate badge SVG → PNG via base64 embedding in PDF
  const svgString = generateBadgeSvg(badge.badgeType as BadgeType, badge.recipientName, "2026", badge.subtype);
  const svgBase64 = svgToBase64(svgString);
  const svgDataUri = `data:image/svg+xml;base64,${svgBase64}`;

  const doc = new PDFDocument({ size: "A4", margin: 40, autoFirstPage: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));

  const margin = 40;
  const contentW = A4_W - margin * 2;
  let y = margin;

  // Header
  doc.fillColor("#00ff9d").fontSize(8).font("Helvetica-Bold")
    .text("EOCON 2026", margin, y, { width: contentW, align: "center", characterSpacing: 4 });
  y += 14;
  doc.fillColor("#888888").fontSize(7).font("Helvetica")
    .text("OPEN BADGE CERTIFICATE", margin, y, { width: contentW, align: "center", characterSpacing: 2 });
  y += 24;

  // Thin green separator
  doc.strokeColor("#00ff9d").lineWidth(0.5)
    .moveTo(margin, y).lineTo(A4_W - margin, y).stroke();
  y += 20;

  // Badge image (SVG via data URI — pdfkit handles it as image when format is svg)
  // pdfkit doesn't natively render SVG; embed as PNG fallback using a placeholder rect + text
  // Instead draw the badge info in styled text
  const badgeColors: Record<string, string> = {
    participant: "#00ff9d", speaker: "#cc0000", volunteer: "#ff6600",
    ctf_competitor: "#00ccff", ctf_winner: "#ffd700", organizer: "#cc00ff",
  };
  const color = badgeColors[badge.badgeType] || "#00ff9d";

  // Badge hexagon placeholder box
  const boxSize = 120;
  const boxX = A4_W / 2 - boxSize / 2;
  doc.roundedRect(boxX, y, boxSize, boxSize, 8)
    .fillAndStroke("#0a0a0f", color);

  // Badge type label inside box
  doc.fillColor(color).fontSize(9).font("Helvetica-Bold")
    .text(badge.badgeType.replace("_", " ").toUpperCase(), boxX, y + 30, { width: boxSize, align: "center", characterSpacing: 1 });
  doc.fillColor("#ffffff").fontSize(11).font("Helvetica-Bold")
    .text(badge.recipientName, boxX, y + 52, { width: boxSize, align: "center" });
  doc.fillColor(color).fontSize(7).font("Helvetica")
    .text("EOCON 2026", boxX, y + 74, { width: boxSize, align: "center", characterSpacing: 2 });
  if (badge.subtype) {
    doc.fillColor("#888888").fontSize(7).font("Helvetica")
      .text(badge.subtype.toUpperCase(), boxX, y + 90, { width: boxSize, align: "center" });
  }
  y += boxSize + 24;

  // Recipient name large
  doc.fillColor("#ffffff").fontSize(22).font("Helvetica-Bold")
    .text(badge.recipientName, margin, y, { width: contentW, align: "center" });
  y += 30;

  // Badge type
  doc.fillColor(color).fontSize(12).font("Helvetica-Bold")
    .text(badge.badgeType.replace(/_/g, " ").toUpperCase(), margin, y, { width: contentW, align: "center", characterSpacing: 2 });
  y += 16;
  if (badge.subtype) {
    doc.fillColor("#888888").fontSize(9).font("Helvetica")
      .text(badge.subtype.toUpperCase(), margin, y, { width: contentW, align: "center" });
    y += 14;
  }
  y += 20;

  // Separator
  doc.strokeColor("#1a1a2e").lineWidth(0.5)
    .moveTo(margin + 60, y).lineTo(A4_W - margin - 60, y).stroke();
  y += 24;

  // QR code + caption
  const qrSize = 130;
  const qrX = A4_W / 2 - qrSize / 2;
  doc.image(qrBuffer, qrX, y, { width: qrSize, height: qrSize });
  y += qrSize + 8;

  doc.fillColor("#555555").fontSize(7).font("Helvetica")
    .text("Scannez pour vérifier ce badge / Scan to verify this badge", margin, y, { width: contentW, align: "center" });
  y += 14;
  doc.fillColor("#00ff9d").fontSize(7).font("Helvetica")
    .text(verifyUrl, margin, y, { width: contentW, align: "center", link: verifyUrl });
  y += 20;

  // Separator
  doc.strokeColor("#1a1a2e").lineWidth(0.5)
    .moveTo(margin, y).lineTo(A4_W - margin, y).stroke();
  y += 16;

  // Badge UUID
  doc.fillColor("#333333").fontSize(6).font("Helvetica")
    .text(`Badge ID: ${badge.uuid}`, margin, y, { width: contentW, align: "center" });
  y += 12;

  // Issued date
  doc.fillColor("#333333").fontSize(6).font("Helvetica")
    .text(`Issued: ${new Date(badge.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, margin, y, { width: contentW, align: "center" });
  y += 16;

  // Footer
  doc.fillColor("#222222").fontSize(6).font("Helvetica")
    .text("EyesOpen Association · EOCON 2026 · eyesopensecurity.com · Open Badges V3 · W3C Verifiable Credential", margin, y, { width: contentW, align: "center" });

  doc.end();
  await new Promise<void>(res => doc.on("end", res));
  const pdf = Buffer.concat(chunks);

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="badge-eocon2026-${badge.uuid.slice(0, 8)}.pdf"`,
    },
  });
}
