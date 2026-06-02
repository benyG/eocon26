import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || "");
}
const FROM = process.env.EMAIL_FROM || "EOCON 2026 <noreply@eyesopensecurity.com>";

export async function sendCFPConfirmation(to: string, name: string, talkTitle: string) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: "✅ Votre proposition de talk a bien été reçue — EOCON 2026",
    html: `
      <div style="font-family:monospace;background:#0a0a0a;color:#fff;padding:32px;max-width:600px">
        <h1 style="color:#00ff9d">&gt; EOCON 2026</h1>
        <p>Bonjour <strong>${name}</strong>,</p>
        <p>Votre proposition <em>"${talkTitle}"</em> a bien été reçue. Notre comité de sélection l'examinera et vous contactera prochainement.</p>
        <hr style="border-color:#222;margin:24px 0"/>
        <p style="color:#555;font-size:12px">📅 28 Novembre 2026 · Hotel Onomo, Douala · #EOCON #EOCTF</p>
      </div>`,
  });
}

export async function sendVolunteerConfirmation(to: string, name: string) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: "✅ Candidature bénévole reçue — EOCON 2026",
    html: `
      <div style="font-family:monospace;background:#0a0a0a;color:#fff;padding:32px;max-width:600px">
        <h1 style="color:#00ff9d">&gt; EOCON 2026</h1>
        <p>Bonjour <strong>${name}</strong>,</p>
        <p>Merci pour votre candidature bénévole ! Nous sommes ravis de votre intérêt et reviendrons vers vous très bientôt.</p>
        <hr style="border-color:#222;margin:24px 0"/>
        <p style="color:#555;font-size:12px">📅 28 Novembre 2026 · Hotel Onomo, Douala · #EOCON</p>
      </div>`,
  });
}

export async function sendRegistrationTicket(
  to: string,
  fname: string,
  lname: string,
  ticketType: string,
  registrationId: number,
) {
  const ticketId = `EOCON26-${String(registrationId).padStart(5, "0")}`;
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `🎟️ Votre billet EOCON 2026 — ${ticketId}`,
    html: `
      <div style="font-family:monospace;background:#0a0a0a;color:#fff;padding:32px;max-width:600px">
        <h1 style="color:#00ff9d">&gt; EOCON 2026 — BILLET CONFIRMÉ</h1>
        <div style="background:#111;border:1px solid #00ff9d33;border-radius:12px;padding:24px;margin:24px 0">
          <p style="margin:0 0 8px"><span style="color:#00ff9d">Participant :</span> ${fname} ${lname}</p>
          <p style="margin:0 0 8px"><span style="color:#00ff9d">Type :</span> ${ticketType}</p>
          <p style="margin:0 0 8px"><span style="color:#00ff9d">Référence :</span> <strong>${ticketId}</strong></p>
          <p style="margin:0"><span style="color:#00ff9d">Date :</span> 28 Novembre 2026</p>
        </div>
        <p>📍 Hotel Onomo, Douala, Cameroun</p>
        <p>Présentez ce billet (email ou capture d'écran) à l'entrée.</p>
        <hr style="border-color:#222;margin:24px 0"/>
        <p style="color:#555;font-size:12px">#EOCON #EOCTF · eyesopensecurity.com</p>
      </div>`,
  });
}
