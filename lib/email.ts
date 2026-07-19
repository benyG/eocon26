/// <reference types="node" />
import { Resend } from "resend";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { generateQrPayload, signConnectRef } from "@/lib/qr";
import { renderTemplate, getTransactionalTemplate } from "@/lib/renderTemplate";
import { getEventSettings } from "@/lib/settings";
import { prisma } from "@/lib/db";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || "");
}
const FROM = process.env.EMAIL_FROM || "EOCON 2026 <noreply@eyesopensecurity.com>";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

// ── Cyberpunk email wrapper ───────────────────────────────────────────────────
// Email clients strip <style> and animations — we use inline CSS only.
// "Glitch" effect: double text-shadow in cyan + magenta on the title.

function emailWrap(body: string, isFr: boolean, s?: Record<string, string>, opts?: { lore?: boolean }): string {
  const venue = s?.event_venue || "Hotel Onomo";
  const city = s?.event_city || "Douala";
  const country = isFr ? (s?.event_country || "Cameroun") : (s?.event_country_en || s?.event_country || "Cameroon");
  // CTF-lore emails wear the EyesOpenCTF identity instead of the EOCON one.
  const lore = !!opts?.lore;
  const sysLine = lore ? "&gt;_ EYESOPEN_PROTOCOL" : "&gt;_ EOCON_SYSTEM";
  const brandTitle = lore ? "EyesOpenCTF 2026" : "EOCON 2026";
  const brandTag = lore ? (isFr ? "Protocole EyesOpen // La Convergence" : "EyesOpen Protocol // The Convergence") : "EOCON Cybersecurity Event";
  const locLine = lore ? "EyesOpen Protocol" : "DOUALA · CMR";
  const footer = lore
    ? `EyesOpenCTF 2026 · ${isFr ? "Protocole EyesOpen" : "EyesOpen Protocol"}`
    : `EOCON 2026 · EyesOpen Security · ${venue}, ${city}, ${country}`;
  const hashtags = lore ? "#EyesOpenCTF · #TheConvergence" : "#EOCON · #CyberAfrica";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#030408;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#030408;">
<tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0a0a12;border:1px solid #00ff9d33;border-radius:12px;overflow:hidden;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#050a0e 0%,#0a1628 100%);padding:28px 32px;border-bottom:2px solid #00ff9d;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <div style="font-family:'Courier New',Courier,monospace;font-size:9px;color:#00ff9d;letter-spacing:4px;margin-bottom:4px;">${sysLine}</div>
          <div style="font-family:'Courier New',Courier,monospace;font-size:28px;font-weight:900;color:#00ff9d;letter-spacing:3px;text-shadow:-2px 0 #ff00ff40, 2px 0 #00ffff40;">${brandTitle}</div>
          <div style="font-family:'Courier New',Courier,monospace;font-size:9px;color:#00ff9d80;letter-spacing:3px;margin-top:4px;">${brandTag}</div>
        </td>
        <td align="right" style="vertical-align:top;">
          <div style="font-family:'Courier New',Courier,monospace;font-size:9px;color:#00ff9d40;letter-spacing:2px;">28.11.2026</div>
          <div style="font-family:'Courier New',Courier,monospace;font-size:9px;color:#00ff9d40;letter-spacing:1px;">${locLine}</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Scanline accent bar -->
  <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#00ff9d,transparent);"></td></tr>

  <!-- Body -->
  <tr><td style="padding:32px;font-family:'Courier New',Courier,monospace;color:#ffffff;font-size:14px;line-height:1.7;">
    ${body}
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 32px;border-top:1px solid #00ff9d20;background:#050508;">
    <div style="font-family:'Courier New',Courier,monospace;font-size:10px;color:#00ff9d60;text-align:center;letter-spacing:1px;">${footer}</div>
    <div style="font-family:'Courier New',Courier,monospace;font-size:10px;color:#333;text-align:center;margin-top:6px;letter-spacing:2px;">${hashtags}</div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

// Wrap arbitrary campaign body HTML in the branded EOCON shell. Exposed so the
// campaign sender and the admin preview render identically.
export async function wrapCampaignHtml(body: string, lang: "fr" | "en" = "fr"): Promise<string> {
  const s = await getEventSettings().catch(() => ({} as Record<string, string>));
  return emailWrap(body, lang === "fr", s);
}

// Reusable HTML chunks
const greenLabel = (txt: string) => `<span style="color:#00ff9d;font-weight:bold;">${txt}</span>`;
const neonBox = (content: string) =>
  `<div style="background:#0d1117;border:1px solid #00ff9d40;border-radius:8px;padding:20px;margin:20px 0;">${content}</div>`;
const neonRow = (label: string, value: string) =>
  `<tr><td style="padding:6px 0;color:#00ff9d80;font-size:12px;width:140px;">${label}</td><td style="padding:6px 0;color:#ffffff;font-size:13px;">${value}</td></tr>`;
const ctaButton = (href: string, label: string) =>
  `<div style="text-align:center;margin:24px 0;"><a href="${href}" style="background:#00ff9d;color:#000000;font-family:'Courier New',Courier,monospace;font-size:13px;font-weight:900;letter-spacing:2px;padding:14px 32px;border-radius:8px;text-decoration:none;display:inline-block;">${label}</a></div>`;

// Base URL for hosted email images (public/email/*). Remote-image safe: degrades
// to alt text if a client blocks images.
const emailAssetBase = () =>
  (process.env.NEXT_PUBLIC_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://eyesopensecurity.com").replace(/\/$/, "");

// A lore "transmission" header: circular profile photo of the in-universe sender
// (The Watcher / NORA-7) with a name + status line, in the house style.
const senderHeader = (avatarFile: string, name: string, status: string) =>
  `<table cellpadding="0" cellspacing="0" style="margin:0 0 22px;"><tr>
    <td style="vertical-align:middle;padding-right:14px;">
      <img src="${emailAssetBase()}/email/${avatarFile}" width="60" height="60" alt="${esc(name)}" style="width:60px;height:60px;border-radius:50%;border:1px solid #00ff9d80;display:block;" />
    </td>
    <td style="vertical-align:middle;">
      <div style="font-family:'Courier New',Courier,monospace;color:#00ff9d;font-weight:bold;letter-spacing:2px;font-size:13px;">${esc(name)}</div>
      <div style="font-family:'Courier New',Courier,monospace;color:#00ff9d80;font-size:10px;letter-spacing:2px;margin-top:3px;">${esc(status)}</div>
    </td>
  </tr></table>`;

const transmissionLine = (txt: string) =>
  `<div style="font-family:'Courier New',Courier,monospace;font-size:10px;color:#00ff9d70;letter-spacing:2px;margin:0 0 16px;">${esc(txt)}</div>`;
const dateLine = (isFr: boolean, s?: Record<string, string>) => {
  const venue = s?.event_venue || "Hotel Onomo";
  const city = s?.event_city || "Douala";
  const country = isFr ? (s?.event_country || "Cameroun") : (s?.event_country_en || s?.event_country || "Cameroon");
  const time = s?.event_time_start ? s.event_time_start.replace(":", "h") : "08h00";
  const dateFr = s?.event_date_display_fr || "28 Novembre 2026";
  const dateEn = s?.event_date_display_en || "November 28, 2026";
  const label = isFr
    ? `${dateFr} · ${time} · ${venue}, ${city}, ${country}`
    : `${dateEn} · ${time.replace("h", ":")} · ${venue}, ${city}, ${country}`;
  return `<div style="margin-top:20px;padding:12px 16px;background:#050a05;border-left:3px solid #00ff9d60;border-radius:0 6px 6px 0;">
    <span style="font-size:12px;color:#00ff9d;letter-spacing:1px;">📅 ${label}</span>
  </div>`;
};

// ── ICS calendar attachment for the full event day ───────────────────────────

function buildEventICS(isFr: boolean, s?: Record<string, string>): Buffer {
  const venue = s?.event_venue || "Hotel Onomo";
  const city = s?.event_city || "Douala";
  const country = s?.event_country || "Cameroun";
  const rawDate = (s?.event_date || "2026-11-28").replace(/-/g, "");
  const rawTime = (s?.event_time_start || "08:00").replace(":", "") + "00";
  const dtStart = `${rawDate}T${rawTime}`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EOCON 2026//eyesopensecurity.com//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:EOCON 2026",
    "X-WR-TIMEZONE:Africa/Douala",
    "BEGIN:VEVENT",
    `UID:eocon2026-main@eyesopensecurity.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15)}Z`,
    `DTSTART;TZID=Africa/Douala:${dtStart}`,
    `DTEND;TZID=Africa/Douala:${rawDate}T190000`,
    `SUMMARY:EOCON 2026 — EOCON Cybersecurity Event`,
    `LOCATION:${venue}\\, ${city}\\, ${country}`,
    `DESCRIPTION:${isFr
      ? `Évènement cybersécurité africain — EyesOpen Security. ${city}, ${country}.`
      : `African cybersecurity event — EyesOpen Security. ${city}, ${country}.`}`,
    "URL:https://eyesopensecurity.com",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return Buffer.from(ics, "utf-8");
}

function googleCalEventUrl(isFr: boolean, s?: Record<string, string>): string {
  const venue = s?.event_venue || "Hotel Onomo";
  const city = s?.event_city || "Douala";
  const country = s?.event_country || "Cameroun";
  const rawDate = (s?.event_date || "2026-11-28").replace(/-/g, "");
  const rawTime = (s?.event_time_start || "08:00").replace(":", "") + "00";
  const dtStart = `${rawDate}T${rawTime}`;
  const text = encodeURIComponent("EOCON 2026 — EOCON Cybersecurity Event");
  const loc = encodeURIComponent(`${venue}, ${city}, ${country}`);
  const desc = encodeURIComponent(isFr
    ? `Évènement cybersécurité africain. eyesopensecurity.com`
    : `African cybersecurity event. eyesopensecurity.com`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dtStart}/${rawDate}T190000&location=${loc}&details=${desc}`;
}

// ── Badge PDF ─────────────────────────────────────────────────────────────────

// Fetch a sponsor logo (remote PNG/JPG) for embedding in the badge. PDFKit can't
// embed SVG, so those (and any failure) fall back to a text placeholder.
async function loadSponsorLogo(url: string | null): Promise<Buffer | null> {
  if (!url || !/^https?:\/\//.test(url)) return null;
  if (/\.svg($|\?)/i.test(url)) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    if (/svg/i.test(res.headers.get("content-type") || "")) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch { return null; }
}

// Up to 4 visible sponsors (tier-ranked) with their logo buffers, for the badge band.
async function loadBadgeSponsors(): Promise<{ name: string; logo: Buffer | null }[]> {
  try {
    const rows = await prisma.sponsor.findMany({ where: { isVisible: true } });
    const rank: Record<string, number> = { PLATINUM: 0, GOLD: 1, SILVER: 2, BRONZE: 3 };
    rows.sort((a, b) => (rank[a.tier] ?? 9) - (rank[b.tier] ?? 9) || a.sortOrder - b.sortOrder);
    return await Promise.all(rows.slice(0, 4).map(async (sp) => ({ name: sp.name, logo: await loadSponsorLogo(sp.logoUrl) })));
  } catch { return []; }
}

// ── A6 entry-ticket badge (105 × 148 mm, white, printable) ──────────────────────
// A proper ticket: attendee identity, a large check-in QR, a networking QR, and a
// reserved band for up to four sponsor logos.
async function generateBadgePdf(
  fname: string, lname: string, ticketType: string, ticketRef: string, qrBuffer: Buffer,
  opts?: { sponsors?: { name: string; logo: Buffer | null }[]; networkingQr?: Buffer | null; teamName?: string | null },
): Promise<Buffer> {
  const W = 298, H = 420, M = 22;                 // A6 portrait in points, side margin
  const sponsors = opts?.sponsors ?? [];
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [W, H], margin: 0, info: { Title: `EOCON 2026 — Ticket ${ticketRef}` } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(0, 0, W, H).fill("#ffffff");
    doc.rect(0, 0, 5, H).fill("#000000");         // left accent bar
    doc.lineWidth(1).strokeColor("#000000").rect(11, 11, W - 22, H - 22).stroke(); // ticket frame

    // Header
    doc.fillColor("#000000").font("Helvetica").fontSize(8).text("EOCON", M, 26, { characterSpacing: 4 });
    doc.font("Helvetica-Bold").fontSize(30).text("2026", M, 36);
    doc.rect(M, 76, 52, 1.5).fill("#000000");
    doc.fillColor("#000000").font("Helvetica").fontSize(7).text("EYESOPEN SECURITY", M, 82, { characterSpacing: 1.5 });
    // "ENTRY TICKET" tag, top-right
    doc.lineWidth(1).strokeColor("#000000").roundedRect(W - M - 92, 30, 92, 18, 3).stroke();
    doc.fillColor("#000000").font("Helvetica-Bold").fontSize(8).text("ENTRY TICKET", W - M - 92, 36, { width: 92, align: "center", characterSpacing: 2 });

    // Attendee
    doc.fillColor("#666666").font("Helvetica").fontSize(6.5).text("ATTENDEE", M, 108, { characterSpacing: 2 });
    doc.fillColor("#000000").font("Helvetica-Bold").fontSize(20).text(`${fname} ${lname}`.slice(0, 32), M, 118, { width: W - 2 * M });
    if (opts?.teamName) {
      doc.fillColor("#333333").font("Helvetica").fontSize(10).text(String(opts.teamName).slice(0, 34), M, 146, { width: W - 2 * M });
    }

    // Ticket type + reference
    const tt = ticketType.toUpperCase().slice(0, 22);
    doc.lineWidth(0.9).strokeColor("#000000").roundedRect(M, 168, doc.widthOfString(tt, { characterSpacing: 2 }) + 16, 16, 3).stroke();
    doc.fillColor("#000000").font("Helvetica").fontSize(8).text(tt, M + 8, 172, { characterSpacing: 2 });
    doc.fillColor("#000000").font("Courier").fontSize(8).text(ticketRef, M, 192, { characterSpacing: 1 });

    // Check-in QR (primary)
    const qs = 108, qx = (W - qs) / 2, qy = 216;
    doc.fillColor("#000000").font("Helvetica-Bold").fontSize(7.5).text("CHECK-IN · STAFF ONLY", 0, qy - 12, { width: W, align: "center", characterSpacing: 2 });
    try { doc.image(qrBuffer, qx, qy, { width: qs, height: qs }); } catch { /* skip */ }
    doc.fillColor("#666666").font("Helvetica").fontSize(6.5).text("Present this ticket at the event entrance.", 0, qy + qs + 4, { width: W, align: "center" });

    // Networking QR (secondary, small, top-right of the QR row)
    if (opts?.networkingQr) {
      const ns = 44, nx = W - M - ns, ny = qy + 4;
      try {
        doc.image(opts.networkingQr, nx, ny, { width: ns, height: ns });
        doc.fillColor("#666666").font("Helvetica").fontSize(5.5).text("NETWORKING", nx - 4, ny + ns + 2, { width: ns + 8, align: "center", characterSpacing: 1 });
      } catch { /* skip */ }
    }

    // Sponsor band (4 reserved slots)
    const bandY = H - 68;
    doc.moveTo(M, bandY - 8).lineTo(W - M, bandY - 8).dash(2, { space: 2 }).stroke("#bbbbbb");
    doc.undash();
    doc.fillColor("#888888").font("Helvetica").fontSize(6).text("PARTNERS · SPONSORS", M, bandY - 2, { characterSpacing: 2 });
    const slots = 4, gap = 7, slotW = (W - 2 * M - (slots - 1) * gap) / slots, slotH = 28, slotY = bandY + 10;
    for (let i = 0; i < slots; i++) {
      const sx = M + i * (slotW + gap);
      doc.lineWidth(0.6).strokeColor("#dddddd").roundedRect(sx, slotY, slotW, slotH, 3).stroke();
      const sp = sponsors[i];
      if (sp?.logo) {
        try { doc.image(sp.logo, sx + 3, slotY + 3, { fit: [slotW - 6, slotH - 6], align: "center", valign: "center" }); continue; } catch { /* fall through to name */ }
      }
      const label = sp ? sp.name.slice(0, 14) : "SPONSOR";
      doc.fillColor(sp ? "#555555" : "#cccccc").font("Helvetica").fontSize(6.5).text(label, sx, slotY + slotH / 2 - 4, { width: slotW, align: "center" });
    }

    doc.fillColor("#999999").font("Helvetica").fontSize(5.5).text("eyesopensecurity.com · EOCON 2026", M, H - 20, { characterSpacing: 1 });
    doc.end();
  });
}

// ── Template sender ───────────────────────────────────────────────────────────

async function sendWithTemplate(
  slug: string,
  to: string,
  vars: Record<string, string>,
  fallbackSubject: string,
  fallbackHtml: string,
  lang: "fr" | "en" = "fr",
  attachments?: Array<{ filename: string; content: Buffer; content_id?: string }>,
  replyTo?: string,
) {
  const tpl = lang === "en"
    ? (await getTransactionalTemplate(`${slug}_en`)) ?? (await getTransactionalTemplate(slug))
    : (await getTransactionalTemplate(slug));
  const subject = tpl ? renderTemplate(tpl.subject, vars) : fallbackSubject;
  const html = tpl ? renderTemplate(tpl.htmlBody, vars) : fallbackHtml;
  await getResend().emails.send({ from: FROM, to, subject, html, attachments, ...(replyTo ? { replyTo } : {}) });
}

// ── Public email functions ────────────────────────────────────────────────────

export async function sendCFPConfirmation(to: string, name: string, talkTitle: string, lang: "fr" | "en" = "fr", deferred = false) {
  const isFr = lang === "fr";
  const s = await getEventSettings().catch(() => ({} as Record<string, string>));
  const vars = { name: esc(name), talkTitle: esc(talkTitle) };
  const statusFr = deferred ? '<span style="color:#888;">Conservée pour la prochaine édition</span>' : '<span style="color:#ffaa00;">En cours d\'examen</span>';
  const statusEn = deferred ? '<span style="color:#888;">Kept for the next edition</span>' : '<span style="color:#ffaa00;">Under review</span>';
  const followFr = deferred
    ? `<p>Les soumissions pour l'édition en cours sont closes. Votre proposition est bien enregistrée et sera prise en compte pour la prochaine édition d'EOCON.</p>`
    : `<p>Notre équipe CFP examinera votre proposition et vous tiendra informé(e) de notre décision.</p>`;
  const followEn = deferred
    ? `<p>Submissions for the current edition are closed. Your proposal has been saved and will be considered for the next EOCON edition.</p>`
    : `<p>Our CFP team will review your proposal and keep you informed of our decision.</p>`;
  const body = isFr
    ? `<p>${greenLabel("Bonjour " + esc(name))},</p>
       <p>Votre proposition de talk a bien été reçue. Merci pour votre contribution !</p>
       ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
         ${neonRow("Talk", `<em>&ldquo;${esc(talkTitle)}&rdquo;</em>`)}
         ${neonRow("Statut", statusFr)}
       </tbody></table>`)}
       ${followFr}
       ${dateLine(isFr, s)}`
    : `<p>${greenLabel("Hello " + esc(name))},</p>
       <p>Your talk proposal has been received. Thank you for contributing!</p>
       ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
         ${neonRow("Talk", `<em>&ldquo;${esc(talkTitle)}&rdquo;</em>`)}
         ${neonRow("Status", statusEn)}
       </tbody></table>`)}
       ${followEn}
       ${dateLine(isFr, s)}`;
  await sendWithTemplate(
    "cfp_confirmation", to, vars,
    isFr ? `✅ Proposition de talk reçue — EOCON 2026` : `✅ Talk proposal received — EOCON 2026`,
    emailWrap(body, isFr, s), lang, undefined, "speakers@eyesopensecurity.com",
  );
}

export async function sendVolunteerConfirmation(to: string, name: string, lang: "fr" | "en" = "fr") {
  const isFr = lang === "fr";
  const s = await getEventSettings().catch(() => ({} as Record<string, string>));
  const body = isFr
    ? `<p>${greenLabel("Bonjour " + esc(name))},</p>
       <p>Votre candidature bénévole a bien été reçue. Nous l'examinerons et vous contacterons prochainement.</p>
       ${dateLine(isFr, s)}`
    : `<p>${greenLabel("Hello " + esc(name))},</p>
       <p>Your volunteer application has been received. We will review it and get back to you soon.</p>
       ${dateLine(isFr, s)}`;
  await sendWithTemplate(
    "volunteer_confirmation", to, { name: esc(name) },
    isFr ? `✅ Candidature bénévole reçue — EOCON 2026` : `✅ Volunteer application received — EOCON 2026`,
    emailWrap(body, isFr, s), lang, undefined, "registration@eyesopensecurity.com",
  );
}

export async function sendVolunteerAccepted(to: string, name: string, assignedRole: string, lang: "fr" | "en" = "fr") {
  const isFr = lang === "fr";
  const s = await getEventSettings().catch(() => ({} as Record<string, string>));
  const role = assignedRole || (isFr ? "À confirmer" : "To be confirmed");
  const body = isFr
    ? `<p>${greenLabel("Bonjour " + esc(name))},</p>
       <p>🎉 Excellente nouvelle ! Votre candidature bénévole a été <strong style="color:#00ff9d;">acceptée</strong>.</p>
       ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
         ${neonRow("Rôle assigné", `<strong style="color:#00ff9d;">${esc(role)}</strong>`)}
       </tbody></table>`)}
       <p>Bienvenue dans l'équipe EOCON ! Vous recevrez prochainement les détails logistiques.</p>
       ${dateLine(isFr, s)}`
    : `<p>${greenLabel("Hello " + esc(name))},</p>
       <p>🎉 Great news! Your volunteer application has been <strong style="color:#00ff9d;">accepted</strong>.</p>
       ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
         ${neonRow("Assigned role", `<strong style="color:#00ff9d;">${esc(role)}</strong>`)}
       </tbody></table>`)}
       <p>Welcome to the EOCON team! You will receive logistics details soon.</p>
       ${dateLine(isFr, s)}`;
  await sendWithTemplate(
    "volunteer_accepted", to, { name: esc(name), assignedRole: esc(role) },
    isFr ? `🎉 Candidature bénévole acceptée — EOCON 2026` : `🎉 Volunteer application accepted — EOCON 2026`,
    emailWrap(body, isFr, s), lang, undefined, "registration@eyesopensecurity.com",
  );
}

export async function sendVolunteerShortlisted(to: string, name: string, lang: "fr" | "en" = "fr") {
  const isFr = lang === "fr";
  const s = await getEventSettings().catch(() => ({} as Record<string, string>));
  const nameSafe = esc(name);
  const body = isFr
    ? `<p>${greenLabel("Bonjour " + nameSafe)},</p>
       <p>Votre candidature bénévole est en cours d'examen approfondi. Nous reviendrons vers vous très prochainement.</p>
       ${dateLine(isFr, s)}`
    : `<p>${greenLabel("Hello " + nameSafe)},</p>
       <p>Your volunteer application is under detailed review. We will get back to you very soon.</p>
       ${dateLine(isFr, s)}`;
  await sendWithTemplate("volunteer_shortlisted", to, { name: nameSafe },
    isFr ? `👀 Votre candidature bénévole — EOCON 2026` : `👀 Your volunteer application — EOCON 2026`,
    emailWrap(body, isFr, s), lang, undefined, "registration@eyesopensecurity.com",
  );
}

export async function sendVolunteerOnboarding(to: string, name: string, assignedRole: string, lang: "fr" | "en" = "fr") {
  const isFr = lang === "fr";
  const s = await getEventSettings().catch(() => ({} as Record<string, string>));
  const roleSafe = esc(assignedRole);
  const nameSafe = esc(name);
  const venue = s.event_venue || "Hotel Onomo";
  const city = s.event_city || "Douala";
  const dateFr = s.event_date_display_fr || "28 novembre 2026";
  const dateEn = s.event_date_display_en || "November 28, 2026";
  const body = isFr
    ? `<p>${greenLabel("Bonjour " + nameSafe)},</p>
       <p>Voici vos informations de mission pour EOCON 2026.</p>
       ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
         ${neonRow("Rôle", `<strong style="color:#00ff9d;">${roleSafe}</strong>`)}
         ${neonRow("Briefing", `${dateFr} · 07h30`)}
         ${neonRow("Lieu", `${venue}, ${city}`)}
       </tbody></table>`)}
       <p>Rendez-vous le ${dateFr} à partir de 07h30 pour le briefing équipe. Portez votre badge bénévole.</p>
       ${dateLine(isFr, s)}`
    : `<p>${greenLabel("Hello " + nameSafe)},</p>
       <p>Here are your mission details for EOCON 2026.</p>
       ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
         ${neonRow("Role", `<strong style="color:#00ff9d;">${roleSafe}</strong>`)}
         ${neonRow("Briefing", `${dateEn} · 07:30`)}
         ${neonRow("Venue", `${venue}, ${city}`)}
       </tbody></table>`)}
       <p>Join us on ${dateEn} from 07:30 for the team briefing. Wear your volunteer badge.</p>
       ${dateLine(isFr, s)}`;
  await sendWithTemplate("volunteer_onboarding", to, { name: nameSafe, assignedRole: roleSafe },
    isFr ? `🎽 Informations bénévole — EOCON 2026` : `🎽 Volunteer briefing — EOCON 2026`,
    emailWrap(body, isFr, s), lang, undefined, "registration@eyesopensecurity.com",
  );
}

export async function sendVolunteerRejected(to: string, name: string, lang: "fr" | "en" = "fr") {
  const isFr = lang === "fr";
  const s = await getEventSettings().catch(() => ({} as Record<string, string>));
  const nameSafe = esc(name);
  const body = isFr
    ? `<p>${greenLabel("Bonjour " + nameSafe)},</p>
       <p>Merci pour votre candidature bénévole à EOCON 2026. Après examen, nous ne sommes malheureusement pas en mesure de vous retenir pour cette édition.</p>
       <p>Nous apprécions votre intérêt et espérons vous revoir à EOCON 2027.</p>`
    : `<p>${greenLabel("Hello " + nameSafe)},</p>
       <p>Thank you for your EOCON 2026 volunteer application. After review, we are unfortunately unable to include you in this edition.</p>
       <p>We appreciate your interest and hope to see you at EOCON 2027.</p>`;
  await sendWithTemplate("volunteer_rejected", to, { name: nameSafe },
    isFr ? `Candidature bénévole — EOCON 2026` : `Volunteer application — EOCON 2026`,
    emailWrap(body, isFr, s), lang, undefined, "registration@eyesopensecurity.com",
  );
}

export async function sendCFPDecision(email: string, name: string, talkTitle: string, decision: "accepted" | "rejected", lang: "fr" | "en" = "fr"): Promise<void> {
  const isFr = lang === "fr";
  const s = await getEventSettings().catch(() => ({} as Record<string, string>));
  const vars = { name: esc(name), talkTitle: esc(talkTitle) };
  const slug = decision === "accepted" ? "cfp_accepted" : "cfp_rejected";
  const isAccepted = decision === "accepted";
  const body = isAccepted
    ? (isFr
        ? `<p>${greenLabel("Bonjour " + esc(name))},</p>
           <p>🎉 Votre proposition a été <strong style="color:#00ff9d;">sélectionnée</strong> pour EOCON 2026 !</p>
           ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
             ${neonRow("Talk", `<em>&ldquo;${esc(talkTitle)}&rdquo;</em>`)}
             ${neonRow("Statut", '<span style="color:#00ff9d;font-weight:bold;">✓ ACCEPTÉ</span>')}
           </tbody></table>`)}
           <p>L'équipe programme vous contactera prochainement pour les détails.</p>
           ${dateLine(isFr, s)}`
        : `<p>${greenLabel("Hello " + esc(name))},</p>
           <p>🎉 Your proposal has been <strong style="color:#00ff9d;">selected</strong> for EOCON 2026!</p>
           ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
             ${neonRow("Talk", `<em>&ldquo;${esc(talkTitle)}&rdquo;</em>`)}
             ${neonRow("Status", '<span style="color:#00ff9d;font-weight:bold;">✓ ACCEPTED</span>')}
           </tbody></table>`)}
           <p>The program team will contact you soon with the details.</p>
           ${dateLine(isFr, s)}`)
    : (isFr
        ? `<p>${greenLabel("Bonjour " + esc(name))},</p>
           <p>Merci pour votre proposition <em>&ldquo;${esc(talkTitle)}&rdquo;</em>. Après examen par notre comité, elle n'a malheureusement pas été retenue pour cette édition.</p>
           <p>La compétition était rude — nous espérons vous revoir à EOCON 2027.</p>`
        : `<p>${greenLabel("Hello " + esc(name))},</p>
           <p>Thank you for your proposal <em>&ldquo;${esc(talkTitle)}&rdquo;</em>. After review by our committee, it was unfortunately not selected for this edition.</p>
           <p>Competition was fierce — we hope to see you again at EOCON 2027.</p>`);
  const subject = isAccepted
    ? (isFr ? `🎉 CFP Accepté — EOCON 2026 : "${talkTitle}"` : `🎉 CFP Accepted — EOCON 2026: "${talkTitle}"`)
    : (isFr ? `CFP — EOCON 2026 : "${talkTitle}"` : `CFP — EOCON 2026: "${talkTitle}"`);
  await sendWithTemplate(slug, email, vars, subject, emailWrap(body, isFr, s), isFr ? "fr" : "en", undefined, "speakers@eyesopensecurity.com");
}

// ── Pilotage Global (steering) ────────────────────────────────────────────────

interface PilotageTaskLike {
  title: string;
  pole: string;
  phase: number;
  dueDate?: Date | string | null;
  priority?: string;
}
interface PilotageMeetingLike {
  id?: number;
  title: string;
  scheduledAt: Date | string;
  location?: string | null;
  agenda?: string | null;
  convenerEmail?: string | null;
}

function fmtFrDate(d?: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Douala" });
}

async function sendPilotage(to: string, subject: string, bodyInner: string) {
  if (!to) return;
  try {
    await getResend().emails.send({ from: FROM, to, subject, html: emailWrap(bodyInner, true) });
  } catch (e) {
    console.error("[pilotage email]", e);
  }
}

export async function sendPilotageTaskAssigned(to: string, name: string, task: PilotageTaskLike) {
  const body = `<p>${greenLabel("Bonjour " + esc(name || ""))},</p>
     <p>Une tâche du pilotage EOCON 2026 vous a été assignée.</p>
     ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
       ${neonRow("Tâche", `<strong style="color:#00ff9d;">${esc(task.title)}</strong>`)}
       ${neonRow("Pôle", esc(task.pole))}
       ${neonRow("Phase", String(task.phase))}
       ${neonRow("Échéance", fmtFrDate(task.dueDate))}
     </tbody></table>`)}
     <p>Connectez-vous au tableau de pilotage pour suivre son avancement.</p>`;
  await sendPilotage(to, `🎯 Nouvelle tâche assignée — ${task.title}`, body);
}

