import { Resend } from "resend";
import QRCode from "qrcode";
import { generateQrPayload } from "@/lib/qr";
import { renderTemplate, getTransactionalTemplate } from "@/lib/renderTemplate";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || "");
}
const FROM = process.env.EMAIL_FROM || "EOCON 2026 <noreply@eyesopensecurity.com>";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

async function sendWithTemplate(
  slug: string,
  to: string,
  vars: Record<string, string>,
  fallbackSubject: string,
  fallbackHtml: string,
) {
  const tpl = await getTransactionalTemplate(slug);
  const subject = tpl ? renderTemplate(tpl.subject, vars) : fallbackSubject;
  const html = tpl ? renderTemplate(tpl.htmlBody, vars) : fallbackHtml;
  await getResend().emails.send({ from: FROM, to, subject, html });
}

export async function sendCFPConfirmation(to: string, name: string, talkTitle: string) {
  const vars = { name: esc(name), talkTitle: esc(talkTitle) };
  await sendWithTemplate(
    "cfp_confirmation", to, vars,
    "✅ Votre proposition de talk a bien été reçue — EOCON 2026",
    `<div style="font-family:monospace;background:#0a0a0a;color:#fff;padding:32px;max-width:600px">
      <h1 style="color:#00ff9d">&gt; EOCON 2026</h1>
      <p>Bonjour <strong>${esc(name)}</strong>,</p>
      <p>Votre proposition <em>&ldquo;${esc(talkTitle)}&rdquo;</em> a bien été reçue.</p>
      <hr style="border-color:#222;margin:24px 0"/>
      <p style="color:#555;font-size:12px">📅 28 Novembre 2026 · Hotel Onomo, Douala</p>
    </div>`,
  );
}

export async function sendVolunteerConfirmation(to: string, name: string) {
  const vars = { name: esc(name) };
  await sendWithTemplate(
    "volunteer_confirmation", to, vars,
    "✅ Candidature bénévole reçue — EOCON 2026",
    `<div style="font-family:monospace;background:#0a0a0a;color:#fff;padding:32px;max-width:600px">
      <h1 style="color:#00ff9d">&gt; EOCON 2026</h1>
      <p>Bonjour <strong>${esc(name)}</strong>,</p>
      <p>Merci pour votre candidature bénévole !</p>
      <hr style="border-color:#222;margin:24px 0"/>
      <p style="color:#555;font-size:12px">📅 28 Novembre 2026 · Hotel Onomo, Douala</p>
    </div>`,
  );
}

export async function sendVolunteerAccepted(to: string, name: string, assignedRole: string) {
  const vars = { name: esc(name), assignedRole: esc(assignedRole || "À confirmer") };
  await sendWithTemplate(
    "volunteer_accepted", to, vars,
    "🎉 Candidature bénévole acceptée — EOCON 2026",
    `<div style="font-family:monospace;background:#0a0a0a;color:#fff;padding:32px;max-width:600px">
      <h1 style="color:#00ff9d">&gt; EOCON 2026 — Bienvenue dans l'équipe !</h1>
      <p>Bonjour <strong>${esc(name)}</strong>,</p>
      <p>Votre candidature bénévole a été <strong>acceptée</strong> !</p>
      <p>Rôle assigné : <strong>${esc(assignedRole || "À confirmer")}</strong></p>
      <hr style="border-color:#222;margin:24px 0"/>
      <p style="color:#555;font-size:12px">📅 28 Novembre 2026 · Hotel Onomo, Douala</p>
    </div>`,
  );
}

