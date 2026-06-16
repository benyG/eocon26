import { Resend } from "resend";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { generateQrPayload } from "@/lib/qr";
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
      ? "Conférence cybersécurité africaine — EyesOpen Security. Douala, Cameroun."
      : "African cybersecurity conference — EyesOpen Security. Douala, Cameroon."}`,
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
    ? "Conférence cybersécurité africaine. eyesopensecurity.com"
    : "African cybersecurity conference. eyesopensecurity.com");
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
    doc.image(qrBuffer, 163, 18, { width: 68, height: 68 });
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
) {
  const tpl = lang === "en"
    ? (await getTransactionalTemplate(`${slug}_en`)) ?? (await getTransactionalTemplate(slug))
    : (await getTransactionalTemplate(slug));
  const subject = tpl ? renderTemplate(tpl.subject, vars) : fallbackSubject;
  const html = tpl ? renderTemplate(tpl.htmlBody, vars) : fallbackHtml;
  await getResend().emails.send({ from: FROM, to, subject, html, attachments });
}

// ── Public email functions ────────────────────────────────────────────────────

export async function sendCFPConfirmation(to: string, name: string, talkTitle: string, lang: "fr" | "en" = "fr") {
  const isFr = lang === "fr";
  const vars = { name: esc(name), talkTitle: esc(talkTitle) };
  const body = isFr
    ? `<p>${greenLabel("Bonjour " + esc(name))},</p>
       <p>Votre proposition de talk a bien été reçue. Merci pour votre contribution !</p>
       ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
         ${neonRow("Talk", `<em>&ldquo;${esc(talkTitle)}&rdquo;</em>`)}
         ${neonRow("Statut", '<span style="color:#ffaa00;">En cours d\'examen</span>')}
       </tbody></table>`)}
       <p>Notre équipe CFP examinera votre proposition et vous tiendra informé(e) de notre décision.</p>
       ${dateLine(isFr)}`
    : `<p>${greenLabel("Hello " + esc(name))},</p>
       <p>Your talk proposal has been received. Thank you for contributing!</p>
       ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
         ${neonRow("Talk", `<em>&ldquo;${esc(talkTitle)}&rdquo;</em>`)}
         ${neonRow("Status", '<span style="color:#ffaa00;">Under review</span>')}
       </tbody></table>`)}
       <p>Our CFP team will review your proposal and keep you informed of our decision.</p>
       ${dateLine(isFr)}`;
  await sendWithTemplate(
    "cfp_confirmation", to, vars,
    isFr ? `✅ Proposition de talk reçue — EOCON 2026` : `✅ Talk proposal received — EOCON 2026`,
    emailWrap(body, isFr), lang,
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
    emailWrap(body, isFr), lang,
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
    emailWrap(body, isFr), lang,
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
    emailWrap(body, isFr), lang,
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
    emailWrap(body, isFr), lang,
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
    emailWrap(body, isFr), lang,
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
           <p>L'équipe programme vous contactera prochainement pour les détails logistiques (horaire, salle, besoins techniques).</p>
           ${dateLine(isFr)}`
        : `<p>${greenLabel("Hello " + esc(name))},</p>
           <p>🎉 Your proposal has been <strong style="color:#00ff9d;">selected</strong> for EOCON 2026!</p>
           ${neonBox(`<table cellpadding="0" cellspacing="0"><tbody>
             ${neonRow("Talk", `<em>&ldquo;${esc(talkTitle)}&rdquo;</em>`)}
             ${neonRow("Status", '<span style="color:#00ff9d;font-weight:bold;">✓ ACCEPTED</span>')}
           </tbody></table>`)}
           <p>The program team will contact you soon with logistics details (time slot, room, technical needs).</p>
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
  await sendWithTemplate(slug, email, vars, subject, emailWrap(body, isFr));
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

export async function sendPilotageMeetingReminder(to: string, meeting: PilotageMeetingLike, stage: string) {
  const when = stage === "H-2" ? "dans 2 heures" : "demain";
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
    emailWrap(body, isFr), lang,
  );
}

export async function sendRegistrationTicket(
  to: string, fname: string, lname: string, ticketType: string, registrationId: number, ticketRef: string,
  lang: "fr" | "en" = "fr",
) {
  const isFr = lang === "fr";
  const domain = process.env.DOMAIN || process.env.NEXT_PUBLIC_URL || "eyesopensecurity.com";
  const baseUrl = domain.startsWith("http") ? domain : `https://${domain}`;
  const connectUrl = `${baseUrl}/connect/${ticketRef}`;

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

  // QR code — image only, no caption text
  const qrImg = `<img src="cid:qr_access" alt="QR Check-in" width="200" height="200" style="border:3px solid #00ff9d;border-radius:10px;display:block;" />`;

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

  const body = isFr
    ? `<p>${greenLabel("Bonjour " + esc(fname) + " " + esc(lname))},</p>
       <p>🎟️ Votre billet EOCON 2026 est confirmé. On vous attend le 28 novembre !</p>
       ${neonBox(`<table cellpadding="0" cellspacing="0" width="100%"><tbody>
         ${neonRow("Participant", `<strong>${esc(fname)} ${esc(lname)}</strong>`)}
         ${neonRow("Billet", esc(ticketType))}
         ${neonRow("Référence", `<strong style="color:#00ff9d;font-size:15px;">${ticketRef}</strong>`)}
         ${neonRow("Statut", '<span style="color:#00ff9d;font-weight:bold;">✓ CONFIRMÉ</span>')}
       </tbody></table>`)}
       <div style="text-align:center;margin:24px 0;">
         ${qrImg}
       </div>
       ${calLinks}
       <div style="margin-top:24px;padding:16px;background:#0d1117;border:1px solid #00ccff30;border-radius:8px;">
         <p style="color:#00ccff;font-size:11px;letter-spacing:2px;margin:0 0 10px;">🪪 ${isFr ? "BADGE D'ENTRÉE À IMPRIMER" : "ENTRY BADGE TO PRINT"}</p>
         ${badgeCoupon}
       </div>
       <p style="font-size:12px;color:#888;margin-top:20px;">📍 Hotel Onomo · Douala · Cameroun</p>`
    : `<p>${greenLabel("Hello " + esc(fname) + " " + esc(lname))},</p>
       <p>🎟️ Your EOCON 2026 ticket is confirmed. See you on November 28!</p>
       ${neonBox(`<table cellpadding="0" cellspacing="0" width="100%"><tbody>
         ${neonRow("Attendee", `<strong>${esc(fname)} ${esc(lname)}</strong>`)}
         ${neonRow("Ticket", esc(ticketType))}
         ${neonRow("Reference", `<strong style="color:#00ff9d;font-size:15px;">${ticketRef}</strong>`)}
         ${neonRow("Status", '<span style="color:#00ff9d;font-weight:bold;">✓ CONFIRMED</span>')}
       </tbody></table>`)}
       <div style="text-align:center;margin:24px 0;">
         ${qrImg}
       </div>
       ${calLinks}
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
  );
}