export async function sendPilotageDeadlineReminder(to: string, name: string, task: PilotageTaskLike, stage: string) {
  const label = stage === "J-3" ? "dans 3 jours" : stage === "J-1" ? "demain" : "aujourd'hui";
  const body = `<p>${greenLabel("Bonjour " + esc(name || ""))},</p>
     <p>⏰ Rappel : une tâche arrive à échéance <strong style="color:#ffaa00;">${label}</strong>.</p>
     ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
       ${neonRow("Tâche", `<strong style="color:#00ff9d;">${esc(task.title)}</strong>`)}
       ${neonRow("Pôle", esc(task.pole))}
       ${neonRow("Échéance", fmtFrDate(task.dueDate))}
     </tbody></table>`)}
     <p>Pensez à mettre à jour son statut une fois terminée.</p>`;
  await sendPilotage(to, `⏰ Rappel échéance (${stage}) — ${task.title}`, body);
}

export async function sendPilotageEscalation(coordoEmail: string, task: PilotageTaskLike) {
  const body = `<p>${greenLabel("Coordo Global")},</p>
     <p>🚨 Une tâche est <strong style="color:#ff3333;">en retard</strong> et n'a pas été marquée comme terminée.</p>
     ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
       ${neonRow("Tâche", `<strong style="color:#ff6666;">${esc(task.title)}</strong>`)}
       ${neonRow("Pôle", esc(task.pole))}
       ${neonRow("Échéance dépassée", fmtFrDate(task.dueDate))}
     </tbody></table>`)}
     <p>Une relance auprès du responsable peut être nécessaire.</p>`;
  await sendPilotage(coordoEmail, `🚨 Tâche en retard — ${task.title}`, body);
}

