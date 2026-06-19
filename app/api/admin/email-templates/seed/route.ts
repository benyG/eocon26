import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

const SEED_TEMPLATES = [
  {
    name: "📣 Ouverture des inscriptions",
    segment: "newsletter",
    subject: "EOCON 2026 — Les inscriptions sont ouvertes !",
    htmlBody: `<h1>EOCON 2026 est là 🎉</h1>
<p>Bonjour {{fname}},</p>
<p>La 7ème édition de <strong>EOCON</strong> — la conférence cybersécurité de référence en Afrique centrale — ouvre officiellement ses inscriptions.</p>
<p>📅 <strong>28 novembre 2026</strong> · 📍 <strong>Hotel Onomo, Douala, Cameroun</strong></p>
<p>Au programme : keynotes, talks techniques, ateliers pratiques, CTF et bien plus encore.</p>
<p><a href="https://eyesopensecurity.com/#inscription" style="background:#00ff9d;color:#000;padding:12px 24px;border-radius:4px;font-weight:bold;text-decoration:none;">Je m'inscris maintenant</a></p>
<p>À très bientôt,<br>L'équipe EOCON 2026</p>`,
    subjectEn: "EOCON 2026 — Registration is now open!",
    htmlBodyEn: `<h1>EOCON 2026 is here 🎉</h1>
<p>Hi {{fname}},</p>
<p>The 7th edition of <strong>EOCON</strong> — Central Africa's leading cybersecurity conference — has officially opened registration.</p>
<p>📅 <strong>November 28, 2026</strong> · 📍 <strong>Hotel Onomo, Douala, Cameroon</strong></p>
<p>On the agenda: keynotes, technical talks, hands-on workshops, a CTF and much more.</p>
<p><a href="https://eyesopensecurity.com/#inscription" style="background:#00ff9d;color:#000;padding:12px 24px;border-radius:4px;font-weight:bold;text-decoration:none;">Register now</a></p>
<p>See you soon,<br>The EOCON 2026 team</p>`,
  },
  {
    name: "⏰ Rappel J-30",
    segment: "newsletter",
    subject: "EOCON 2026 — Plus que 30 jours !",
    htmlBody: `<h1>J-30 avant EOCON 2026 ⚡</h1>
<p>Bonjour {{fname}},</p>
<p>Il ne reste que <strong>30 jours</strong> avant la conférence ! Êtes-vous prêt(e) ?</p>
<p>✅ Programme complet disponible sur le site<br>
✅ Experts confirmés<br>
✅ Ateliers pratiques<br>
✅ CTF EOCTF — 48h de compétition</p>
<p>Si vous n'êtes pas encore inscrit(e), il est encore temps :</p>
<p><a href="https://eyesopensecurity.com/#inscription" style="background:#00ff9d;color:#000;padding:12px 24px;border-radius:4px;font-weight:bold;text-decoration:none;">S'inscrire maintenant</a></p>`,
    subjectEn: "EOCON 2026 — Only 30 days left!",
    htmlBodyEn: `<h1>30 days until EOCON 2026 ⚡</h1>
<p>Hi {{fname}},</p>
<p>Only <strong>30 days</strong> left before the conference! Are you ready?</p>
<p>✅ Full program available on the website<br>
✅ Confirmed experts<br>
✅ Hands-on workshops<br>
✅ EOCTF CTF — 48h competition</p>
<p>If you haven't registered yet, there's still time:</p>
<p><a href="https://eyesopensecurity.com/#inscription" style="background:#00ff9d;color:#000;padding:12px 24px;border-radius:4px;font-weight:bold;text-decoration:none;">Register now</a></p>`,
  },
  {
    name: "⏰ Rappel J-7",
    segment: "registered",
    subject: "EOCON 2026 — Votre événement dans 7 jours",
    htmlBody: `<h1>EOCON 2026 dans 7 jours ! 🚀</h1>
<p>Bonjour {{fname}},</p>
<p>Votre inscription est confirmée. Voici les informations pratiques :</p>
<ul>
<li>📅 <strong>28 novembre 2026 à partir de 8h00</strong></li>
<li>📍 <strong>Hotel Onomo, Rue Drouot, Douala, Cameroun</strong></li>
<li>🎫 <strong>Présentez votre QR Code à l'entrée</strong> (en pièce jointe)</li>
</ul>
<p>Le programme détaillé est disponible sur notre site. Planifiez vos sessions dès maintenant.</p>
<p>À dans 7 jours !<br>L'équipe EOCON 2026</p>`,
    subjectEn: "EOCON 2026 — Your event in 7 days",
    htmlBodyEn: `<h1>EOCON 2026 in 7 days! 🚀</h1>
<p>Hi {{fname}},</p>
<p>Your registration is confirmed. Here is the practical information:</p>
<ul>
<li>📅 <strong>November 28, 2026 from 8:00 AM</strong></li>
<li>📍 <strong>Hotel Onomo, Rue Drouot, Douala, Cameroon</strong></li>
<li>🎫 <strong>Show your QR code at the entrance</strong> (attached)</li>
</ul>
<p>The detailed program is available on our website. Plan your sessions now.</p>
<p>See you in 7 days!<br>The EOCON 2026 team</p>`,
  },
  {
    name: "⏰ Rappel J-1",
    segment: "registered",
    subject: "EOCON 2026 — C'est demain ! Informations pratiques",
    htmlBody: `<h1>EOCON 2026, c'est demain ! ⚡</h1>
<p>Bonjour {{fname}},</p>
<p>C'est demain ! Quelques rappels :</p>
<ul>
<li>🕗 Accueil dès <strong>8h00</strong> — Keynote d'ouverture à <strong>9h00</strong></li>
<li>📍 Hotel Onomo, Douala — Parking disponible</li>
<li>🎫 QR Code dans l'email de confirmation</li>
<li>💻 Amenez votre laptop pour les ateliers et le CTF</li>
<li>📶 WiFi : EOCON2026 / Mot de passe communiqué sur place</li>
</ul>
<p>On vous attend demain ! 🎉<br>L'équipe EOCON 2026</p>`,
    subjectEn: "EOCON 2026 — It's tomorrow! Practical info",
    htmlBodyEn: `<h1>EOCON 2026 is tomorrow! ⚡</h1>
<p>Hi {{fname}},</p>
<p>It's tomorrow! A few reminders:</p>
<ul>
<li>🕗 Doors open at <strong>8:00 AM</strong> — Opening keynote at <strong>9:00 AM</strong></li>
<li>📍 Hotel Onomo, Douala — Parking available</li>
<li>🎫 QR code in your confirmation email</li>
<li>💻 Bring your laptop for the workshops and the CTF</li>
<li>📶 WiFi: EOCON2026 / Password provided on site</li>
</ul>
<p>See you tomorrow! 🎉<br>The EOCON 2026 team</p>`,
  },
  {
    name: "🏆 Remerciement post-événement",
    segment: "registered",
    subject: "EOCON 2026 — Merci d'avoir participé !",
    htmlBody: `<h1>Merci pour EOCON 2026 ! 🙏</h1>
<p>Bonjour {{fname}},</p>
<p>EOCON 2026 s'est clôturé et c'était exceptionnel. Merci à vous !</p>
<p>Les slides et ressources seront disponibles sous 48h sur notre site.</p>
<p>À l'année prochaine pour EOCON 2027 !<br>L'équipe EyesOpen Association</p>`,
    subjectEn: "EOCON 2026 — Thank you for attending!",
    htmlBodyEn: `<h1>Thank you for EOCON 2026! 🙏</h1>
<p>Hi {{fname}},</p>
<p>EOCON 2026 has wrapped up and it was exceptional. Thank you!</p>
<p>Slides and resources will be available within 48h on our website.</p>
<p>See you next year for EOCON 2027!<br>The EyesOpen Association team</p>`,
  },
  {
    name: "🙋 Appel à bénévoles",
    segment: "newsletter",
    subject: "EOCON 2026 — Rejoignez l'équipe bénévoles",
    htmlBody: `<h1>EOCON 2026 cherche des bénévoles 🙋</h1>
<p>Bonjour {{fname}},</p>
<p>Vous souhaitez vivre EOCON 2026 de l'intérieur ? Rejoignez notre équipe de bénévoles !</p>
<p><strong>Missions disponibles :</strong><br>
🎫 Accueil & Enregistrement<br>
🎤 Support technique sessions<br>
📸 Communication & Réseaux sociaux<br>
🏆 Support CTF EOCTF<br>
🛠 Support ateliers</p>
<p>En échange : accès gratuit à l'événement, repas, t-shirt EOCON 2026.</p>
<p><a href="https://eyesopensecurity.com/#benevoles" style="background:#00ff9d;color:#000;padding:12px 24px;border-radius:4px;font-weight:bold;text-decoration:none;">Postuler comme bénévole</a></p>`,
    subjectEn: "EOCON 2026 — Join the volunteer team",
    htmlBodyEn: `<h1>EOCON 2026 is looking for volunteers 🙋</h1>
<p>Hi {{fname}},</p>
<p>Want to experience EOCON 2026 from the inside? Join our volunteer team!</p>
<p><strong>Available roles:</strong><br>
🎫 Welcome & Registration<br>
🎤 Session technical support<br>
📸 Communication & Social media<br>
🏆 EOCTF CTF support<br>
🛠 Workshop support</p>
<p>In return: free access to the event, meals, an EOCON 2026 t-shirt.</p>
<p><a href="https://eyesopensecurity.com/#benevoles" style="background:#00ff9d;color:#000;padding:12px 24px;border-radius:4px;font-weight:bold;text-decoration:none;">Apply as a volunteer</a></p>`,
  },
  {
    name: "📨 Newsletter mensuelle",
    segment: "newsletter",
    subject: "EOCON 2026 — Actualités du mois",
    htmlBody: `<h1>Actualités EOCON 2026 📡</h1>
<p>Bonjour {{fname}},</p>
<p>Voici les dernières nouvelles de la préparation d'EOCON 2026 : speakers confirmés, programme en cours et nouveaux sponsors.</p>
<p>Rendez-vous sur notre site pour tous les détails.</p>
<p>Restez connectés !<br>L'équipe EOCON 2026</p>`,
    subjectEn: "EOCON 2026 — This month's news",
    htmlBodyEn: `<h1>EOCON 2026 News 📡</h1>
<p>Hi {{fname}},</p>
<p>Here is the latest news on the EOCON 2026 preparation: confirmed speakers, the program in progress and new sponsors.</p>
<p>Visit our website for all the details.</p>
<p>Stay tuned!<br>The EOCON 2026 team</p>`,
  },
];

export async function POST() {
  if (!(await hasPermission("communication", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.emailTemplate.findMany({ select: { name: true } });
  const existingNames = new Set(existing.map(t => t.name));

  const toCreate = SEED_TEMPLATES.filter(t => !existingNames.has(t.name));
  if (toCreate.length === 0) return NextResponse.json({ created: 0, message: "Templates déjà seedés" });

  await prisma.emailTemplate.createMany({ data: toCreate });
  return NextResponse.json({ created: toCreate.length });
}
