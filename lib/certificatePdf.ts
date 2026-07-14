import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import SVGtoPDF from "svg-to-pdfkit";
import fs from "fs";
import path from "path";
import { generateBadgeSvg, type BadgeType } from "@/lib/badgeSvg";
import { computeCPE } from "@/lib/livePresence";

const BADGE_COLORS: Record<string, string> = {
  participant: "#00a86b", speaker: "#cc0000", volunteer: "#e05a00",
  ctf_competitor: "#0090c0", ctf_winner: "#c79a00", organizer: "#9900cc",
};

type Lang = "fr" | "en";

// Participation statement per badge type, per language. Short on purpose so the
// certificate stays clean.
const STATEMENTS: Record<Lang, Record<string, string>> = {
  fr: {
    participant:    "a participé à EOCON 2026, la convention EyesOpen Cybersecurity.",
    speaker:        "est intervenu·e en qualité de conférencier·ère lors d'EOCON 2026.",
    volunteer:      "a contribué en tant que bénévole à l'organisation d'EOCON 2026.",
    ctf_competitor: "a pris part à la compétition EyesOpenCTF 2026 (Capture The Flag).",
    ctf_winner:     "s'est distingué·e parmi les meilleurs de la compétition EyesOpenCTF 2026.",
    organizer:      "a fait partie de l'équipe organisatrice d'EOCON 2026.",
  },
  en: {
    participant:    "attended EOCON 2026, the EyesOpen Cybersecurity Convention.",
    speaker:        "spoke as a conference presenter at EOCON 2026.",
    volunteer:      "contributed as a volunteer to the organisation of EOCON 2026.",
    ctf_competitor: "competed in the EyesOpenCTF 2026 Capture The Flag competition.",
    ctf_winner:     "ranked among the top competitors of EyesOpenCTF 2026.",
    organizer:      "served on the organising team of EOCON 2026.",
  },
};

const L: Record<Lang, Record<string, string>> = {
  fr: {
    kicker2: "EYESOPEN CYBERSECURITY CONVENTION",
    title: "Certificat de participation",
    attests: "Ce certificat atteste que",
    doneAt: "Fait le",
    committee: "Comité d'organisation",
    verify: "Vérifiez l'authenticité",
    footer: "Services ExamBoot Inc. · eyesopensecurity.com · Open Badges V3 · W3C Verifiable Credential",
    cpe: "crédits CPE",
    inSession: "de présence en session",
  },
  en: {
    kicker2: "EYESOPEN CYBERSECURITY CONVENTION",
    title: "Certificate of Participation",
    attests: "This certifies that",
    doneAt: "Issued on",
    committee: "Organizing Committee",
    verify: "Verify authenticity",
    footer: "Services ExamBoot Inc. · eyesopensecurity.com · Open Badges V3 · W3C Verifiable Credential",
    cpe: "CPE credits",
    inSession: "attended in session",
  },
};

// DejaVu fonts bundled in-repo: full glyph coverage for the badge icons
// (◈ ◆ ◉ ◎ ⚡) that pdfkit's built-in Helvetica lacks. Traced into the
// standalone output via next.config.js outputFileTracingIncludes.
const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
function registerFonts(doc: PDFKit.PDFDocument): boolean {
  try {
    doc.registerFont("DVSans", fs.readFileSync(path.join(FONT_DIR, "DejaVuSans.ttf")));
    doc.registerFont("DVSans-Bold", fs.readFileSync(path.join(FONT_DIR, "DejaVuSans-Bold.ttf")));
    doc.registerFont("DVMono", fs.readFileSync(path.join(FONT_DIR, "DejaVuSansMono.ttf")));
    doc.registerFont("DVMono-Bold", fs.readFileSync(path.join(FONT_DIR, "DejaVuSansMono-Bold.ttf")));
    doc.registerFont("DVSerif", fs.readFileSync(path.join(FONT_DIR, "DejaVuSerif.ttf")));
    return true;
  } catch {
    return false; // fall back to pdfkit's built-in fonts
  }
}

// Draw the ORIGINAL OBv3 badge image (the SVG that the credential itself
// references as its achievement image) into the PDF as vectors.
function drawBadgeSvg(
  doc: PDFKit.PDFDocument,
  hasDejaVu: boolean,
  cx: number,
  top: number,
  width: number,
  badgeType: BadgeType,
  recipientName: string,
  subtype: string | null,
  year: string,
) {
  let svg = generateBadgeSvg(badgeType, recipientName, year, subtype);
  // 🏆 (U+1F3C6) is a color-emoji-only glyph that no embeddable PDF font
  // provides — substitute a star for the winner icon in the PDF rendering.
  svg = svg.replace(/🏆/g, "★");

  const height = width * (330 / 300); // badge viewBox is 300×330
  SVGtoPDF(doc, svg, cx - width / 2, top, {
    width,
    height,
    preserveAspectRatio: "xMidYMid meet",
    fontCallback: (family: string, bold: boolean) => {
      if (!hasDejaVu) return bold ? "Helvetica-Bold" : "Helvetica";
      const f = family.toLowerCase();
      if (f.includes("mono")) return bold ? "DVMono-Bold" : "DVMono";
      // Check "sans" BEFORE "serif": "sans-serif" contains the substring
      // "serif", and the icon glyphs (⚡ ◈ ◆ ◉ ◎) only exist in DejaVuSans.
      if (f.includes("sans")) return bold ? "DVSans-Bold" : "DVSans";
      if (f.includes("georgia") || f.includes("serif")) return "DVSerif";
      return bold ? "DVSans-Bold" : "DVSans";
    },
    warningCallback: () => {},
  });
  return height;
}