// Notify a designated approver that a communication (social publication or
// mailing campaign) is awaiting validation before it can go out.
export async function sendApprovalRequest(
  to: string,
  approverName: string,
  req: { title: string; kind: "social" | "campaign"; requestedBy: string },
) {
  const kindLabel = req.kind === "campaign" ? "Campagne mailing" : "Publication réseaux sociaux";
  const body = `<p>${greenLabel("Bonjour " + esc(approverName || ""))},</p>
     <p>🛡️ Une communication au nom d'EOCON 2026 requiert votre <strong style="color:#00ff9d;">validation</strong> avant d'être envoyée.</p>
     ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
       ${neonRow("Type", esc(kindLabel))}
       ${neonRow("Objet", `<strong style="color:#00ff9d;">${esc(req.title)}</strong>`)}
       ${neonRow("Soumis par", esc(req.requestedBy))}
     </tbody></table>`)}
     <p>Rendez-vous dans <strong>Communication → Approbations</strong> de l'espace admin pour valider ou refuser.</p>`;
  await sendPilotage(to, `🛡️ Validation requise — ${req.title}`, body);
}

export interface SponsorProspectLike {
  id: number;
  org: string;
  contact?: string | null;
  email?: string | null;
  package?: string | null;
  status: string;
}

// Follow-up reminder to the prospect's assignee (J+2 / J+5 / J+10 / J+15 cadence).
export async function sendSponsorFollowupReminder(
  to: string,
  name: string,
  prospect: SponsorProspectLike,
  stage: string,
  deadlineNote?: string,
) {
  const statusLabels: Record<string, string> = {
    contacted: "Contacté", meeting: "Réunion planifiée", positive: "Avancée positive",
  };
  const body = `<p>${greenLabel("Bonjour " + esc(name || ""))},</p>
     <p>⏰ Relance <strong style="color:#ffaa00;">${esc(stage)}</strong> — ce prospect sponsor attend un suivi de votre part.</p>
     ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
       ${neonRow("Organisation", `<strong style="color:#00ff9d;">${esc(prospect.org)}</strong>`)}
       ${prospect.contact ? neonRow("Contact", esc(prospect.contact)) : ""}
       ${prospect.email ? neonRow("Email", esc(prospect.email)) : ""}
       ${prospect.package ? neonRow("Package ciblé", esc(prospect.package)) : ""}
       ${neonRow("Statut", esc(statusLabels[prospect.status] || prospect.status))}
     </tbody></table>`)}
     ${deadlineNote ? `<p style="color:#ff6666;">⚡ ${esc(deadlineNote)}</p>` : ""}
     <p>Ouvrez le pipeline sponsors pour envoyer une relance ou planifier un échange.</p>`;
  await sendPilotage(to, `⏰ Relance sponsor (${stage}) — ${prospect.org}`, body);
}

function buildMeetingICS(to: string, meeting: PilotageMeetingLike & { convenerName?: string | null }): Buffer {
  const d = typeof meeting.scheduledAt === "string" ? new Date(meeting.scheduledAt) : (meeting.scheduledAt as Date);
  // Africa/Douala = UTC+1 year-round (no DST)
  const doualaMs = d.getTime() + 60 * 60000;
  const localD = new Date(doualaMs);
  const endD = new Date(doualaMs + 3600000); // +1 hour
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (dt: Date) =>
    `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00`;
  const dtStart = fmt(localD);
  const dtEnd = fmt(endD);
  const nowUtc = new Date();
  const dtstamp = `${nowUtc.getUTCFullYear()}${pad(nowUtc.getUTCMonth() + 1)}${pad(nowUtc.getUTCDate())}T${pad(nowUtc.getUTCHours())}${pad(nowUtc.getUTCMinutes())}${pad(nowUtc.getUTCSeconds())}Z`;
  const uid = `eocon-meeting-${meeting.id || d.getTime()}@eyesopensecurity.com`;
  const descLine = meeting.agenda ? `DESCRIPTION:${meeting.agenda.replace(/\n/g, "\\n").replace(/,/g, "\\,")}` : "";
  const locLine = meeting.location ? `LOCATION:${meeting.location.replace(/,/g, "\\,").replace(/\n/g, "\\n")}` : "";
  const orgLine = meeting.convenerEmail ? `ORGANIZER;CN=${meeting.convenerName || "EOCON"}:mailto:${meeting.convenerEmail}` : "";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EOCON 2026//eyesopensecurity.com//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=Africa/Douala:${dtStart}`,
    `DTEND;TZID=Africa/Douala:${dtEnd}`,
    `SUMMARY:${meeting.title.replace(/,/g, "\\,")}`,
    orgLine,
    locLine,
    descLine,
    `ATTENDEE;RSVP=TRUE:mailto:${to}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  return Buffer.from(lines, "utf-8");
}

function googleCalMeetingUrl(meeting: PilotageMeetingLike): string {
  const d = typeof meeting.scheduledAt === "string" ? new Date(meeting.scheduledAt) : (meeting.scheduledAt as Date);
  const doualaMs = d.getTime() + 60 * 60000;
  const localD = new Date(doualaMs);
  const endD = new Date(doualaMs + 3600000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (dt: Date) =>
    `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00`;
  const text = encodeURIComponent(meeting.title);
  const loc = meeting.location ? encodeURIComponent(meeting.location) : "";
  const desc = meeting.agenda ? encodeURIComponent(meeting.agenda) : "";
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${fmt(localD)}/${fmt(endD)}&ctz=Africa%2FDouala${loc ? `&location=${loc}` : ""}${desc ? `&details=${desc}` : ""}`;
}

