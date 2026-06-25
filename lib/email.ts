import { Resend } from "resend";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { generateQrPayload, signConnectRef } from "@/lib/qr";
import { renderTemplate, getTransactionalTemplate } from "@/lib/renderTemplate";

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

function emailWrap(body: string, isFr: boolean): string {
  const footer = isFr
    ? "EOCON 2026 · EyesOpen Security · Hotel Onomo, Douala, Cameroun"
    : "EOCON 2026 · EyesOpen Security · Hotel Onomo, Douala, Cameroon";
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
          <div style="font-family:'Courier New',Courier,monospace;font-size:9px;color:#00ff9d;letter-spacing:4px;margin-bottom:4px;">&gt;_ EOCON_SYSTEM</div>
          <div style="font-family:'Courier New',Courier,monospace;font-size:28px;font-weight:900;color:#00ff9d;letter-spacing:3px;text-shadow:-2px 0 #ff00ff40, 2px 0 #00ffff40;">EOCON 2026</div>
          <div style="font-family:'Courier New',Courier,monospace;font-size:9px;color:#00ff9d80;letter-spacing:3px;margin-top:4px;">EyesOpen Security Conference</div>
        </td>
        <td align="right" style="vertical-align:top;">
          <div style="font-family:'Courier New',Courier,monospace;font-size:9px;color:#00ff9d40;letter-spacing:2px;">28.11.2026</div>
          <div style="font-family:'Courier New',Courier,monospace;font-size:9px;color:#00ff9d40;letter-spacing:1px;">DOUALA · CMR</div>
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
    <div style="font-family:'Courier New',Courier,monospace;font-size:10px;color:#333;text-align:center;margin-top:6px;letter-spacing:2px;">#EOCON · #CyberAfrica</div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}

// Wrap arbitrary campaign body HTML in the branded EOCON shell. Exposed so the
// campaign sender and the admin preview render identically.
export function wrapCampaignHtml(body: string, lang: "fr" | "en" = "fr"): string {
  return emailWrap(body, lang === "fr");
}

// Reusable HTML chunks
const greenLabel = (txt: string) => `<span style="color:#00ff9d;font-weight:bold;">${txt}</span>`;
const neonBox = (content: string) =>
  `<div style="background:#0d1117;border:1px solid #00ff9d40;border-radius:8px;padding:20px;margin:20px 0;">${content}</div>`;
const neonRow = (label: string, value: string) =>
  `<tr><td style="padding:6px 0;color:#00ff9d80;font-size:12px;width:140px;">${label}</td><td style="padding:6px 0;color:#ffffff;font-size:13px;">${value}</td></tr>`;
const ctaButton = (href: string, label: string) =>
  `<div style="text-align:center;margin:24px 0;"><a href="${href}" style="background:#00ff9d;color:#000000;font-family:'Courier New',Courier,monospace;font-size:13px;font-weight:900;letter-spacing:2px;padding:14px 32px;border-radius:8px;text-decoration:none;display:inline-block;">${label}</a></div>`;
const dateLine = (isFr: boolean) =>
  `<div style="margin-top:20px;padding:12px 16px;background:#050a05;border-left:3px solid #00ff9d60;border-radius:0 6px 6px 0;">
    <span style="font-size:12px;color:#00ff9d;letter-spacing:1px;">📅 ${isFr ? "28 Novembre 2026 · 08h00 · Hotel Onomo, Douala, Cameroun" : "November 28, 2026 · 08:00 · Hotel Onomo, Douala, Cameroon"}</span>
  </div>`;

// ── ICS calendar attachment for the full event day ───────────────────────────

function buildEventICS(isFr: boolean): Buffer {
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
    "DTSTART;TZID=Africa/Douala:20261128T080000",
    "DTEND;TZID=Africa/Douala:20261128T190000",
    `SUMMARY:EOCON 2026 — EyesOpen Security Conference`,
    "LOCATION:Hotel Onomo\\, Douala\\, Cameroun",
    `DESCRIPTION:${isFr
      ? "Évènement cybersécurité africain — EyesOpen Security. Douala, Cameroun."
      : "African cybersecurity event — EyesOpen Security. Douala, Cameroon."}`,
    "URL:https://eyesopensecurity.com",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return Buffer.from(ics, "utf-8");
}

function googleCalEventUrl(isFr: boolean): string {
  const text = encodeURIComponent("EOCON 2026 — EyesOpen Security Conference");
  const loc = encodeURIComponent("Hotel Onomo, Douala, Cameroun");
  const desc = encodeURIComponent(isFr
    ? "Évènement cybersécurité africain. eyesopensecurity.com"
    : "African cybersecurity event. eyesopensecurity.com");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=20261128T080000/20261128T190000&location=${loc}&details=${desc}`;
}

// ── Badge PDF ─────────────────────────────────────────────────────────────────

async function generateBadgePdf(
  fname: string, lname: string, ticketType: string, ticketRef: string, qrBuffer: Buffer,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [243, 153], margin: 0, info: { Title: `EOCON 2026 — ${ticketRef}` } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    // White background to save ink; all text in black.
    doc.rect(0, 0, 243, 153).fill("#ffffff");
    doc.rect(0, 0, 3, 153).fill("#000000");
    doc.fillColor("#000000").fontSize(7).font("Helvetica").text("EOCON", 12, 12, { characterSpacing: 3 });
    doc.fillColor("#000000").fontSize(22).font("Helvetica-Bold").text("2026", 12, 20);
    doc.rect(12, 48, 36, 1).fill("#000000");
    doc.fillColor("#000000").fontSize(6).font("Helvetica").text("EYESOPEN SECURITY", 12, 53, { characterSpacing: 1 });
    const fullName = `${fname} ${lname}`.substring(0, 28);
    doc.fillColor("#000000").fontSize(15).font("Helvetica-Bold").text(fullName, 12, 70, { width: 150 });
    doc.lineWidth(0.8).strokeColor("#000000").roundedRect(12, 93, ticketType.length * 6 + 12, 14, 3).stroke();
    doc.fillColor("#000000").fontSize(7).font("Helvetica").text(ticketType.toUpperCase(), 18, 97, { characterSpacing: 2 });
    doc.fillColor("#000000").fontSize(6).text(ticketRef, 12, 113);
    doc.image(qrBuffer, 155, 12, { width: 80, height: 80 });
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
       ${dateLine(isFr)}`
    : `<p>${greenLabel("Hello " + esc(name))},</p>
       <p>Your talk proposal has been received. Thank you for contributing!</p>
       ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
         ${neonRow("Talk", `<em>&ldquo;${esc(talkTitle)}&rdquo;</em>`)}
         ${neonRow("Status", statusEn)}
       </tbody></table>`)}
       ${followEn}
       ${dateLine(isFr)}`;
  await sendWithTemplate(
    "cfp_confirmation", to, vars,
    isFr ? `✅ Proposition de talk reçue — EOCON 2026` : `✅ Talk proposal received — EOCON 2026`,
    emailWrap(body, isFr), lang, undefined, "speakers@eyesopensecurity.com",
  );
}

export async function sendVolunteerConfirmation(to: string, name: string, lang: "fr" | "en" = "fr") {
  const isFr = lang === "fr";
  const body = isFr
    ? `<p>${greenLabel("Bonjour " + esc(name))},</p>
       <p>Votre candidature bénévole a bien été reçue. Nous l'examinerons et vous contacterons prochainement.</p>
       ${dateLine(isFr)}`
    : `<p>${greenLabel("Hello " + esc(name))},</p>
       <p>Your volunteer application has been received. We will review it and get back to you soon.</p>
       ${dateLine(isFr)}`;
  await sendWithTemplate(
    "volunteer_confirmation", to, { name: esc(name) },
    isFr ? `✅ Candidature bénévole reçue — EOCON 2026` : `✅ Volunteer application received — EOCON 2026`,
    emailWrap(body, isFr), lang, undefined, "registration@eyesopensecurity.com",
  );
}

export async function sendVolunteerAccepted(to: string, name: string, assignedRole: string, lang: "fr" | "en" = "fr") {
  const isFr = lang === "fr";
  const role = assignedRole || (isFr ? "À confirmer" : "To be confirmed");
  const body = isFr
    ? `<p>${greenLabel("Bonjour " + esc(name))},</p>
       <p>🎉 Excellente nouvelle ! Votre candidature bénévole a été <strong style="color:#00ff9d;">acceptée</strong>.</p>
       ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
         ${neonRow("Rôle assigné", `<strong style="color:#00ff9d;">${esc(role)}</strong>`)}
       </tbody></table>`)}
       <p>Bienvenue dans l'équipe EOCON ! Vous recevrez prochainement les détails logistiques.</p>
       ${dateLine(isFr)}`
    : `<p>${greenLabel("Hello " + esc(name))},</p>
       <p>🎉 Great news! Your volunteer application has been <strong style="color:#00ff9d;">accepted</strong>.</p>
       ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
         ${neonRow("Assigned role", `<strong style="color:#00ff9d;">${esc(role)}</strong>`)}
       </tbody></table>`)}
       <p>Welcome to the EOCON team! You will receive logistics details soon.</p>
       ${dateLine(isFr)}`;
  await sendWithTemplate(
    "volunteer_accepted", to, { name: esc(name), assignedRole: esc(role) },
    isFr ? `🎉 Candidature bénévole acceptée — EOCON 2026` : `🎉 Volunteer application accepted — EOCON 2026`,
    emailWrap(body, isFr), lang, undefined, "registration@eyesopensecurity.com",
  );
}

export async function sendVolunteerShortlisted(to: string, name: string, lang: "fr" | "en" = "fr") {
  const isFr = lang === "fr";
  const nameSafe = esc(name);
  const body = isFr
    ? `<p>${greenLabel("Bonjour " + nameSafe)},</p>
       <p>Votre candidature bénévole est en cours d'examen approfondi. Nous reviendrons vers vous très prochainement.</p>
       ${dateLine(isFr)}`
    : `<p>${greenLabel("Hello " + nameSafe)},</p>
       <p>Your volunteer application is under detailed review. We will get back to you very soon.</p>
       ${dateLine(isFr)}`;
  await sendWithTemplate("volunteer_shortlisted", to, { name: nameSafe },
    isFr ? `👀 Votre candidature bénévole — EOCON 2026` : `👀 Your volunteer application — EOCON 2026`,
    emailWrap(body, isFr), lang, undefined, "registration@eyesopensecurity.com",
  );
}

export async function sendVolunteerOnboarding(to: string, name: string, assignedRole: string, lang: "fr" | "en" = "fr") {
  const isFr = lang === "fr";
  const roleSafe = esc(assignedRole);
  const nameSafe = esc(name);
  const body = isFr
    ? `<p>${greenLabel("Bonjour " + nameSafe)},</p>
       <p>Voici vos informations de mission pour EOCON 2026.</p>
       ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
         ${neonRow("Rôle", `<strong style="color:#00ff9d;">${roleSafe}</strong>`)}
         ${neonRow("Briefing", "28 novembre 2026 · 07h30")}
         ${neonRow("Lieu", "Hotel Onomo, Douala")}
       </tbody></table>`)}
       <p>Rendez-vous le 28 novembre à partir de 07h30 pour le briefing équipe. Portez votre badge bénévole.</p>
       ${dateLine(isFr)}`
    : `<p>${greenLabel("Hello " + nameSafe)},</p>
       <p>Here are your mission details for EOCON 2026.</p>
       ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
         ${neonRow("Role", `<strong style="color:#00ff9d;">${roleSafe}</strong>`)}
         ${neonRow("Briefing", "November 28, 2026 · 07:30")}
         ${neonRow("Venue", "Hotel Onomo, Douala")}
       </tbody></table>`)}
       <p>Join us on November 28 from 07:30 for the team briefing. Wear your volunteer badge.</p>
       ${dateLine(isFr)}`;
  await sendWithTemplate("volunteer_onboarding", to, { name: nameSafe, assignedRole: roleSafe },
    isFr ? `🎽 Informations bénévole — EOCON 2026` : `🎽 Volunteer briefing — EOCON 2026`,
    emailWrap(body, isFr), lang, undefined, "registration@eyesopensecurity.com",
  );
}

export async function sendVolunteerRejected(to: string, name: string, lang: "fr" | "en" = "fr") {
  const isFr = lang === "fr";
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
    emailWrap(body, isFr), lang, undefined, "registration@eyesopensecurity.com",
  );
}

export async function sendCFPDecision(email: string, name: string, talkTitle: string, decision: "accepted" | "rejected", lang: "fr" | "en" = "fr"): Promise<void> {
  const isFr = lang === "fr";
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
           ${dateLine(isFr)}`
        : `<p>${greenLabel("Hello " + esc(name))},</p>
           <p>🎉 Your proposal has been <strong style="color:#00ff9d;">selected</strong> for EOCON 2026!</p>
           ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
             ${neonRow("Talk", `<em>&ldquo;${esc(talkTitle)}&rdquo;</em>`)}
             ${neonRow("Status", '<span style="color:#00ff9d;font-weight:bold;">✓ ACCEPTED</span>')}
           </tbody></table>`)}
           <p>The program team will contact you soon with the details.</p>
           ${dateLine(isFr)}`)
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
  await sendWithTemplate(slug, email, vars, subject, emailWrap(body, isFr), isFr ? "fr" : "en", undefined, "speakers@eyesopensecurity.com");
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
  title: string;
  scheduledAt: Date | string;
  location?: string | null;
  agenda?: string | null;
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

export async function sendPilotageMeetingInvitation(to: string, meeting: PilotageMeetingLike & { convenerName?: string | null }) {
  const body = `<p>${greenLabel("Bonjour")},</p>
     <p>Vous avez été ajouté(e) à une réunion de pilotage EOCON 2026.</p>
     ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
       ${neonRow("Réunion", `<strong style="color:#00ff9d;">${esc(meeting.title)}</strong>`)}
       ${neonRow("Date", fmtFrDate(meeting.scheduledAt))}
       ${meeting.location ? neonRow("Lieu", esc(meeting.location)) : ""}
       ${meeting.agenda ? neonRow("Ordre du jour", esc(meeting.agenda)) : ""}
       ${meeting.convenerName ? neonRow("Organisateur", esc(meeting.convenerName)) : ""}
     </tbody></table>`)}
     <p>Pensez à noter cette date dans votre agenda.</p>`;
  await sendPilotage(to, `📅 Invitation — ${meeting.title}`, body);
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
  const statusLabel = CTF_STATUS_LABELS_FR[challenge.status] || challenge.status;
  const body = `<p>${greenLabel("Bonjour " + esc(name || ""))},</p>
     <p>Un challenge du CTF EOCON 2026 (EOCTF) vous a été assigné. Vous en êtes désormais responsable.</p>
     ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
       ${neonRow("Challenge", `<strong style="color:#00ff9d;">${esc(challenge.title)}</strong>`)}
       ${neonRow("Catégorie", esc(challenge.category))}
       ${neonRow("Difficulté", esc(challenge.difficulty))}
       ${neonRow("Points", String(challenge.points))}
       ${neonRow("Statut", esc(statusLabel))}
     </tbody></table>`)}
     <p>Connectez-vous à l'espace d'administration (onglet ⚡ CTF → Challenges) pour faire avancer cette tâche et mettre à jour son statut.</p>
     ${dateLine(true)}`;
  try {
    await getResend().emails.send({
      from: FROM, to,
      subject: `🏁 Challenge CTF assigné — ${challenge.title}`,
      html: emailWrap(body, true),
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
       ${dateLine(isFr)}`
    : `<p>${greenLabel("Hello " + esc(fname) + " " + esc(lname))},</p>
       <p>Your registration has been recorded. Complete your spot by proceeding to payment.</p>
       ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
         ${neonRow("Reference", `<strong style="color:#00ff9d;font-size:16px;">${ticketRef}</strong>`)}
         ${neonRow("Ticket", esc(ticketType))}
         ${neonRow("Status", '<span style="color:#ffaa00;">⏳ Awaiting payment</span>')}
       </tbody></table>`)}
       ${ctaButton(paymentUrl, "💳 PROCEED TO PAYMENT")}
       ${dateLine(isFr)}`;
  await sendWithTemplate(
    "registration_pending", to, vars,
    isFr ? `⏳ Inscription enregistrée — EOCON 2026 [${ticketRef}]` : `⏳ Registration recorded — EOCON 2026 [${ticketRef}]`,
    emailWrap(body, isFr), lang, undefined, "registration@eyesopensecurity.com",
  );
}

export async function sendRegistrationTicket(
  to: string, fname: string, lname: string, ticketType: string, registrationId: number, ticketRef: string,
  lang: "fr" | "en" = "fr",
) {
  const isFr = lang === "fr";
  const isCTFOnly = /ctf.?only|ctf.?seul|eyesopenctf.?only/i.test(ticketType) || ticketType.toLowerCase() === "ctf";
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
  const connectQrDataUrl = `data:image/png;base64,${connectQrBuffer.toString("base64")}`;

  // PDF badge
  let badgePdf: Buffer | null = null;
  try {
    badgePdf = await generateBadgePdf(fname, lname, ticketType, ticketRef, accessQrBuffer);
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

  // Badge coupon (printable card)
  const badgeCoupon = `
