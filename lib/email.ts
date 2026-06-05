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
  lang: "fr" | "en" = "fr",
) {
  // Try lang-specific template first (slug_en), then fallback to default slug
  const tpl = lang === "en"
    ? (await getTransactionalTemplate(`${slug}_en`)) ?? (await getTransactionalTemplate(slug))
    : (await getTransactionalTemplate(slug));
  const subject = tpl ? renderTemplate(tpl.subject, vars) : fallbackSubject;
  const html = tpl ? renderTemplate(tpl.htmlBody, vars) : fallbackHtml;
  await getResend().emails.send({ from: FROM, to, subject, html });
}

export async function sendCFPConfirmation(to: string, name: string, talkTitle: string, lang: "fr" | "en" = "fr") {
  const vars = { name: esc(name), talkTitle: esc(talkTitle) };
  const isFr = lang === "fr";
  await sendWithTemplate(
    "cfp_confirmation", to, vars,
    isFr ? "✅ Votre proposition de talk a bien été reçue — EOCON 2026" : "✅ Your talk submission has been received — EOCON 2026",
    isFr
      ? `<div style="font-family:monospace;background:#0a0a0a;color:#fff;padding:32px;max-width:600px">
      <h1 style="color:#00ff9d">&gt; EOCON 2026</h1>
      <p>Bonjour <strong>${esc(name)}</strong>,</p>
      <p>Votre proposition <em>&ldquo;${esc(talkTitle)}&rdquo;</em> a bien été reçue.</p>
      <hr style="border-color:#222;margin:24px 0"/>
      <p style="color:#555;font-size:12px">📅 28 Novembre 2026 · Hotel Onomo, Douala</p>
    </div>`
      : `<div style="font-family:monospace;background:#0a0a0a;color:#fff;padding:32px;max-width:600px">
      <h1 style="color:#00ff9d">&gt; EOCON 2026</h1>
      <p>Hello <strong>${esc(name)}</strong>,</p>
      <p>Your talk proposal <em>&ldquo;${esc(talkTitle)}&rdquo;</em> has been received.</p>
      <hr style="border-color:#222;margin:24px 0"/>
      <p style="color:#555;font-size:12px">📅 28 November 2026 · Hotel Onomo, Douala</p>
    </div>`,
    lang,
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
  lang: "fr" | "en" = "fr",
) {
  const isFr = lang === "fr";
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://eocon.eyesopensecurity.com";
  const connectUrl = `${baseUrl}/connect/${ticketRef}`;

  const qrString = generateQrPayload(registrationId);
  const accessQrDataUrl = await QRCode.toDataURL(qrString, { width: 200, margin: 2, color: { dark: "#000000", light: "#ffffff" } });
  const connectQrDataUrl = await QRCode.toDataURL(connectUrl, { width: 256, margin: 2, color: { dark: "#000000", light: "#ffffff" } });

  const qrImg = `<img src="${accessQrDataUrl}" alt="QR Code d'accès" style="width:180px;height:180px;border:4px solid #00ff9d;border-radius:8px" />`;

  // Badge coupon: ID-1 size = 85.6×54mm → at 96dpi ≈ 323×204px, we use 324×204 as CSS dimensions
  // Printed at 96dpi on A4, the browser will scale this to exact badge size
  const badgeCoupon = `
<div style="page-break-before:always;">
  <p style="font-family:monospace;font-size:11px;color:#666;margin:0 0 8px;text-align:center;">
    ✂ Imprimez cette page, découpez le long des pointillés et glissez dans votre porte-badge.
  </p>
  <div style="display:inline-block;position:relative;width:324px;border:2px dashed #aaa;padding:0;">
    <div style="width:324px;height:204px;background:#0a0a0f;font-family:'Share Tech Mono',monospace,sans-serif;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:space-between;padding:0 20px;box-sizing:border-box;">
      <!-- Left: branding -->
      <div style="text-align:center;flex:0 0 auto;">
        <div style="font-size:9px;letter-spacing:3px;color:#00ff9d;margin-bottom:4px;">EOCON</div>
        <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:2px;line-height:1;">2026</div>
        <div style="width:40px;height:1px;background:#00ff9d;margin:6px auto;"></div>
        <div style="font-size:7px;color:#555;letter-spacing:2px;">EYESOPEN</div>
        <div style="font-size:7px;color:#555;letter-spacing:1px;">SECURITY</div>
      </div>
      <!-- Center: name + ticket -->
      <div style="flex:1;padding:0 16px;text-align:center;">
        <div style="font-size:13px;color:#ffffff;font-family:Georgia,serif;font-weight:bold;margin-bottom:4px;">${esc(fname)} ${esc(lname)}</div>
        <div style="font-size:8px;letter-spacing:2px;color:#00ff9d;text-transform:uppercase;">${esc(ticketType)}</div>
        <div style="font-size:7px;color:#333;margin-top:6px;letter-spacing:1px;">${ticketRef}</div>
      </div>
      <!-- Right: QR code -->
      <div style="flex:0 0 auto;text-align:center;">
        <img src="${connectQrDataUrl}" width="100" height="100" alt="QR réseau" style="display:block;" />
        <div style="font-size:6px;color:#444;margin-top:3px;letter-spacing:1px;">NETWORKING</div>
      </div>
    </div>
  </div>
</div>`;

  const vars = { fname: esc(fname), lname: esc(lname), ticketType: esc(ticketType), ticketRef, qr_code_img: qrImg };
  await sendWithTemplate(
    "registration_ticket", to, vars,
    isFr ? `🎟️ Votre billet EOCON 2026 — ${ticketRef}` : `🎟️ Your EOCON 2026 ticket — ${ticketRef}`,
    isFr
      ? `<div style="font-family:monospace;background:#0a0a0a;color:#fff;padding:32px;max-width:600px">
      <h1 style="color:#00ff9d">&gt; EOCON 2026 — BILLET CONFIRMÉ</h1>
      <div style="background:#111;border:1px solid #00ff9d33;border-radius:12px;padding:24px;margin:24px 0">
        <p><span style="color:#00ff9d">Participant :</span> ${esc(fname)} ${esc(lname)}</p>
        <p><span style="color:#00ff9d">Type :</span> ${esc(ticketType)}</p>
        <p><span style="color:#00ff9d">Référence :</span> <strong>${ticketRef}</strong></p>
        <div style="text-align:center;margin:20px 0">${qrImg}<p style="color:#00ff9d;font-size:12px">Présentez ce QR code à l'entrée</p></div>
      </div>
      <p>📍 Hotel Onomo, Douala, Cameroun</p>
      <hr style="border-color:#222;margin:24px 0"/>
      <div style="background:#111827;border:1px solid #00ccff33;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="color:#00ccff;font-size:12px;letter-spacing:2px;margin:0 0 8px;">🪪 COUPURE BADGE D'ENTRÉE</p>
        <p style="color:#888;font-size:12px;margin:0 0 12px;line-height:1.6;">
          <strong style="color:#fff;">Imprimez et apportez cette coupure</strong> à l'accueil le jour de l'événement.
          Elle sera insérée dans votre porte-badge. Le QR code permet aux autres participants de vous retrouver en réseau.
        </p>
        ${badgeCoupon}
      </div>
      <p style="color:#555;font-size:12px">#EOCON #EOCTF</p>
    </div>`
      : `<div style="font-family:monospace;background:#0a0a0a;color:#fff;padding:32px;max-width:600px">
      <h1 style="color:#00ff9d">&gt; EOCON 2026 — TICKET CONFIRMED</h1>
      <div style="background:#111;border:1px solid #00ff9d33;border-radius:12px;padding:24px;margin:24px 0">
        <p><span style="color:#00ff9d">Attendee:</span> ${esc(fname)} ${esc(lname)}</p>
        <p><span style="color:#00ff9d">Type:</span> ${esc(ticketType)}</p>
        <p><span style="color:#00ff9d">Reference:</span> <strong>${ticketRef}</strong></p>
        <div style="text-align:center;margin:20px 0">${qrImg}<p style="color:#00ff9d;font-size:12px">Show this QR code at check-in</p></div>
      </div>
      <p>📍 Hotel Onomo, Douala, Cameroon</p>
      <hr style="border-color:#222;margin:24px 0"/>
      <div style="background:#111827;border:1px solid #00ccff33;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="color:#00ccff;font-size:12px;letter-spacing:2px;margin:0 0 8px;">🪪 ENTRY BADGE COUPON</p>
        <p style="color:#888;font-size:12px;margin:0 0 12px;line-height:1.6;">
          <strong style="color:#fff;">Print and bring this coupon</strong> on the day of the event.
          It will be placed in your badge holder. The QR code lets other attendees find you on the network.
        </p>
        ${badgeCoupon}
      </div>
      <p style="color:#555;font-size:12px">#EOCON #EOCTF</p>
    </div>`,
    lang,
  );
}