export async function sendPilotageMeetingInvitation(to: string, meeting: PilotageMeetingLike & { convenerName?: string | null }) {
  const d = typeof meeting.scheduledAt === "string" ? new Date(meeting.scheduledAt) : (meeting.scheduledAt as Date);
  const dateFr = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Douala" });
  const timeFr = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Douala" });

  const locationDisplay = meeting.location
    ? (meeting.location.startsWith("https://")
        ? `<a href="${esc(meeting.location)}" style="color:#00ccff;" target="_blank">${esc(meeting.location)}</a>`
        : esc(meeting.location))
    : null;

  const gcalUrl = googleCalMeetingUrl(meeting);
  const icsBuffer = buildMeetingICS(to, meeting);

  const calLinks = `
<div style="margin-top:20px;padding:16px;background:#050a05;border:1px solid #00ff9d20;border-radius:8px;text-align:center;">
  <div style="font-family:'Courier New',Courier,monospace;font-size:10px;color:#00ff9d80;letter-spacing:2px;margin-bottom:10px;">📅 AJOUTER À VOTRE CALENDRIER</div>
  <a href="${gcalUrl}" style="display:inline-block;margin:4px 6px;padding:7px 16px;background:#0d1117;border:1px solid #00ff9d40;border-radius:6px;color:#00ff9d;font-family:'Courier New',Courier,monospace;font-size:11px;text-decoration:none;" target="_blank">📅 Google Calendar</a>
  <span style="display:inline-block;margin:4px 6px;padding:7px 16px;background:#0d1117;border:1px solid #00ff9d40;border-radius:6px;color:#00ff9d80;font-family:'Courier New',Courier,monospace;font-size:11px;">🗓 .ics joint (Outlook · Apple · iOS)</span>
</div>`;

  const body = `<p>${greenLabel("Bonjour")},</p>
     <p>Vous avez été convoqué(e) à une réunion de pilotage EOCON 2026.</p>
     ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
       ${neonRow("Réunion", `<strong style="color:#00ff9d;">${esc(meeting.title)}</strong>`)}
       ${neonRow("Date", dateFr)}
       ${neonRow("Heure", `${timeFr} <span style="color:#666;font-size:11px;">&mdash; Africa/Douala (UTC+1)</span>`)}
       ${locationDisplay ? neonRow("Lieu / Lien", locationDisplay) : ""}
       ${meeting.agenda ? neonRow("Ordre du jour", esc(meeting.agenda).replace(/\n/g, "<br>")) : ""}
       ${meeting.convenerName ? neonRow("Organisateur", esc(meeting.convenerName)) : ""}
     </tbody></table>`)}
     ${calLinks}`;
  try {
    await getResend().emails.send({
      from: FROM,
      to,
      subject: `📅 Invitation — ${meeting.title}`,
      html: emailWrap(body, true),
      attachments: [
        { filename: `reunion-${(meeting.id || "eocon")}.ics`, content: icsBuffer },
      ],
    });
  } catch (e) {
    console.error("[pilotage meeting invitation email]", e);
  }
}

export async function sendPilotageMeetingReminder(to: string, meeting: PilotageMeetingLike, stage: string) {
  const when = stage === "H-2" ? "dans 2 heures" : stage === "J0" ? "aujourd'hui" : "demain";
  const body = `<p>${greenLabel("Bonjour")},</p>
     <p>📅 Rappel : une réunion de pilotage a lieu <strong style="color:#00ff9d;">${when}</strong>.</p>
     ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
       ${neonRow("Réunion", `<strong style="color:#00ff9d;">${esc(meeting.title)}</strong>`)}
       ${neonRow("Date", fmtFrDate(meeting.scheduledAt))}
       ${meeting.location ? neonRow("Lieu", esc(meeting.location)) : ""}
       ${meeting.agenda ? neonRow("Ordre du jour", esc(meeting.agenda)) : ""}
     </tbody></table>`)}`;
  await sendPilotage(to, `📅 Rappel réunion (${stage}) — ${meeting.title}`, body);
}

