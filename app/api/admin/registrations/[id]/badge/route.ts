export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";

// ID-1 badge size: 85.60 × 53.98 mm
// At 72 pt/inch, 1mm = 2.8346 pt
const MM_TO_PT = 72 / 25.4;
const BADGE_W = 85.6 * MM_TO_PT;  // ≈ 242.65 pt
const BADGE_H = 53.98 * MM_TO_PT; // ≈ 153.05 pt

// A4: 210 × 297 mm
const A4_W = 210 * MM_TO_PT;
const A4_H = 297 * MM_TO_PT;

// Cut mark length and gap
const CUT_LEN = 8;
const CUT_GAP = 4;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const reg = await prisma.registration.findUnique({
    where: { id },
    select: { fname: true, lname: true, ticketType: true, ticketRef: true, linkedin: true, whatsapp: true },
  });
  if (!reg) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://eyesopensecurity.com";
  const connectUrl = reg.ticketRef ? `${baseUrl}/connect/${reg.ticketRef}` : baseUrl;

  // Generate QR as PNG buffer
  const qrBuffer = await QRCode.toBuffer(connectUrl, { width: 200, margin: 1, color: { dark: "#000000", light: "#ffffff" } });

  // Build PDF
  const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  // Center the badge on A4
  const x0 = (A4_W - BADGE_W) / 2;
  const y0 = (A4_H - BADGE_H) / 2;

  // Badge background — white to save ink
  doc.rect(x0, y0, BADGE_W, BADGE_H).fill("#ffffff");

  // Dashed cut marks at corners (outside the badge)
  doc.dash(3, { space: 3 });
  doc.strokeColor("#888888").lineWidth(0.5);

  // Top-left corner
  doc.moveTo(x0 - CUT_GAP - CUT_LEN, y0).lineTo(x0 - CUT_GAP, y0).stroke();
  doc.moveTo(x0, y0 - CUT_GAP - CUT_LEN).lineTo(x0, y0 - CUT_GAP).stroke();
  // Top-right corner
  doc.moveTo(x0 + BADGE_W + CUT_GAP, y0).lineTo(x0 + BADGE_W + CUT_GAP + CUT_LEN, y0).stroke();
  doc.moveTo(x0 + BADGE_W, y0 - CUT_GAP - CUT_LEN).lineTo(x0 + BADGE_W, y0 - CUT_GAP).stroke();
  // Bottom-left corner
  doc.moveTo(x0 - CUT_GAP - CUT_LEN, y0 + BADGE_H).lineTo(x0 - CUT_GAP, y0 + BADGE_H).stroke();
  doc.moveTo(x0, y0 + BADGE_H + CUT_GAP).lineTo(x0, y0 + BADGE_H + CUT_GAP + CUT_LEN).stroke();
  // Bottom-right corner
  doc.moveTo(x0 + BADGE_W + CUT_GAP, y0 + BADGE_H).lineTo(x0 + BADGE_W + CUT_GAP + CUT_LEN, y0 + BADGE_H).stroke();
  doc.moveTo(x0 + BADGE_W, y0 + BADGE_H + CUT_GAP).lineTo(x0 + BADGE_W, y0 + BADGE_H + CUT_GAP + CUT_LEN).stroke();
  doc.undash();

  // Left section: EOCON branding (first ~30% of width)
  const leftW = BADGE_W * 0.28;
  const midX = x0 + leftW;
  const centerY = y0 + BADGE_H / 2;

  // Black accent bar on left edge
  doc.rect(x0, y0, 3, BADGE_H).fill("#000000");

  // EOCON label
  doc.fillColor("#000000").fontSize(7).font("Helvetica-Bold");
  doc.text("EOCON", x0 + 8, y0 + BADGE_H / 2 - 22, { width: leftW - 8, align: "center" });

  doc.fillColor("#000000").fontSize(18).font("Helvetica-Bold");
  doc.text("2026", x0 + 8, y0 + BADGE_H / 2 - 10, { width: leftW - 8, align: "center" });

  // Separator line under year
  doc.strokeColor("#000000").lineWidth(0.5).undash();
  doc.moveTo(x0 + 12, centerY + 12).lineTo(x0 + leftW - 4, centerY + 12).stroke();

  doc.fillColor("#000000").fontSize(5).font("Helvetica");
  doc.text("EYESOPEN SECURITY", x0 + 8, y0 + BADGE_H / 2 + 16, { width: leftW - 8, align: "center" });

  // Vertical separator
  doc.strokeColor("#cccccc").lineWidth(0.5);
  doc.moveTo(midX, y0 + 8).lineTo(midX, y0 + BADGE_H - 8).stroke();

  // Right section: QR code (last ~28% of width)
  const qrSize = BADGE_H - 16;
  const qrX = x0 + BADGE_W - qrSize - 8;
  const qrY = y0 + 8;
  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

  doc.fillColor("#000000").fontSize(5).font("Helvetica");
  doc.text("NETWORKING", qrX, qrY + qrSize + 2, { width: qrSize, align: "center" });

  // Center section: name + ticket type + ref
  const centerX = midX + 4;
  const centerW = qrX - midX - 8;
  const nameY = y0 + BADGE_H * 0.25;

  doc.fillColor("#000000").fontSize(11).font("Helvetica-Bold");
  doc.text(`${reg.fname} ${reg.lname}`, centerX, nameY, { width: centerW, align: "center" });

  doc.fillColor("#000000").fontSize(7).font("Helvetica-Bold");
  doc.text(reg.ticketType.toUpperCase(), centerX, nameY + 16, { width: centerW, align: "center", characterSpacing: 1 });

  if (reg.ticketRef) {
    doc.fillColor("#000000").fontSize(5).font("Helvetica");
    doc.text(reg.ticketRef, centerX, y0 + BADGE_H - 18, { width: centerW, align: "center" });
  }

  // Instruction note above cut area
  doc.fillColor("#888888").fontSize(7).font("Helvetica");
  doc.text(
    "Imprimez en A4, découpez le long des pointillés et glissez dans votre porte-badge.",
    x0 - 20, y0 - 30, { width: BADGE_W + 40, align: "center" },
  );

  doc.end();

  await new Promise<void>(res => doc.on("end", res));
  const pdfBuffer = Buffer.concat(chunks);

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="badge-${reg.ticketRef || id}.pdf"`,
    },
  });
}