<div style="text-align:center;margin-top:8px;">
  <p style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#888;margin:0 0 8px;">
    ✂ ${isFr ? "Imprimez, découpez et glissez dans votre porte-badge." : "Print, cut out and insert into your badge holder."}
  </p>
  <div style="display:inline-block;width:324px;border:1px dashed #444;border-radius:4px;overflow:hidden;">
    <div style="width:324px;height:204px;background:#ffffff;display:flex;align-items:center;justify-content:space-between;padding:0 20px;box-sizing:border-box;">
      <div style="text-align:center;flex:0 0 auto;">
        <div style="font-size:9px;letter-spacing:3px;color:#000000;margin-bottom:4px;">EOCON</div>
        <div style="font-size:22px;font-weight:900;color:#000000;letter-spacing:2px;">2026</div>
        <div style="width:40px;height:1px;background:#000000;margin:6px auto;"></div>
        <div style="font-size:7px;color:#000000;letter-spacing:2px;">EYESOPEN</div>
        <div style="font-size:7px;color:#000000;letter-spacing:1px;">SECURITY</div>
      </div>
      <div style="flex:1;padding:0 16px;text-align:center;">
        <div style="font-size:13px;color:#000000;font-weight:bold;margin-bottom:4px;">${esc(fname)} ${esc(lname)}</div>
        <div style="font-size:8px;letter-spacing:2px;color:#000000;text-transform:uppercase;">${esc(ticketType)}</div>
        <div style="font-size:7px;color:#000000;margin-top:6px;">${ticketRef}</div>
      </div>
      <div style="flex:0 0 auto;text-align:center;">
        <img src="${connectQrDataUrl}" width="90" height="90" alt="QR" style="display:block;" />
        <div style="font-size:6px;color:#000000;margin-top:3px;letter-spacing:1px;">NETWORKING</div>
      </div>
    </div>
  </div>