// ── CTF challenge assignment ──────────────────────────────────────────────────

interface CTFChallengeLike {
  title: string;
  category: string;
  difficulty: string;
  points: number;
  status: string;
}

const CTF_STATUS_LABELS_FR: Record<string, string> = {
  idea: "Idée", in_progress: "En cours", testing: "En test", validated: "Validé", published: "Publié CTFd",
};

export async function sendCTFChallengeAssigned(to: string, name: string, challenge: CTFChallengeLike) {
  if (!to) return;
  const s = await getEventSettings().catch(() => ({} as Record<string, string>));
  const statusLabel = CTF_STATUS_LABELS_FR[challenge.status] || challenge.status;
  const body = `<p>${greenLabel("Bonjour " + esc(name || ""))},</p>
     <p>Un challenge du CTF EOCON 2026 (EyesOpenCTF) vous a été assigné. Vous en êtes désormais responsable.</p>
     ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
       ${neonRow("Challenge", `<strong style="color:#00ff9d;">${esc(challenge.title)}</strong>`)}
       ${neonRow("Catégorie", esc(challenge.category))}
       ${neonRow("Difficulté", esc(challenge.difficulty))}
       ${neonRow("Points", String(challenge.points))}
       ${neonRow("Statut", esc(statusLabel))}
     </tbody></table>`)}
     <p>Connectez-vous à l'espace d'administration (onglet ⚡ CTF → Challenges) pour faire avancer cette tâche et mettre à jour son statut.</p>
     ${dateLine(true, s)}`;
  try {
    await getResend().emails.send({
      from: FROM, to,
      subject: `🏁 Challenge CTF assigné — ${challenge.title}`,
      html: emailWrap(body, true, s),
    });
  } catch (e) {
    console.error("[ctf challenge assigned email]", e);
  }
}

export async function sendRegistrationPending(
  to: string, fname: string, lname: string, ticketType: string, ticketRef: string, paymentUrl: string,
  lang: "fr" | "en" = "fr",
) {
  const isFr = lang === "fr";
  const s = await getEventSettings().catch(() => ({} as Record<string, string>));
  const vars = { fname: esc(fname), lname: esc(lname), ticketType: esc(ticketType), ticketRef, paymentUrl };
  const body = isFr
    ? `<p>${greenLabel("Bonjour " + esc(fname) + " " + esc(lname))},</p>
       <p>Votre inscription a bien été enregistrée. Finalisez votre place en procédant au paiement.</p>
       ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
         ${neonRow("Référence", `<strong style="color:#00ff9d;font-size:16px;">${ticketRef}</strong>`)}
         ${neonRow("Billet", esc(ticketType))}
         ${neonRow("Statut", '<span style="color:#ffaa00;">⏳ En attente de paiement</span>')}
       </tbody></table>`)}
       ${ctaButton(paymentUrl, "💳 PROCÉDER AU PAIEMENT")}
       ${dateLine(isFr, s)}`
    : `<p>${greenLabel("Hello " + esc(fname) + " " + esc(lname))},</p>
       <p>Your registration has been recorded. Complete your spot by proceeding to payment.</p>
       ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
         ${neonRow("Reference", `<strong style="color:#00ff9d;font-size:16px;">${ticketRef}</strong>`)}
         ${neonRow("Ticket", esc(ticketType))}
         ${neonRow("Status", '<span style="color:#ffaa00;">⏳ Awaiting payment</span>')}
       </tbody></table>`)}
       ${ctaButton(paymentUrl, "💳 PROCEED TO PAYMENT")}
       ${dateLine(isFr, s)}`;
  await sendWithTemplate(
    "registration_pending", to, vars,
    isFr ? `⏳ Inscription enregistrée — EOCON 2026 [${ticketRef}]` : `⏳ Registration recorded — EOCON 2026 [${ticketRef}]`,
    emailWrap(body, isFr, s), lang, undefined, "registration@eyesopensecurity.com",
  );
}

export async function sendRegistrationTicket(
  to: string, fname: string, lname: string, ticketType: string, registrationId: number, ticketRef: string,
  lang: "fr" | "en" = "fr",
  liveToken?: string,
): Promise<boolean> {
  const isFr = lang === "fr";
  const s = await getEventSettings().catch(() => ({} as Record<string, string>));
  // Fetch ticket flags once. A CTF-only ticket (CTF access, no sessions/workshops)
  // needs neither an EOCON badge nor a check-in QR — only the CTF concerns the
  // competitor — so this EOCON ticket email is skipped entirely; they get The
  // Watcher's transmission instead.
  const ticketTypeRow = await prisma.ticketType.findUnique({ where: { slug: ticketType }, select: { includesCTF: true, includesSessions: true, includesWorkshops: true } }).catch(() => null);
  const isCTFOnly = (!!ticketTypeRow && ticketTypeRow.includesCTF && !ticketTypeRow.includesSessions && !ticketTypeRow.includesWorkshops)
    || (!ticketTypeRow && (/ctf.?only|ctf.?seul|eyesopenctf.?only/i.test(ticketType) || ticketType.toLowerCase() === "ctf"));
  if (isCTFOnly) return false;
  const hasCtfAccess = !!ticketTypeRow?.includesCTF;
  const watcherNote = hasCtfAccess
    ? (isFr
      ? `<div style="margin:16px 0;padding:16px 18px;background:#050a12;border:1px solid #00ccff40;border-radius:8px;font-size:13px;color:#bfe;line-height:1.65;">
          🛰️ <strong style="color:#00ccff;">EyesOpenCTF — transmission entrante.</strong> Une communication séparée de <strong>The Watcher</strong> va suivre : elle vous initie à l'opération et à votre rôle d'<strong>Operator</strong>. Surveillez votre boîte de réception.
         </div>`
      : `<div style="margin:16px 0;padding:16px 18px;background:#050a12;border:1px solid #00ccff40;border-radius:8px;font-size:13px;color:#bfe;line-height:1.65;">
          🛰️ <strong style="color:#00ccff;">EyesOpenCTF — incoming transmission.</strong> A separate message from <strong>The Watcher</strong> will follow: it initiates you into the operation and your role as an <strong>Operator</strong>. Watch your inbox.
         </div>`)
    : "";
  const domain = process.env.DOMAIN || process.env.NEXT_PUBLIC_URL || "eyesopensecurity.com";
  const baseUrl = domain.startsWith("http") ? domain : `https://${domain}`;
  const connectUrl = `${baseUrl}/connect/${ticketRef}?sig=${signConnectRef(ticketRef)}`;

  const qrPayload = generateQrPayload(registrationId);
  const qrString = `${baseUrl}/checkin/${qrPayload}`;

  // QR codes
  const accessQrBuffer = await QRCode.toBuffer(qrString, {
    width: 300, margin: 2, color: { dark: "#000000", light: "#ffffff" },
  }) as Buffer;
  const connectQrBuffer = await QRCode.toBuffer(connectUrl, {
    width: 256, margin: 2, color: { dark: "#000000", light: "#ffffff" },
  }) as Buffer;

  // PDF entry ticket (A6): identity + big check-in QR + networking QR + sponsor band.
  let badgePdf: Buffer | null = null;
  try {
    const sponsors = await loadBadgeSponsors();
    badgePdf = await generateBadgePdf(fname, lname, ticketType, ticketRef, accessQrBuffer, { sponsors, networkingQr: connectQrBuffer });
  } catch (e) {
    console.error("[Badge PDF generation failed]", e);
  }

  // QR code wrapped in a ticket card for check-in staff
  const qrImg = `
<div style="text-align:center;margin:24px 0;">
  <div style="display:inline-block;background:#0a0f0a;border:1px solid #00ff9d33;border-radius:14px;padding:20px 28px;">
    <div style="font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:3px;color:#00ff9d80;text-transform:uppercase;margin-bottom:14px;">
      ${isFr ? "QR DE POINTAGE — STAFF UNIQUEMENT" : "CHECK-IN QR — STAFF ONLY"}
    </div>
    <img src="cid:qr_access" alt="${isFr ? "QR Check-in" : "Check-in QR"}" width="200" height="200" style="border:3px solid #00ff9d;border-radius:10px;display:block;" />
    <div style="font-family:'Courier New',Courier,monospace;font-size:8px;color:#00ff9d50;margin-top:12px;letter-spacing:2px;">${ticketRef}</div>
    <div style="font-family:sans-serif;font-size:10px;color:#555;margin-top:6px;">
      ${isFr ? "Présentez ce QR au staff à l'entrée de l'événement." : "Show this QR to staff at the event entrance."}
    </div>
  </div>
</div>`;

  // The printable badge/ticket is the attached A6 PDF (with both QR codes + sponsors);
  // this email block just points to it.
  const ticketPdfNote = isFr
    ? `<div style="margin-top:24px;padding:16px;background:#0d1117;border:1px solid #00ccff30;border-radius:8px;">
         <p style="color:#00ccff;font-size:11px;letter-spacing:2px;margin:0 0 8px;">🎟️ VOTRE BILLET D'ENTRÉE (PDF · A6)</p>
         <p style="font-size:12px;color:#aaa;line-height:1.7;margin:0;">Votre billet est en pièce jointe (format A6, prêt à imprimer). Présentez le <strong style="color:#00ff9d;">QR de pointage</strong> au staff à l'entrée. Il porte aussi votre <strong>QR networking</strong>.</p>
       </div>`
    : `<div style="margin-top:24px;padding:16px;background:#0d1117;border:1px solid #00ccff30;border-radius:8px;">
         <p style="color:#00ccff;font-size:11px;letter-spacing:2px;margin:0 0 8px;">🎟️ YOUR ENTRY TICKET (PDF · A6)</p>
         <p style="font-size:12px;color:#aaa;line-height:1.7;margin:0;">Your ticket is attached (A6, print-ready). Show the <strong style="color:#00ff9d;">check-in QR</strong> to staff at the entrance. It also carries your <strong>networking QR</strong>.</p>
       </div>`;

  // Calendar invite links
  const gcalUrl = googleCalEventUrl(isFr, s);
  const calLinks = `
<div style="margin-top:20px;padding:16px;background:#050a05;border:1px solid #00ff9d20;border-radius:8px;text-align:center;">
  <div style="font-family:'Courier New',Courier,monospace;font-size:10px;color:#00ff9d80;letter-spacing:2px;margin-bottom:10px;">
    ${isFr ? "📅 AJOUTER AU CALENDRIER" : "📅 ADD TO CALENDAR"}
  </div>
  <a href="${gcalUrl}" style="display:inline-block;margin:4px 6px;padding:7px 16px;background:#0d1117;border:1px solid #00ff9d40;border-radius:6px;color:#00ff9d;font-family:'Courier New',Courier,monospace;font-size:11px;text-decoration:none;" target="_blank">
    📅 Google Calendar
  </a>
  <a href="cid:event_ics" style="display:inline-block;margin:4px 6px;padding:7px 16px;background:#0d1117;border:1px solid #00ff9d40;border-radius:6px;color:#00ff9d;font-family:'Courier New',Courier,monospace;font-size:11px;text-decoration:none;">
    🗓 ${isFr ? "Télécharger .ics" : "Download .ics"} (Outlook · Apple)
  </a>
</div>`;

  const ctfOnlyNote = isFr
    ? `<div style="margin:16px 0;padding:14px 16px;background:#1a0a00;border:1px solid #ff990033;border-radius:8px;font-family:sans-serif;font-size:12px;color:#ffaa00;line-height:1.6;">
        ℹ️ <strong>Accès EyesOpenCTF uniquement.</strong> Ce billet vous donne accès exclusivement à la compétition CTF. Il ne comprend pas l'accès aux conférences, workshops ou à l'espace exposition d'EOCON 2026.
       </div>`
    : `<div style="margin:16px 0;padding:14px 16px;background:#1a0a00;border:1px solid #ff990033;border-radius:8px;font-family:sans-serif;font-size:12px;color:#ffaa00;line-height:1.6;">
        ℹ️ <strong>EyesOpenCTF access only.</strong> This ticket grants access exclusively to the CTF competition. It does not include access to EOCON 2026 talks, workshops, or the exhibition area.
       </div>`;

  const livePresenceBaseUrl = process.env.NEXT_PUBLIC_URL || process.env.NEXT_PUBLIC_BASE_URL || baseUrl;
  const livePresenceBlock = liveToken
    ? `<div style="margin-top:16px;padding:14px 16px;background:#050a05;border:1px solid #00ff9d30;border-radius:8px;text-align:center;">
         <p style="font-family:'Courier New',Courier,monospace;font-size:10px;color:#00ff9d80;letter-spacing:2px;margin:0 0 8px;">
           ${isFr ? "📡 SUIVI DE PRÉSENCE EN LIGNE" : "📡 ONLINE PRESENCE TRACKING"}
         </p>
         <p style="font-size:11px;color:#888;margin:0 0 10px;">
           ${isFr
             ? "Accédez à l’évènement en ligne via votre lien personnel de suivi."
             : "Join the online event via your personal tracking link."}
         </p>
         <a href="${livePresenceBaseUrl}/live?t=${liveToken}" style="display:inline-block;padding:8px 20px;background:#00ff9d;color:#000;font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:bold;text-decoration:none;border-radius:6px;letter-spacing:1px;">
           ${isFr ? "🔗 REJOINDRE EN LIGNE" : "🔗 JOIN ONLINE"}
         </a>
       </div>`
    : "";

  const body = isFr
    ? `<p>${greenLabel("Bonjour " + esc(fname) + " " + esc(lname))},</p>
       <p>${isCTFOnly ? "🏁 Votre accès <strong>EyesOpenCTF</strong> est confirmé. Préparez-vous — le challenge commence bientôt !" : "🎟️ Votre billet EOCON 2026 est confirmé. On vous attend du 23 au 28 novembre en ligne et à Douala !"}</p>
       ${isCTFOnly ? ctfOnlyNote : ""}
       ${neonBox(`<table cellpadding="0" cellspacing="0" width="100%"><tbody>
         ${neonRow("Participant", `<strong>${esc(fname)} ${esc(lname)}</strong>`)}
         ${neonRow("Billet", esc(ticketType))}
         ${neonRow("Référence", `<strong style="color:#00ff9d;font-size:15px;">${ticketRef}</strong>`)}
         ${neonRow("Statut", '<span style="color:#00ff9d;font-weight:bold;">✓ CONFIRMÉ</span>')}
       </tbody></table>`)}
       ${watcherNote}
       ${qrImg}
       ${isCTFOnly ? "" : calLinks}
       ${livePresenceBlock}
       ${ticketPdfNote}
       <p style="font-size:12px;color:#888;margin-top:20px;">📍 ${s.event_venue || "Hotel Onomo"} · ${s.event_city || "Douala"} · ${s.event_country || "Cameroun"}</p>`
    : `<p>${greenLabel("Hello " + esc(fname) + " " + esc(lname))},</p>
       <p>${isCTFOnly ? "🏁 Your <strong>EyesOpenCTF</strong> access is confirmed. Get ready — the challenge starts soon!" : "🎟️ Your EOCON 2026 ticket is confirmed. See you from November 23 to 28 — online and in Douala!"}</p>
       ${isCTFOnly ? ctfOnlyNote : ""}
       ${neonBox(`<table cellpadding="0" cellspacing="0" width="100%"><tbody>
         ${neonRow("Attendee", `<strong>${esc(fname)} ${esc(lname)}</strong>`)}
         ${neonRow("Ticket", esc(ticketType))}
         ${neonRow("Reference", `<strong style="color:#00ff9d;font-size:15px;">${ticketRef}</strong>`)}
         ${neonRow("Status", '<span style="color:#00ff9d;font-weight:bold;">✓ CONFIRMED</span>')}
       </tbody></table>`)}
       ${watcherNote}
       ${qrImg}
       ${isCTFOnly ? "" : calLinks}
       ${livePresenceBlock}
       ${ticketPdfNote}
       <p style="font-size:12px;color:#888;margin-top:20px;">📍 ${s.event_venue || "Hotel Onomo"} · ${s.event_city || "Douala"} · ${s.event_country_en || s.event_country || "Cameroon"}</p>`;

  const vars = { fname: esc(fname), lname: esc(lname), ticketType: esc(ticketType), ticketRef, qr_code_img: qrImg };
  const icsBuffer = buildEventICS(isFr, s);

  await sendWithTemplate(
    "registration_ticket", to, vars,
    isFr ? `🎟️ Votre billet EOCON 2026 — ${ticketRef}` : `🎟️ Your EOCON 2026 ticket — ${ticketRef}`,
    emailWrap(body, isFr, s),
    lang,
    [
      { filename: "qr-checkin.png", content: accessQrBuffer, content_id: "qr_access" },
      { filename: "EOCON2026.ics", content: icsBuffer, content_id: "event_ics" },
      ...(badgePdf ? [{ filename: `EOCON2026-ticket-${ticketRef}.pdf`, content: badgePdf }] : []),
    ],
    "registration@eyesopensecurity.com",
  );
  return true;
}

