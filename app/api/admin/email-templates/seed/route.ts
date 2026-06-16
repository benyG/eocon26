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
<p>Bonjour {{prenom}},</p>
<p>La 7ème édition de <strong>EOCON</strong> — la conférence cybersécurité de référence en Afrique centrale — ouvre officiellement ses inscriptions.</p>
<p>📅 <strong>28 novembre 2026</strong> · 📍 <strong>Hotel Onomo, Douala, Cameroun</strong></p>
<p>Au programme : keynotes, talks techniques, ateliers pratiques, CTF et bien plus encore.</p>
<p><a href="{{url_inscription}}" style="background:#00ff9d;color:#000;padding:12px 24px;border-radius:4px;font-weight:bold;text-decoration:none;">Je m'inscris maintenant</a></p>
<p>À très bientôt,<br>L'équipe EOCON 2026</p>`,
  },
  {
    name: "⏰ Rappel J-30",
    segment: "newsletter",
    subject: "EOCON 2026 — Plus que 30 jours !",
    htmlBody: `<h1>J-30 avant EOCON 2026 ⚡</h1>
<p>Bonjour {{prenom}},</p>
<p>Il ne reste que <strong>30 jours</strong> avant la conférence ! Êtes-vous prêt(e) ?</p>
<p>✅ Programme complet disponible sur le site<br>
✅ {{nb_speakers}} experts confirmés<br>
✅ {{nb_ateliers}} ateliers pratiques<br>
✅ CTF EOCTF — 48h de compétition</p>
<p>Si vous n'êtes pas encore inscrit(e), il est encore temps :</p>
<p><a href="{{url_inscription}}" style="background:#00ff9d;color:#000;padding:12px 24px;border-radius:4px;font-weight:bold;text-decoration:none;">S'inscrire maintenant</a></p>`,
  },
  {
    name: "⏰ Rappel J-7",
    segment: "registered",
    subject: "EOCON 2026 — Votre événement dans 7 jours",
    htmlBody: `<h1>EOCON 2026 dans 7 jours ! 🚀</h1>
<p>Bonjour {{prenom}},</p>
<p>Votre inscription est confirmée. Voici les informations pratiques :</p>
<ul>
<li>📅 <strong>28 novembre 2026 à partir de 8h00</strong></li>
<li>📍 <strong>Hotel Onomo, Rue Drouot, Douala, Cameroun</strong></li>
<li>🎫 <strong>Présentez votre QR Code à l'entrée</strong> (en pièce jointe)</li>
</ul>
<p>Le programme détaillé est disponible sur notre site. Planifiez vos sessions dès maintenant.</p>
<p>À dans 7 jours !<br>L'équipe EOCON 2026</p>`,
  },
  {
    name: "⏰ Rappel J-1",
    segment: "registered",
    subject: "EOCON 2026 — C'est demain ! Informations pratiques",
    htmlBody: `<h1>EOCON 2026, c'est demain ! ⚡</h1>
<p>Bonjour {{prenom}},</p>
<p>C'est demain ! Quelques rappels :</p>
<ul>
<li>🕗 Accueil dès <strong>8h00</strong> — Keynote d'ouverture à <strong>9h00</strong></li>
<li>📍 Hotel Onomo, Douala — Parking disponible</li>
<li>🎫 QR Code dans l'email de confirmation</li>
<li>💻 Amenez votre laptop pour les ateliers et le CTF</li>
<li>📶 WiFi : EOCON2026 / Mot de passe communiqué sur place</li>
</ul>
<p>On vous attend demain ! 🎉<br>L'équipe EOCON 2026</p>`,
  },
  {
    name: "🏆 Remerciement post-événement",
    segment: "registered",
    subject: "EOCON 2026 — Merci d'avoir participé !",
    htmlBody: `<h1>Merci pour EOCON 2026 ! 🙏</h1>
<p>Bonjour {{prenom}},</p>
<p>EOCON 2026 s'est clôturé et c'était exceptionnel. Merci à vous !</p>
<p><strong>En chiffres :</strong><br>
👥 {{nb_participants}} participants<br>
🎤 {{nb_speakers}} intervenants<br>
🛠 {{nb_ateliers}} ateliers<br>
🏆 CTF EOCTF — {{nb_equipes}} équipes en compétition</p>
<p>Les slides et ressources seront disponibles sous 48h sur notre site.</p>
<p>À l'année prochaine pour EOCON 2027 !<br>L'équipe EyesOpen Association</p>`,
  },
  {
    name: "🙋 Appel à bénévoles",
    segment: "newsletter",
    subject: "EOCON 2026 — Rejoignez l'équipe bénévoles",
    htmlBody: `<h1>EOCON 2026 cherche des bénévoles 🙋</h1>
<p>Bonjour,</p>
<p>Vous souhaitez vivre EOCON 2026 de l'intérieur ? Rejoignez notre équipe de bénévoles !</p>
<p><strong>Missions disponibles :</strong><br>
🎫 Accueil & Enregistrement<br>
🎤 Support technique sessions<br>
📸 Communication & Réseaux sociaux<br>
🏆 Support CTF EOCTF<br>
🛠 Support ateliers</p>
<p>En échange : accès gratuit à l'événement, repas, t-shirt EOCON 2026.</p>
<p><a href="{{url_benevolat}}" style="background:#00ff9d;color:#000;padding:12px 24px;border-radius:4px;font-weight:bold;text-decoration:none;">Postuler comme bénévole</a></p>`,
  },
  {
    name: "📨 Newsletter mensuelle",
    segment: "newsletter",
    subject: "EOCON 2026 — Actualités du mois",
    htmlBody: `<h1>Actualités EOCON 2026 📡</h1>
<p>Bonjour {{prenom}},</p>
<p>Voici les dernières nouvelles de la préparation d'EOCON 2026 :</p>
<h2>🎤 Speakers confirmés ce mois</h2>
<p>{{liste_speakers}}</p>
<h2>📋 Programme en cours</h2>
<p>{{apercu_programme}}</p>
<h2>🏢 Nouveaux sponsors</h2>
<p>{{liste_sponsors}}</p>
<p>Restez connectés !<br>L'équipe EOCON 2026</p>
<hr>
<p style="font-size:11px;color:#888;">Se désabonner : <a href="{{url_unsubscribe}}">cliquer ici</a></p>`,
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
