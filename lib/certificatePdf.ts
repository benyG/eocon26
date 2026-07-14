import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { BadgeType } from "@/lib/badgeSvg";

const BADGE_COLORS: Record<string, { primary: string; secondary: string }> = {
  participant:    { primary: "#00a86b", secondary: "#0a0a0f" },
  speaker:        { primary: "#cc0000", secondary: "#0a0a0f" },
  volunteer:      { primary: "#e05a00", secondary: "#0a0a0f" },
  ctf_competitor: { primary: "#0090c0", secondary: "#0a0a0f" },
  ctf_winner:     { primary: "#c79a00", secondary: "#0a0a0f" },
  organizer:      { primary: "#9900cc", secondary: "#0a0a0f" },
};

const BADGE_LABELS: Record<string, string> = {
  participant: "PARTICIPANT", speaker: "SPEAKER", volunteer: "VOLUNTEER",
  ctf_competitor: "CTF COMPETITOR", ctf_winner: "CTF WINNER", organizer: "ORGANIZER",
};

// French participation statement per badge type. Kept intentionally short so the
// certificate stays clean and reads on a single line or two.
const STATEMENTS: Record<string, string> = {
  participant:    "a participé à EOCON 2026, la convention EyesOpen Cybersecurity.",
  speaker:        "est intervenu·e en qualité de conférencier·ère lors d'EOCON 2026.",
  volunteer:      "a contribué en tant que bénévole à l'organisation d'EOCON 2026.",
  ctf_competitor: "a pris part à la compétition EyesOpenCTF 2026 (Capture The Flag).",
  ctf_winner:     "s'est distingué·e parmi les meilleurs de la compétition EyesOpenCTF 2026.",
  organizer:      "a fait partie de l'équipe organisatrice d'EOCON 2026.",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// Vertices of a pointy-top hexagon (vertex at top & bottom, flat left/right),
// matching the on-screen badge shape.
function hexPoints(cx: number, cy: number, r: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (90 + i * 60);
    pts.push([cx + r * Math.cos(a), cy - r * Math.sin(a)]);
  }
  return pts;
}

function drawHex(doc: PDFKit.PDFDocument, pts: [number, number][]) {
  doc.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) doc.lineTo(pts[i][0], pts[i][1]);
  doc.closePath();
}

// Draw the badge medallion (dark hexagon with a coloured ring of initials and
// the badge label) directly as vectors — crisp at any size, no rasteriser needed.
export function drawBadgeMedallion(
  doc: PDFKit.PDFDocument,
  cx: number,
  cy: number,
  r: number,
  badgeType: string,
  recipientName: string,
  subtype: string | null,
  year: string,
) {
  const { primary } = BADGE_COLORS[badgeType] || BADGE_COLORS.participant;
  const label = BADGE_LABELS[badgeType] || badgeType.toUpperCase();

  doc.save();
  // Body + border
  drawHex(doc, hexPoints(cx, cy, r));
  doc.fillColor("#0a0a0f").fill();
  drawHex(doc, hexPoints(cx, cy, r));
  doc.lineWidth(r * 0.03).strokeColor(primary).stroke();
  drawHex(doc, hexPoints(cx, cy, r * 0.9));
  doc.lineWidth(r * 0.012).strokeColor(primary).opacity(0.5).stroke();
  doc.opacity(1);

  // EOCON year (top)
  doc.fillColor(primary).font("Helvetica-Bold").fontSize(r * 0.11)
    .text(`EOCON ${year}`, cx - r, cy - r * 0.62, { width: r * 2, align: "center", characterSpacing: 2 });

  // Initials ring
  const ringR = r * 0.34;
  doc.circle(cx, cy - r * 0.05, ringR).lineWidth(r * 0.028).strokeColor(primary).stroke();
  doc.fillColor(primary).font("Helvetica-Bold").fontSize(ringR * 0.95)
    .text(initials(recipientName), cx - ringR, cy - r * 0.05 - ringR * 0.6, { width: ringR * 2, align: "center" });

  // Label
  doc.fillColor(primary).font("Helvetica-Bold").fontSize(r * 0.1)
    .text(label, cx - r * 0.9, cy + r * 0.42, { width: r * 1.8, align: "center", characterSpacing: 1 });
  if (subtype) {
    doc.fillColor("#888888").font("Helvetica").fontSize(r * 0.075)
      .text(subtype.toUpperCase(), cx - r * 0.9, cy + r * 0.56, { width: r * 1.8, align: "center", characterSpacing: 1 });
  }
  doc.restore();
}

export interface CertificateBadge {
  uuid: string;
  badgeType: string;
  recipientName: string;
  subtype?: string | null;
  issuedAt: Date | string;
}