// ── The Watcher's first contact — Operator initiation (auto at registration) ──
// Deep-lore transmission sent to every registrant who has CTF access, alongside
// the practical EOCON ticket email. Signed by The Watcher, with his profile photo.
export async function sendWatcherRecruitment(
  to: string, operatorName: string, lang: "fr" | "en" = "fr",
) {
  const isFr = lang === "fr";
  const s = await getEventSettings().catch(() => ({} as Record<string, string>));
  const op = esc((operatorName || "").trim() || (isFr ? "Operator" : "Operator"));
  const briefingUrl = `${emailAssetBase()}/ctf-briefing.html`;

  const missionFr = `
    <div style="margin:18px 0;padding:16px 18px;background:#0d1117;border:1px solid #00ff9d40;border-radius:8px;">
      <div style="color:#00ff9d;letter-spacing:2px;font-size:11px;margin-bottom:12px;">&gt; VOTRE MISSION</div>
      <div style="color:#cfe;font-size:13px;line-height:2;">
        ▸ Analysez les artefacts.<br>
        ▸ Résolvez les challenges.<br>
        ▸ Récupérez les Fragments.<br>
        ▸ Transmettez-les à <strong style="color:#00ff9d;">NORA-7</strong> pour authentification.
      </div>
    </div>`;
  const missionEn = `
    <div style="margin:18px 0;padding:16px 18px;background:#0d1117;border:1px solid #00ff9d40;border-radius:8px;">
      <div style="color:#00ff9d;letter-spacing:2px;font-size:11px;margin-bottom:12px;">&gt; YOUR MISSION</div>
      <div style="color:#cfe;font-size:13px;line-height:2;">
        ▸ Analyze the artifacts.<br>
        ▸ Solve the challenges.<br>
        ▸ Recover the Fragments.<br>
        ▸ Transmit them to <strong style="color:#00ff9d;">NORA-7</strong> for authentication.
      </div>
    </div>`;

  const body = isFr
    ? `${transmissionLine("TRANSMISSION ARRIVÉE // SOURCE : L'OBSERVATEUR // AUTORISATION : OPÉRATEUR")}
       ${senderHeader("watcher.webp", "THE WATCHER", "ACTIF // IDENTITÉ NON VÉRIFIÉE")}
       <p>Bonjour, <strong style="color:#00ff9d;">${op}</strong>,</p>
       <p>Votre inscription à <strong>EyesOpenCTF</strong> a déclenché votre intégration au <strong>Protocole EyesOpen</strong>.</p>
       <p>Notre monde fait face à une menace provoquée par un phénomène que nous avons appelé : <strong style="color:#00ff9d;">La Convergence</strong>.</p>
       <p>Vous en apprendrez plus dessus en consultant nos archives. Ce qui est important à savoir tout de suite, c'est que la conséquence de ce phénomène, c'est la disparition de notre réalité, c'est-à-dire la destruction de notre monde.</p>
       <p>Je sais que vous vous imaginez que la réalité dans laquelle vous vivez est linéaire. Mais vous découvrirez très vite qu'elle n'est pas un fil mais plusieurs fils qui se superposent. Je ne peux vous en dire plus pour le moment.</p>
       <p>À compter de maintenant, vous agissez en qualité d'<strong>Operator</strong> dans le cadre d'une opération internationale de la plus haute importance, baptisée <strong>EyesOpenCTF</strong> et destinée à comprendre et contenir le phénomène.</p>
       <p>Le bureau du Protocole EyesOpen a recensé des perturbations numériques en cours qui nous laissent craindre que nous allons bientôt faire face à un phénomène de Convergence d'une ampleur inédite. Ces perturbations semblent produire des fragments numériques.</p>
       ${missionFr}
       <p>Chaque Fragment validé permettra de restaurer une partie de nos archives, de révéler de nouvelles informations et de faire évoluer votre briefing en temps réel.</p>
       <p>Votre objectif final est de reconstituer suffisamment de preuves pour comprendre l'origine de la Convergence et identifier un moyen de l'arrêter avant qu'elle n'atteigne un point irréversible.</p>
       <p>Je coordonne cette opération et vous transmettrai les directives nécessaires.</p>
       <p style="color:#00ff9d80;">Mon identité n'est pas pertinente pour le moment.</p>
       ${ctaButton(briefingUrl, "► ACCÉDER AU BRIEFING DE MISSION")}
       <p><strong style="color:#00ccff;">Ce briefing est une page vivante.</strong> Il évoluera à mesure que les Operators récupéreront et authentifieront de nouveaux Fragments. Revenez-y régulièrement : ce que vous y verrez aujourd'hui pourrait être différent demain.</p>
       <p><strong>Surveillez votre prochaine transmission.</strong> NORA-7, l'archiviste du Protocole, vous remettra vos informations d'accès à l'arène et vos premières instructions opérationnelles.</p>
       <p style="margin-top:22px;">Gardez les yeux ouverts.<br><span style="color:#00ff9d;letter-spacing:2px;">— THE WATCHER</span></p>`
    : `${transmissionLine("INCOMING TRANSMISSION // SOURCE: THE WATCHER // CLEARANCE: OPERATOR")}
       ${senderHeader("watcher.webp", "THE WATCHER", "ACTIVE // IDENTITY UNVERIFIED")}
       <p>Hello, <strong style="color:#00ff9d;">${op}</strong>,</p>
       <p>Your registration to <strong>EyesOpenCTF</strong> has triggered your integration into the <strong>EyesOpen Protocol</strong>.</p>
       <p>Our world faces a threat caused by a phenomenon we have named: <strong style="color:#00ff9d;">The Convergence</strong>.</p>
       <p>You will learn more about it in our archives. What matters right now is this: the consequence of this phenomenon is the disappearance of our reality — the destruction of our world.</p>
       <p>I know you imagine that the reality you live in is linear. But you will soon discover that it is not one thread, but several threads overlapping. I cannot tell you more for now.</p>
       <p>As of now, you act as an <strong>Operator</strong> within an international operation of the highest importance, codenamed <strong>EyesOpenCTF</strong>, aimed at understanding and containing the phenomenon.</p>
       <p>The EyesOpen Protocol office has recorded ongoing digital disturbances that lead us to fear an imminent Convergence of unprecedented scale. These disturbances appear to produce digital fragments.</p>
       ${missionEn}
       <p>Each validated Fragment will restore a part of our archives, reveal new information, and evolve your briefing in real time.</p>
       <p>Your ultimate objective is to reassemble enough evidence to understand the origin of the Convergence and identify a way to stop it before it reaches an irreversible point.</p>
       <p>I coordinate this operation and will transmit the directives you need.</p>
       <p style="color:#00ff9d80;">My identity is not relevant for now.</p>
       ${ctaButton(briefingUrl, "► ACCESS THE MISSION BRIEFING")}
       <p><strong style="color:#00ccff;">This briefing is a living page.</strong> It will evolve as Operators recover and authenticate new Fragments. Come back regularly: what you see today may be different tomorrow.</p>
       <p><strong>Watch for your next transmission.</strong> NORA-7, the Protocol's archivist, will hand you your arena access credentials and your first operational instructions.</p>
       <p style="margin-top:22px;">Keep your eyes open.<br><span style="color:#00ff9d;letter-spacing:2px;">— THE WATCHER</span></p>`;

  await getResend().emails.send({
    from: FROM,
    to,
    subject: isFr ? "⟁ Transmission // The Watcher vous a sélectionné(e)" : "⟁ Transmission // The Watcher has selected you",
    html: emailWrap(body, isFr, s, { lore: true }),
    replyTo: "ctf@eyesopensecurity.com",
  });
}