export interface CertificateBadge {
  uuid: string;
  badgeType: string;
  recipientName: string;
  subtype?: string | null;
  issuedAt: Date | string;
}

export interface CertificateOpts {
  verifyUrl: string;
  lang?: Lang;
  venue?: string;
  city?: string;
  dateFr?: string;
  dateEn?: string;
  year?: string;
  // Minutes attended in session (participants) — renders the hours + CPE line.
  totalMinutes?: number | null;
}

function formatHours(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return m > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

// Build the "Certificat de participation" PDF (A4 landscape, minimalist),
// featuring the original OBv3 badge image. FR/EN via opts.lang.
export async function buildParticipationCertificate(
  badge: CertificateBadge,
  opts: CertificateOpts,
): Promise<Buffer> {
  const lang: Lang = opts.lang === "en" ? "en" : "fr";
  const t = L[lang];
  const year = opts.year || "2026";
  const primary = BADGE_COLORS[badge.badgeType] || BADGE_COLORS.participant;
  const statement = STATEMENTS[lang][badge.badgeType] || STATEMENTS[lang].participant;
  const date = lang === "en" ? (opts.dateEn || "November 28, 2026") : (opts.dateFr || "28 novembre 2026");
  const place = [opts.venue, opts.city].filter(Boolean).join(", ") || (lang === "en" ? "Douala, Cameroon" : "Douala, Cameroun");

  const qrBuffer = await QRCode.toBuffer(opts.verifyUrl, { width: 220, margin: 1, color: { dark: "#111111", light: "#ffffff" } });

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
  const hasDejaVu = registerFonts(doc);
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));

  const W = doc.page.width;   // 842
  const H = doc.page.height;  // 595

  // Background + double border in the badge colour
  doc.rect(0, 0, W, H).fill("#fdfdfb");
  doc.lineWidth(2).strokeColor(primary).rect(24, 24, W - 48, H - 48).stroke();
  doc.lineWidth(0.75).strokeColor(primary).opacity(0.55).rect(32, 32, W - 64, H - 64).stroke();
  doc.opacity(1);

  const cx = W / 2;

  // Kicker
  doc.fillColor(primary).font("Helvetica-Bold").fontSize(11)
    .text(`EOCON ${year}`, 0, 60, { width: W, align: "center", characterSpacing: 6 });
  doc.fillColor("#999999").font("Helvetica").fontSize(8)
    .text(t.kicker2, 0, 76, { width: W, align: "center", characterSpacing: 3 });

  // Title
  doc.fillColor("#141414").font("Times-Bold").fontSize(32)
    .text(t.title, 0, 96, { width: W, align: "center" });

  // Rule under title
  doc.lineWidth(1).strokeColor(primary).moveTo(cx - 90, 141).lineTo(cx + 90, 141).stroke();

  // Body
  doc.fillColor("#666666").font("Times-Italic").fontSize(13)
    .text(t.attests, 0, 158, { width: W, align: "center" });

  doc.fillColor("#141414").font("Times-Bold").fontSize(28)
    .text(badge.recipientName, 60, 180, { width: W - 120, align: "center" });

  doc.fillColor("#444444").font("Times-Roman").fontSize(14)
    .text(statement, 120, 224, { width: W - 240, align: "center" });

  // Hours in session + CPE credits (participants with tracked presence)
  let metaY = 258;
  if (opts.totalMinutes && opts.totalMinutes > 0) {
    const cpe = computeCPE(opts.totalMinutes);
    doc.fillColor(primary).font("Helvetica-Bold").fontSize(11)
      .text(`${formatHours(opts.totalMinutes)} ${t.inSession}  ·  ${cpe} ${t.cpe}`, 0, metaY, { width: W, align: "center", characterSpacing: 0.5 });
    metaY += 20;
  }

  doc.fillColor("#888888").font("Helvetica").fontSize(10)
    .text(`${t.doneAt} ${date} · ${place}`, 0, metaY, { width: W, align: "center" });

  // The ORIGINAL badge image (same SVG as the OBv3 credential), as vectors
  const badgeW = 118;
  const badgeTop = metaY + 24;
  drawBadgeSvg(doc, hasDejaVu, cx, badgeTop, badgeW, badge.badgeType as BadgeType, badge.recipientName, badge.subtype ?? null, year);

  // Bottom-left: signature block
  const baseY = H - 96;
  doc.lineWidth(0.75).strokeColor("#cccccc").moveTo(70, baseY).lineTo(240, baseY).stroke();
  doc.fillColor("#333333").font("Times-Bold").fontSize(12).text("EOCON", 70, baseY + 6, { width: 170, align: "center" });
  doc.fillColor("#999999").font("Helvetica").fontSize(8).text(t.committee, 70, baseY + 22, { width: 170, align: "center" });

  // Bottom-right: QR + verification
  const qrSize = 68;
  const qrX = W - 70 - qrSize;
  const qrY = baseY - 34;
  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
  doc.fillColor("#666666").font("Helvetica").fontSize(7)
    .text(t.verify, qrX - 160, qrY + 8, { width: 156, align: "right" });
  doc.fillColor("#999999").font("Helvetica").fontSize(6)
    .text(opts.verifyUrl, qrX - 160, qrY + 22, { width: 156, align: "right", link: opts.verifyUrl });
  doc.fillColor("#bbbbbb").font("Helvetica").fontSize(5.5)
    .text(`ID: ${badge.uuid}`, qrX - 160, qrY + 40, { width: 156, align: "right" });

  // Footer center
  doc.fillColor("#bbbbbb").font("Helvetica").fontSize(7)
    .text(t.footer, 0, H - 44, { width: W, align: "center" });

  doc.end();
  await new Promise<void>(res => doc.on("end", res));
  return Buffer.concat(chunks);
}

export type { BadgeType };