// Build an elegant, minimalist A4-landscape "Certificat de participation" PDF
// featuring the badge medallion. Returns the PDF as a Buffer.
export async function buildParticipationCertificate(
  badge: CertificateBadge,
  opts: { verifyUrl: string; venue?: string; city?: string; dateFr?: string; year?: string },
): Promise<Buffer> {
  const year = opts.year || "2026";
  const { primary } = BADGE_COLORS[badge.badgeType] || BADGE_COLORS.participant;
  const statement = STATEMENTS[badge.badgeType] || STATEMENTS.participant;
  const dateFr = opts.dateFr || "28 novembre 2026";
  const place = [opts.venue, opts.city].filter(Boolean).join(", ") || "Douala, Cameroun";

  const qrBuffer = await QRCode.toBuffer(opts.verifyUrl, { width: 220, margin: 1, color: { dark: "#111111", light: "#ffffff" } });

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));

  const W = doc.page.width;   // 842
  const H = doc.page.height;  // 595

  // Background
  doc.rect(0, 0, W, H).fill("#fdfdfb");

  // Double border in the badge colour
  doc.lineWidth(2).strokeColor(primary).rect(24, 24, W - 48, H - 48).stroke();
  doc.lineWidth(0.75).strokeColor(primary).opacity(0.55).rect(32, 32, W - 64, H - 64).stroke();
  doc.opacity(1);

  const cx = W / 2;

  // Kicker
  doc.fillColor(primary).font("Helvetica-Bold").fontSize(11)
    .text(`EOCON ${year}`, 0, 66, { width: W, align: "center", characterSpacing: 6 });
  doc.fillColor("#999999").font("Helvetica").fontSize(8)
    .text("EYESOPEN CYBERSECURITY CONVENTION", 0, 82, { width: W, align: "center", characterSpacing: 3 });

  // Title
  doc.fillColor("#141414").font("Times-Bold").fontSize(34)
    .text("Certificat de participation", 0, 104, { width: W, align: "center" });

  // Rule under title
  doc.lineWidth(1).strokeColor(primary).moveTo(cx - 90, 152).lineTo(cx + 90, 152).stroke();

  // Body
  doc.fillColor("#666666").font("Times-Italic").fontSize(14)
    .text("Ce certificat atteste que", 0, 172, { width: W, align: "center" });

  doc.fillColor("#141414").font("Times-Bold").fontSize(30)
    .text(badge.recipientName, 60, 196, { width: W - 120, align: "center" });

  doc.fillColor("#444444").font("Times-Roman").fontSize(14)
    .text(statement, 120, 244, { width: W - 240, align: "center" });

  doc.fillColor("#888888").font("Helvetica").fontSize(10)
    .text(`Fait le ${dateFr} · ${place}`, 0, 286, { width: W, align: "center" });

  // Badge medallion (the badge image) — centered seal
  drawBadgeMedallion(doc, cx, 372, 52, badge.badgeType, badge.recipientName, badge.subtype ?? null, year);

  // Bottom-left: signature block
  const baseY = H - 96;
  doc.lineWidth(0.75).strokeColor("#cccccc").moveTo(70, baseY).lineTo(240, baseY).stroke();
  doc.fillColor("#333333").font("Times-Bold").fontSize(11).text("EyesOpen Security", 70, baseY + 6, { width: 170, align: "center" });
  doc.fillColor("#999999").font("Helvetica").fontSize(8).text("Comité d'organisation", 70, baseY + 22, { width: 170, align: "center" });

  // Bottom-right: QR + verification
  const qrSize = 68;
  const qrX = W - 70 - qrSize;
  const qrY = baseY - 34;
  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
  doc.fillColor("#666666").font("Helvetica").fontSize(7)
    .text("Vérifiez l'authenticité", qrX - 60, qrY + 8, { width: 56, align: "right" });
  doc.fillColor("#999999").font("Helvetica").fontSize(6)
    .text(opts.verifyUrl, qrX - 160, qrY + 22, { width: 156, align: "right", link: opts.verifyUrl });
  doc.fillColor("#bbbbbb").font("Helvetica").fontSize(5.5)
    .text(`ID: ${badge.uuid}`, qrX - 160, qrY + 40, { width: 156, align: "right" });

  // Footer center
  doc.fillColor("#bbbbbb").font("Helvetica").fontSize(7)
    .text("Services ExamBoot Inc. · eyesopensecurity.com · Open Badges V3 · W3C Verifiable Credential", 0, H - 44, { width: W, align: "center" });

  doc.end();
  await new Promise<void>(res => doc.on("end", res));
  return Buffer.concat(chunks);
}

export type { BadgeType };