// ── Online access magic link ──────────────────────────────────────────────────

export async function sendOnlineAccessLink(
  to: string,
  fname: string,
  lname: string,
  token: string,
  lang: "fr" | "en",
): Promise<void> {
  const isFr = lang === "fr";
  const s = await getEventSettings().catch(() => ({} as Record<string, string>));
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://eyesopensecurity.com";
  const link = `${baseUrl}/live?access=${token}`;

  const subject = isFr
    ? "🔐 Votre accès à EOCON 2026 en ligne"
    : "🔐 Your EOCON 2026 online access";

  const body = `
    <p style="font-size:16px;margin:0 0 8px;">
      ${isFr ? "Bonjour" : "Hello"} <strong style="color:#00ff9d;">${esc(fname)} ${esc(lname)}</strong>,
    </p>
    <p style="color:#ccc;margin:0 0 24px;">
      ${isFr
        ? "Votre lien d'accès personnel à l’évènement EOCON 2026 en ligne est prêt."
        : "Your personal access link to EOCON 2026 online is ready."}
    </p>
    ${neonBox(`
      <p style="margin:0 0 8px;font-size:12px;color:#00ff9d;letter-spacing:2px;">
        ${isFr ? "▸ ACCÈS DIRECT À LA CONVENTION" : "▸ DIRECT CONVENTION ACCESS"}
      </p>
      <p style="margin:0;font-size:12px;color:#888;">
        ${isFr
          ? "Cliquez sur le bouton ci-dessous pour rejoindre l’évènement en ligne. Ce lien est personnel et sécurisé."
          : "Click the button below to join the online event. This link is personal and secure."}
      </p>
    `)}
    ${ctaButton(link, isFr ? "🚀 REJOINDRE LA CONVENTION" : "🚀 JOIN THE CONVENTION")}
    <p style="font-size:11px;color:#666;margin:16px 0 0;text-align:center;">
      ${isFr
        ? "Ce lien est à usage unique et vous est réservé. Ne le partagez pas."
        : "This link is unique to you. Please do not share it."}
    </p>
    <p style="font-size:11px;color:#555;margin:8px 0 0;text-align:center;">
      ${isFr ? "Lien perdu ?" : "Lost your link?"}
      <a href="${baseUrl}/live/resend" style="color:#00ff9d;">
        ${isFr ? "Renvoyer le lien d'accès" : "Resend access link"}
      </a>
    </p>
    ${dateLine(isFr, s)}`;

  const resend = getResend();
  await resend.emails.send({
    from: FROM,
    to,
    subject,
    html: emailWrap(body, isFr, s),
  });
}