export async function sendCFPDecision(email: string, name: string, talkTitle: string, decision: "accepted" | "rejected"): Promise<void> {
  const vars = { name: esc(name), talkTitle: esc(talkTitle) };
  const slug = decision === "accepted" ? "cfp_accepted" : "cfp_rejected";
  const fallbackSubject = decision === "accepted"
    ? `🎉 CFP Accepté - EOCON 2026 : "${talkTitle}"`
    : `CFP - EOCON 2026 : "${talkTitle}"`;
  const fallbackHtml = decision === "accepted"
    ? `<p>Bonjour ${esc(name)},</p><p>Votre proposition <strong>"${esc(talkTitle)}"</strong> a été <strong>acceptée</strong> pour EOCON 2026 !</p><p>— L'équipe EOCON</p>`
    : `<p>Bonjour ${esc(name)},</p><p>Merci pour votre proposition <strong>"${esc(talkTitle)}"</strong>. Malheureusement elle n'a pas été retenue cette année.</p><p>— L'équipe EOCON</p>`;
  await sendWithTemplate(slug, email, vars, fallbackSubject, fallbackHtml);
}

export async function sendRegistrationPending(
  to: string, fname: string, lname: string, ticketType: string, ticketRef: string, paymentUrl: string,
) {
  const vars = { fname: esc(fname), lname: esc(lname), ticketType: esc(ticketType), ticketRef, paymentUrl };
  await sendWithTemplate(
    "registration_pending", to, vars,
    `✅ Inscription reçue — EOCON 2026 [${ticketRef}]`,
    `<div style="font-family:monospace;background:#0a0a0a;color:#fff;padding:32px;max-width:600px">
      <h1 style="color:#00ff9d">&gt; EOCON 2026 — Inscription enregistrée</h1>
      <p>Bonjour <strong>${esc(fname)} ${esc(lname)}</strong>,</p>
      <p>Référence : <strong style="color:#00ff9d">${ticketRef}</strong></p>
      <div style="text-align:center;margin:20px 0"><a href="${paymentUrl}" style="background:#00ff9d;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">💳 Procéder au paiement</a></div>
      <hr style="border-color:#222;margin:24px 0"/>
      <p style="color:#555;font-size:12px">📅 28 Novembre 2026 · Hotel Onomo, Douala</p>
    </div>`,
  );
}

export async function sendRegistrationTicket(
  to: string, fname: string, lname: string, ticketType: string, registrationId: number, ticketRef: string,
) {
  const qrString = generateQrPayload(registrationId);
  const qrDataUrl = await QRCode.toDataURL(qrString, { width: 200, margin: 2, color: { dark: "#000000", light: "#ffffff" } });
  const qrImg = `<img src="${qrDataUrl}" alt="QR Code d'accès" style="width:180px;height:180px;border:4px solid #00ff9d;border-radius:8px" />`;

  const vars = { fname: esc(fname), lname: esc(lname), ticketType: esc(ticketType), ticketRef, qr_code_img: qrImg };
  await sendWithTemplate(
    "registration_ticket", to, vars,
    `🎟️ Votre billet EOCON 2026 — ${ticketRef}`,
    `<div style="font-family:monospace;background:#0a0a0a;color:#fff;padding:32px;max-width:600px">
      <h1 style="color:#00ff9d">&gt; EOCON 2026 — BILLET CONFIRMÉ</h1>
      <div style="background:#111;border:1px solid #00ff9d33;border-radius:12px;padding:24px;margin:24px 0">
        <p><span style="color:#00ff9d">Participant :</span> ${esc(fname)} ${esc(lname)}</p>
        <p><span style="color:#00ff9d">Type :</span> ${esc(ticketType)}</p>
        <p><span style="color:#00ff9d">Référence :</span> <strong>${ticketRef}</strong></p>
        <div style="text-align:center;margin:20px 0">${qrImg}<p style="color:#00ff9d;font-size:12px">Présentez ce QR code à l'entrée</p></div>
      </div>
      <p>📍 Hotel Onomo, Douala, Cameroun</p>
      <hr style="border-color:#222;margin:24px 0"/>
      <p style="color:#555;font-size:12px">#EOCON #EOCTF</p>
    </div>`,
  );
}