</div>`;

  // Calendar invite links
  const gcalUrl = googleCalEventUrl(isFr);
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
       ${qrImg}
       ${isCTFOnly ? "" : calLinks}
       <div style="margin-top:24px;padding:16px;background:#0d1117;border:1px solid #00ccff30;border-radius:8px;">
         <p style="color:#00ccff;font-size:11px;letter-spacing:2px;margin:0 0 10px;">🪪 BADGE D'ENTRÉE À IMPRIMER</p>
         ${badgeCoupon}
       </div>
       <p style="font-size:12px;color:#888;margin-top:20px;">📍 Hotel Onomo · Douala · Cameroun</p>`
    : `<p>${greenLabel("Hello " + esc(fname) + " " + esc(lname))},</p>
       <p>${isCTFOnly ? "🏁 Your <strong>EyesOpenCTF</strong> access is confirmed. Get ready — the challenge starts soon!" : "🎟️ Your EOCON 2026 ticket is confirmed. See you from November 23 to 28 — online and in Douala!"}</p>
       ${isCTFOnly ? ctfOnlyNote : ""}
       ${neonBox(`<table cellpadding="0" cellspacing="0" width="100%"><tbody>
         ${neonRow("Attendee", `<strong>${esc(fname)} ${esc(lname)}</strong>`)}
         ${neonRow("Ticket", esc(ticketType))}
         ${neonRow("Reference", `<strong style="color:#00ff9d;font-size:15px;">${ticketRef}</strong>`)}
         ${neonRow("Status", '<span style="color:#00ff9d;font-weight:bold;">✓ CONFIRMED</span>')}
       </tbody></table>`)}
       ${qrImg}
       ${isCTFOnly ? "" : calLinks}
       <div style="margin-top:24px;padding:16px;background:#0d1117;border:1px solid #00ccff30;border-radius:8px;">
         <p style="color:#00ccff;font-size:11px;letter-spacing:2px;margin:0 0 10px;">🪪 ENTRY BADGE TO PRINT</p>
         ${badgeCoupon}
       </div>
       <p style="font-size:12px;color:#888;margin-top:20px;">📍 Hotel Onomo · Douala · Cameroon</p>`;

  const vars = { fname: esc(fname), lname: esc(lname), ticketType: esc(ticketType), ticketRef, qr_code_img: qrImg };
  const icsBuffer = buildEventICS(isFr);

  await sendWithTemplate(
    "registration_ticket", to, vars,
    isFr ? `🎟️ Votre billet EOCON 2026 — ${ticketRef}` : `🎟️ Your EOCON 2026 ticket — ${ticketRef}`,
    emailWrap(body, isFr),
    lang,
    [
      { filename: "qr-checkin.png", content: accessQrBuffer, content_id: "qr_access" },
      { filename: "EOCON2026.ics", content: icsBuffer, content_id: "event_ics" },
      ...(badgePdf ? [{ filename: `badge-EOCON2026-${ticketRef}.pdf`, content: badgePdf }] : []),
    ],
    "registration@eyesopensecurity.com",
  );
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
        ? "Votre lien d'accès personnel à la conférence EOCON 2026 en ligne est prêt."
        : "Your personal access link to EOCON 2026 online is ready."}
    </p>
    ${neonBox(`
      <p style="margin:0 0 8px;font-size:12px;color:#00ff9d;letter-spacing:2px;">
        ${isFr ? "▸ ACCÈS DIRECT À LA CONFÉRENCE" : "▸ DIRECT CONFERENCE ACCESS"}
      </p>
      <p style="margin:0;font-size:12px;color:#888;">
        ${isFr
          ? "Cliquez sur le bouton ci-dessous pour rejoindre la conférence. Ce lien est personnel et sécurisé."
          : "Click the button below to join the conference. This link is personal and secure."}
      </p>
    `)}
    ${ctaButton(link, isFr ? "🚀 REJOINDRE LA CONFÉRENCE" : "🚀 JOIN THE CONFERENCE")}
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
    ${dateLine(isFr)}`;

  const resend = getResend();
  await resend.emails.send({
    from: FROM,
    to,
    subject,
    html: emailWrap(body, isFr),
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
    ${dateLine(isFr)}`;

  const resend = getResend();
  await resend.emails.send({ from: FROM, to, subject, html: emailWrap(body, isFr) });
}

// ── Moderator streaming briefing ─────────────────────────────────────────────

export async function sendModeratorStreamingBriefing(
  to: string, name: string,
  studioLink: string, rtmpUrl: string, streamKey: string,
  qaAdminUrl: string, sessionTitle: string, sessionTime: string,
  lang: "fr" | "en" = "fr",
): Promise<void> {
  const isFr = lang === "fr";
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
    ${dateLine(isFr)}`;

  const resend = getResend();
  await resend.emails.send({ from: FROM, to, subject, html: emailWrap(body, isFr) });
}