// ── Restream speaker invite ───────────────────────────────────────────────────

export async function sendRestreamSpeakerInvite(
  to: string, name: string,
  studioLink: string, sessionTitle: string, sessionTime: string,
  techContact: string,
  lang: "fr" | "en" = "fr",
): Promise<void> {
  const isFr = lang === "fr";
  const s = await getEventSettings().catch(() => ({} as Record<string, string>));
  const subject = isFr
    ? `EOCON 2026 — Votre lien Restream Studio · ${sessionTitle}`
    : `EOCON 2026 — Your Restream Studio link · ${sessionTitle}`;

  const body = `
    <p style="color:#ccc;margin:0 0 6px;">
      ${isFr ? "Bonjour" : "Hello"} <strong style="color:#00ff9d;">${esc(name)}</strong>,
    </p>
    <p style="color:#ccc;margin:0 0 20px;">
      ${isFr
        ? `Voici votre lien pour rejoindre la session en direct via <strong style="color:#fff;">Restream Studio</strong>. Merci de rejoindre <strong style="color:#ff9d00;">15 minutes avant</strong> l'heure prévue afin de tester votre connexion.`
        : `Here is your link to join the live session via <strong style="color:#fff;">Restream Studio</strong>. Please join <strong style="color:#ff9d00;">15 minutes before</strong> the scheduled time to test your connection.`}
    </p>
    ${neonBox(`
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        ${neonRow(isFr ? "Session" : "Session", esc(sessionTitle))}
        ${neonRow(isFr ? "Heure" : "Time", esc(sessionTime))}
        ${neonRow(isFr ? "Contact tech" : "Tech contact", esc(techContact))}
      </table>
    `)}
    ${ctaButton(studioLink, isFr ? "🎙 REJOINDRE RESTREAM STUDIO" : "🎙 JOIN RESTREAM STUDIO")}
    ${neonBox(`
      <p style="margin:0 0 10px;font-size:11px;color:#ffaa00;letter-spacing:1px;">
        ${isFr ? "⚡ CHECKLIST AVANT DE REJOINDRE" : "⚡ CHECKLIST BEFORE JOINING"}
      </p>
      <p style="margin:0;font-size:12px;color:#aaa;line-height:1.9;">
        ${isFr
          ? `✅ Connexion internet stable (câble recommandé)<br/>
             ✅ Caméra et micro testés (dans les paramètres du navigateur)<br/>
             ✅ Arrière-plan professionnel ou flou activé<br/>
             ✅ Téléphone en silencieux, notifications désactivées<br/>
             ✅ Navigateur Chrome ou Edge <em>(pas Firefox pour Restream)</em>`
          : `✅ Stable internet connection (cable recommended)<br/>
             ✅ Camera and mic tested (in browser settings)<br/>
             ✅ Professional background or blur enabled<br/>
             ✅ Phone on silent, notifications off<br/>
             ✅ Chrome or Edge browser <em>(not Firefox for Restream)</em>`}
      </p>
    `)}
    <p style="font-size:12px;color:#666;margin:20px 0 0;">
      ${isFr
        ? `Problème technique ? Contactez immédiatement : <strong style="color:#aaa;">${esc(techContact)}</strong>`
        : `Technical issue? Contact immediately: <strong style="color:#aaa;">${esc(techContact)}</strong>`}
    </p>
    ${dateLine(isFr, s)}`;

  const resend = getResend();
  await resend.emails.send({ from: FROM, to, subject, html: emailWrap(body, isFr, s) });
}

// ── Moderator streaming briefing ─────────────────────────────────────────────

export async function sendModeratorStreamingBriefing(
  to: string, name: string,
  studioLink: string, rtmpUrl: string, streamKey: string,
  qaAdminUrl: string, sessionTitle: string, sessionTime: string,
  lang: "fr" | "en" = "fr",
): Promise<void> {
  const isFr = lang === "fr";
  const s = await getEventSettings().catch(() => ({} as Record<string, string>));
  const subject = isFr
    ? `EOCON 2026 — Briefing modérateur live · ${sessionTitle}`
    : `EOCON 2026 — Moderator live briefing · ${sessionTitle}`;

  const maskedKey = streamKey
    ? `${streamKey.slice(0, 6)}${"•".repeat(Math.min(streamKey.length - 6, 22))}`
    : "(disponible dans l'admin)";

  const body = `
    <p style="color:#ccc;margin:0 0 6px;">
      ${isFr ? "Bonjour" : "Hello"} <strong style="color:#00ff9d;">${esc(name)}</strong>,
    </p>
    <p style="color:#ccc;margin:0 0 20px;">
      ${isFr
        ? `Voici votre briefing complet en tant que <strong style="color:#fff;">modérateur</strong> pour la session EOCON 2026 en ligne.`
        : `Here is your complete briefing as <strong style="color:#fff;">moderator</strong> for the EOCON 2026 online session.`}
    </p>
    ${neonBox(`
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        ${neonRow(isFr ? "Session" : "Session", esc(sessionTitle))}
        ${neonRow(isFr ? "Heure" : "Time", esc(sessionTime))}
        ${neonRow("RTMP URL", esc(rtmpUrl || "rtmp://live.restream.io/live/"))}
        ${neonRow("Stream Key", esc(maskedKey))}
      </table>
    `)}
    <div style="display:table;width:100%;">
      ${ctaButton(studioLink, isFr ? "🎬 OUVRIR RESTREAM STUDIO" : "🎬 OPEN RESTREAM STUDIO")}
      ${ctaButton(qaAdminUrl, isFr ? "💬 INTERFACE Q&A MODÉRATION" : "💬 Q&A MODERATION PANEL")}
    </div>
    ${neonBox(`
      <p style="margin:0 0 10px;font-size:11px;color:#4488ff;letter-spacing:1px;">
        ${isFr ? "🎭 VOTRE RÔLE PENDANT LE LIVE" : "🎭 YOUR ROLE DURING THE LIVE"}
      </p>
      <p style="margin:0;font-size:12px;color:#aaa;line-height:1.9;">
        ${isFr
          ? `▸ <strong style="color:#fff;">J-15 min</strong> — Accueillez le speaker dans Restream Studio, vérifiez audio/vidéo<br/>
             ▸ <strong style="color:#fff;">Intro</strong> — Présentez le speaker à l'ouverture du live<br/>
             ▸ <strong style="color:#fff;">Q&A</strong> — Surveillez l'interface admin, approuvez les meilleures questions<br/>
             ▸ <strong style="color:#fff;">Temps</strong> — Signalez "5 minutes restantes" au speaker<br/>
             ▸ <strong style="color:#fff;">Clôture</strong> — Remerciez le speaker, annoncez la prochaine session`
          : `▸ <strong style="color:#fff;">-15 min</strong> — Welcome speaker in Restream Studio, check audio/video<br/>
             ▸ <strong style="color:#fff;">Intro</strong> — Introduce the speaker at the start of the live<br/>
             ▸ <strong style="color:#fff;">Q&A</strong> — Monitor admin panel, approve the best questions<br/>
             ▸ <strong style="color:#fff;">Time</strong> — Signal "5 minutes remaining" to speaker<br/>
             ▸ <strong style="color:#fff;">Close</strong> — Thank the speaker, announce the next session`}
      </p>
    `)}
    ${dateLine(isFr, s)}`;

  const resend = getResend();
  await resend.emails.send({ from: FROM, to, subject, html: emailWrap(body, isFr, s) });
}

