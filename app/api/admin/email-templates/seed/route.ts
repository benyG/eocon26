import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

// Hosted email images (public/email/*). Baked into the template HTML at seed time.
const ASSET = (process.env.NEXT_PUBLIC_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://eyesopensecurity.com").replace(/\/$/, "");
// NORA-7 "transmission" header (profile photo + name/status) for the operational
// CTF emails. The Watcher handles recruitment (transactional); NORA-7 handles ops.
const noraHeader = (roleLabel: string) =>
  `<table cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr>
    <td style="vertical-align:middle;padding-right:14px;"><img src="${ASSET}/email/nora.webp" width="56" height="56" alt="NORA-7" style="width:56px;height:56px;border-radius:50%;border:1px solid #00ff9d80;display:block;"/></td>
    <td style="vertical-align:middle;"><div style="color:#00ff9d;font-weight:bold;letter-spacing:2px;font-size:13px;">NORA-7</div><div style="color:#00ff9d80;font-size:10px;letter-spacing:2px;margin-top:3px;">${roleLabel}</div></td>
  </tr></table>`;

const SEED_TEMPLATES = [
  {
    name: "📣 Ouverture des inscriptions",
    segment: "newsletter",
    subject: "EOCON 2026 — Les inscriptions sont ouvertes !",
    htmlBody: `<h1>EOCON 2026 est là 🎉</h1>
<p>Bonjour {{fname}},</p>
<p>La 7ème édition de <strong>EOCON</strong> — l'évènement cybersécurité de référence en Afrique centrale — ouvre officiellement ses inscriptions.</p>
<p>📅 <strong>28 novembre 2026</strong> · 📍 <strong>Hotel Onomo, Douala, Cameroun</strong></p>
<p>Au programme : keynotes, talks techniques, ateliers pratiques, CTF et bien plus encore.</p>
<p><a href="https://eyesopensecurity.com/#inscription" style="background:#00ff9d;color:#000;padding:12px 24px;border-radius:4px;font-weight:bold;text-decoration:none;">Je m'inscris maintenant</a></p>
<p>À très bientôt,<br>L'équipe EOCON 2026</p>`,
    subjectEn: "EOCON 2026 — Registration is now open!",
    htmlBodyEn: `<h1>EOCON 2026 is here 🎉</h1>
<p>Hi {{fname}},</p>
<p>The 7th edition of <strong>EOCON</strong> — Central Africa's leading cybersecurity event — has officially opened registration.</p>
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
<p>Il ne reste que <strong>30 jours</strong> avant l'évènement ! Êtes-vous prêt(e) ?</p>
<p>✅ Programme complet disponible sur le site<br>
✅ Experts confirmés<br>
✅ Ateliers pratiques<br>
✅ CTF EyesOpenCTF — 48h de compétition</p>
<p>Si vous n'êtes pas encore inscrit(e), il est encore temps :</p>
<p><a href="https://eyesopensecurity.com/#inscription" style="background:#00ff9d;color:#000;padding:12px 24px;border-radius:4px;font-weight:bold;text-decoration:none;">S'inscrire maintenant</a></p>`,
    subjectEn: "EOCON 2026 — Only 30 days left!",
    htmlBodyEn: `<h1>30 days until EOCON 2026 ⚡</h1>
<p>Hi {{fname}},</p>
<p>Only <strong>30 days</strong> left before the event! Are you ready?</p>
<p>✅ Full program available on the website<br>
✅ Confirmed experts<br>
✅ Hands-on workshops<br>
✅ EyesOpenCTF CTF — 48h competition</p>
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
<p>À l'année prochaine pour EOCON 2027 !<br>L'équipe EOCON 2026</p>`,
    subjectEn: "EOCON 2026 — Thank you for attending!",
    htmlBodyEn: `<h1>Thank you for EOCON 2026! 🙏</h1>
<p>Hi {{fname}},</p>
<p>EOCON 2026 has wrapped up and it was exceptional. Thank you!</p>
<p>Slides and resources will be available within 48h on our website.</p>
<p>See you next year for EOCON 2027!<br>The EOCON 2026 team</p>`,
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
🏆 Support CTF EyesOpenCTF<br>
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
🏆 EyesOpenCTF CTF support<br>
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
  {
    // ⚠️ Mécanique d'accès provisoire : on expose ici le mot de passe généré au sync
    // ({{ctfPassword}}). Cette mécanique évoluera plus tard vers un autre modèle.
    name: "🔑 CTF — Accès Protocol & identifiants (NORA-7)",
    segment: "registered",
    subject: "◈ NORA-7 // votre accès Protocol est actif",
    htmlBody: `${noraHeader("ARCHIVISTE DU PROTOCOLE")}
<p>Operator <strong style="color:#00ff9d;">{{ctfCompetitorName}}</strong>,</p>
<p>Ici <strong>NORA-7</strong>, archiviste du Protocole EyesOpen. Votre accès à l'<strong>arène</strong> — la plateforme où vous analyserez les artefacts et récupérerez les Fragments — est actif.</p>
<div style="background:#0d1117;border:1px solid #00ff9d40;border-radius:8px;padding:18px;margin:18px 0;">
<div style="color:#00ff9d;letter-spacing:2px;font-size:11px;margin-bottom:12px;">&gt; VOS IDENTIFIANTS D'ACCÈS</div>
🌐 <strong>Plateforme :</strong> <a href="https://ctf.eyesopensecurity.com" style="color:#00ff9d;">ctf.eyesopensecurity.com</a><br>
👤 <strong>Identifiant :</strong> {{ctfCompetitorName}}<br>
📧 <strong>Email :</strong> {{email}}<br>
🔒 <strong>Mot de passe :</strong> <code style="color:#00ff9d;">{{ctfPassword}}</code><br>
🛰 <strong>Cellule :</strong> {{ctfTeamName}}
</div>
<p>⚠️ Connectez-vous <strong>avant l'ouverture de l'arène</strong> pour vérifier votre accès et rejoindre ou créer votre cellule (max 4 Operators).</p>
<p>🕗 <strong>Fenêtre d'opération :</strong> du 20 novembre 2026 à <strong>20h00</strong> au 22 novembre à <strong>20h00</strong> — <strong>en ligne</strong>.</p>
<p>Chaque Fragment que vous m'enverrez sera authentifié et fera évoluer le dossier vivant.</p>
<p>Gardez les yeux ouverts.<br><span style="color:#00ff9d;letter-spacing:2px;">— NORA-7, Protocole EyesOpen</span></p>`,
    subjectEn: "◈ NORA-7 // your Protocol access is live",
    htmlBodyEn: `${noraHeader("PROTOCOL ARCHIVIST")}
<p>Operator <strong style="color:#00ff9d;">{{ctfCompetitorName}}</strong>,</p>
<p>This is <strong>NORA-7</strong>, archivist of the EyesOpen Protocol. Your access to the <strong>arena</strong> — the platform where you will analyze artifacts and recover Fragments — is now live.</p>
<div style="background:#0d1117;border:1px solid #00ff9d40;border-radius:8px;padding:18px;margin:18px 0;">
<div style="color:#00ff9d;letter-spacing:2px;font-size:11px;margin-bottom:12px;">&gt; YOUR ACCESS CREDENTIALS</div>
🌐 <strong>Platform:</strong> <a href="https://ctf.eyesopensecurity.com" style="color:#00ff9d;">ctf.eyesopensecurity.com</a><br>
👤 <strong>Username:</strong> {{ctfCompetitorName}}<br>
📧 <strong>Email:</strong> {{email}}<br>
🔒 <strong>Password:</strong> <code style="color:#00ff9d;">{{ctfPassword}}</code><br>
🛰 <strong>Cell:</strong> {{ctfTeamName}}
</div>
<p>⚠️ Log in <strong>before the arena opens</strong> to verify your access and join or create your cell (max 4 Operators).</p>
<p>🕗 <strong>Operation window:</strong> from November 20, 2026 at <strong>8:00 PM</strong> to November 22 at <strong>8:00 PM</strong> — <strong>online</strong>.</p>
<p>Every Fragment you transmit to me will be authenticated and will evolve the living record.</p>
<p>Keep your eyes open.<br><span style="color:#00ff9d;letter-spacing:2px;">— NORA-7, EyesOpen Protocol</span></p>`,
  },
  {
    name: "🤝 CTF — Opérer sans cellule (solo) (NORA-7)",
    segment: "registered",
    subject: "◈ NORA-7 // vous opérez sans cellule",
    htmlBody: `${noraHeader("ARCHIVISTE DU PROTOCOLE")}
<p>Operator <strong style="color:#00ff9d;">{{ctfCompetitorName}}</strong>,</p>
<p>Mes registres indiquent que vous n'êtes rattaché(e) à aucune <strong>cellule</strong> pour l'opération EyesOpenCTF. Ce n'est pas un problème — un Operator peut opérer <strong>seul</strong>.</p>
<p>Vos options :</p>
<ul>
<li>🔍 <strong>Rejoindre une cellule existante</strong> — un autre Operator peut vous ajouter à son équipe sur la plateforme.</li>
<li>🆕 <strong>Constituer votre propre cellule</strong> — invitez jusqu'à 3 autres Operators via la plateforme.</li>
<li>🎯 <strong>Opérer en solo</strong> — parfaitement valide, le classement individuel est actif.</li>
</ul>
<p>Quel que soit votre choix, votre mission reste la même : récupérer les Fragments et me les transmettre pour authentification.</p>
<p>Gardez les yeux ouverts.<br><span style="color:#00ff9d;letter-spacing:2px;">— NORA-7, Protocole EyesOpen</span></p>`,
    subjectEn: "◈ NORA-7 // you are operating without a cell",
    htmlBodyEn: `${noraHeader("PROTOCOL ARCHIVIST")}
<p>Operator <strong style="color:#00ff9d;">{{ctfCompetitorName}}</strong>,</p>
<p>My records show you are not attached to any <strong>cell</strong> for the EyesOpenCTF operation. That is not a problem — an Operator can operate <strong>alone</strong>.</p>
<p>Your options:</p>
<ul>
<li>🔍 <strong>Join an existing cell</strong> — another Operator can add you to their team on the platform.</li>
<li>🆕 <strong>Form your own cell</strong> — invite up to 3 other Operators via the platform.</li>
<li>🎯 <strong>Operate solo</strong> — perfectly valid, the individual leaderboard is live.</li>
</ul>
<p>Whatever you choose, your mission is the same: recover the Fragments and transmit them to me for authentication.</p>
<p>Keep your eyes open.<br><span style="color:#00ff9d;letter-spacing:2px;">— NORA-7, EyesOpen Protocol</span></p>`,
  },
  {
    name: "⏰ CTF — L'arène ouvre dans 24h (NORA-7)",
    segment: "registered",
    subject: "◈ NORA-7 // l'arène ouvre dans 24h",
    htmlBody: `${noraHeader("ARCHIVISTE DU PROTOCOLE")}
<p>Operator <strong style="color:#00ff9d;">{{ctfCompetitorName}}</strong>,</p>
<p>L'<strong>arène</strong> ouvre dans moins de 24 heures. Contrôle des systèmes avant l'opération :</p>
<div style="background:#0d1117;border:1px solid #00ff9d40;border-radius:8px;padding:18px;margin:18px 0;color:#cfe;line-height:1.9;">
▸ Accès Protocol vérifié — <a href="https://ctf.eyesopensecurity.com" style="color:#00ff9d;">ctf.eyesopensecurity.com</a><br>
▸ Cellule confirmée (ou prêt(e) à opérer en solo)<br>
▸ Poste d'analyse prêt : VM / outils<br>
▸ Énergie & uplink : machine chargée, connexion fiable
</div>
<p>🕗 <strong>Fenêtre d'opération :</strong> du 20 novembre 2026 à <strong>20h00</strong> au 22 novembre à <strong>20h00</strong> (en ligne). Le classement en direct sera actif dès l'ouverture.</p>
<p>Avant de commencer, relisez votre <strong>briefing de mission</strong> — c'est une page vivante, et elle a peut-être déjà évolué depuis votre dernière visite :</p>
<div style="text-align:center;margin:20px 0;"><a href="${ASSET}/ctf-briefing.html" style="background:#00ff9d;color:#000;font-family:'Courier New',monospace;font-size:13px;font-weight:900;letter-spacing:2px;padding:13px 30px;border-radius:8px;text-decoration:none;display:inline-block;">► REVOIR LE BRIEFING VIVANT</a></div>
<p>Gardez les yeux ouverts.<br><span style="color:#00ff9d;letter-spacing:2px;">— NORA-7, Protocole EyesOpen</span></p>`,
    subjectEn: "◈ NORA-7 // the arena opens in 24h",
    htmlBodyEn: `${noraHeader("PROTOCOL ARCHIVIST")}
<p>Operator <strong style="color:#00ff9d;">{{ctfCompetitorName}}</strong>,</p>
<p>The <strong>arena</strong> opens in less than 24 hours. Pre-operation systems check:</p>
<div style="background:#0d1117;border:1px solid #00ff9d40;border-radius:8px;padding:18px;margin:18px 0;color:#cfe;line-height:1.9;">
▸ Protocol access verified — <a href="https://ctf.eyesopensecurity.com" style="color:#00ff9d;">ctf.eyesopensecurity.com</a><br>
▸ Cell confirmed (or ready to operate solo)<br>
▸ Analysis station ready: VM / tools<br>
▸ Power & uplink: machine charged, reliable connection
</div>
<p>🕗 <strong>Operation window:</strong> from November 20, 2026 at <strong>8:00 PM</strong> to November 22 at <strong>8:00 PM</strong> (online). The live leaderboard goes active at open.</p>
<p>Before you begin, revisit your <strong>mission briefing</strong> — it is a living page, and it may already have evolved since your last visit:</p>
<div style="text-align:center;margin:20px 0;"><a href="${ASSET}/ctf-briefing.html" style="background:#00ff9d;color:#000;font-family:'Courier New',monospace;font-size:13px;font-weight:900;letter-spacing:2px;padding:13px 30px;border-radius:8px;text-decoration:none;display:inline-block;">► REVISIT THE LIVING BRIEFING</a></div>
<p>Keep your eyes open.<br><span style="color:#00ff9d;letter-spacing:2px;">— NORA-7, EyesOpen Protocol</span></p>`,
  },
  {
    name: "⟁ CTF — Diffusion de recrutement « The Convergence »",
    segment: "newsletter",
    subject: "⟁ La Convergence a commencé // devenez Operator",
    htmlBody: `<img src="${ASSET}/email/convergence-hero.webp" width="536" alt="EyesOpenCTF — The Convergence" style="width:100%;max-width:536px;border-radius:10px;display:block;margin:0 auto 8px;border:1px solid #00ff9d33;" />
<div style="font-family:'Courier New',monospace;font-size:10px;color:#00ff9d70;letter-spacing:2px;margin:14px 0 8px;">&gt;_ EYESOPEN_PROTOCOL // RECRUITMENT_BROADCAST</div>
<h1 style="color:#00ff9d;">La Convergence a commencé.</h1>
<p>Le monde que vous connaissez n'est qu'une version de la réalité. Un phénomène menace de les faire s'effondrer les unes dans les autres — et le Protocole EyesOpen recrute des <strong>Operators</strong> pour l'arrêter.</p>
<p><strong>EyesOpenCTF 2026</strong> est une compétition de cybersécurité (CTF) unique, immersive et primée. Derrière chaque défi se cache un fragment d'une histoire qui se révèle à mesure que vous jouez.</p>
<div style="background:#0d1117;border:1px solid #00ff9d40;border-radius:8px;padding:18px;margin:18px 0;color:#cfe;line-height:1.9;">
🏁 <strong>40+ Challenges</strong> · 8 disciplines<br>
⏱ <strong>48 heures</strong> · en ligne<br>
🏆 <strong>500 000 XAF</strong> de récompenses<br>
📖 Une <strong>histoire vivante</strong> qui se déverrouille au fil de vos résolutions
</div>
<p style="text-align:center;margin:18px 0 6px;">
<img src="${ASSET}/email/watcher.webp" width="60" height="60" alt="The Watcher" style="border-radius:50%;border:1px solid #00ff9d40;margin:0 5px;" />
<img src="${ASSET}/email/nora.webp" width="60" height="60" alt="NORA-7" style="border-radius:50%;border:1px solid #00ff9d40;margin:0 5px;" />
<img src="${ASSET}/email/assa.webp" width="60" height="60" alt="Dr Assa Abene" style="border-radius:50%;border:1px solid #00ff9d40;margin:0 5px;" />
<img src="${ASSET}/email/voss.webp" width="60" height="60" alt="Adrian Voss" style="border-radius:50%;border:1px solid #00ff9d40;margin:0 5px;" />
</p>
<p style="text-align:center;color:#00ff9d80;font-size:11px;letter-spacing:1px;margin-top:0;">Ils vous attendent de l'autre côté.</p>
<div style="text-align:center;margin:24px 0;"><a href="${ASSET}/#ctf" style="background:#00ff9d;color:#000;font-family:'Courier New',monospace;font-size:14px;font-weight:900;letter-spacing:2px;padding:15px 34px;border-radius:8px;text-decoration:none;display:inline-block;">► DEVENIR OPERATOR</a></div>
<p style="color:#00ff9d80;text-align:center;font-size:12px;">L'inscription déclenche votre intégration au Protocole. The Watcher vous contactera.</p>`,
    subjectEn: "⟁ The Convergence has begun // become an Operator",
    htmlBodyEn: `<img src="${ASSET}/email/convergence-hero.webp" width="536" alt="EyesOpenCTF — The Convergence" style="width:100%;max-width:536px;border-radius:10px;display:block;margin:0 auto 8px;border:1px solid #00ff9d33;" />
<div style="font-family:'Courier New',monospace;font-size:10px;color:#00ff9d70;letter-spacing:2px;margin:14px 0 8px;">&gt;_ EYESOPEN_PROTOCOL // RECRUITMENT_BROADCAST</div>
<h1 style="color:#00ff9d;">The Convergence has begun.</h1>
<p>The world you know is only one version of reality. A phenomenon threatens to collapse them into one another — and the EyesOpen Protocol is recruiting <strong>Operators</strong> to stop it.</p>
<p><strong>EyesOpenCTF 2026</strong> is a unique, immersive and prized cybersecurity competition (CTF). Behind every challenge hides a fragment of a story that reveals itself as you play.</p>
<div style="background:#0d1117;border:1px solid #00ff9d40;border-radius:8px;padding:18px;margin:18px 0;color:#cfe;line-height:1.9;">
🏁 <strong>40+ Challenges</strong> · 8 disciplines<br>
⏱ <strong>48 hours</strong> · online<br>
🏆 <strong>500,000 XAF</strong> in prizes<br>
📖 A <strong>living story</strong> that unlocks as you solve
</div>
<p style="text-align:center;margin:18px 0 6px;">
<img src="${ASSET}/email/watcher.webp" width="60" height="60" alt="The Watcher" style="border-radius:50%;border:1px solid #00ff9d40;margin:0 5px;" />
<img src="${ASSET}/email/nora.webp" width="60" height="60" alt="NORA-7" style="border-radius:50%;border:1px solid #00ff9d40;margin:0 5px;" />
<img src="${ASSET}/email/assa.webp" width="60" height="60" alt="Dr Assa Abene" style="border-radius:50%;border:1px solid #00ff9d40;margin:0 5px;" />
<img src="${ASSET}/email/voss.webp" width="60" height="60" alt="Adrian Voss" style="border-radius:50%;border:1px solid #00ff9d40;margin:0 5px;" />
</p>
<p style="text-align:center;color:#00ff9d80;font-size:11px;letter-spacing:1px;margin-top:0;">They are waiting for you on the other side.</p>
<div style="text-align:center;margin:24px 0;"><a href="${ASSET}/#ctf" style="background:#00ff9d;color:#000;font-family:'Courier New',monospace;font-size:14px;font-weight:900;letter-spacing:2px;padding:15px 34px;border-radius:8px;text-decoration:none;display:inline-block;">► BECOME AN OPERATOR</a></div>
<p style="color:#00ff9d80;text-align:center;font-size:12px;">Registration triggers your integration into the Protocol. The Watcher will contact you.</p>`,
  },
  {
    // Auto-personnalisés : {{fname}} (nom), {{talkTitle}} (sujet du talk).
    name: "🎤 Speaker — Onboarding (proposition retenue)",
    segment: "cfp_onboarding",
    subject: "EOCON 2026 — Votre proposition a été retenue ! 🎉",
    htmlBody: `<p>Bonjour {{fname}},</p>
<p>L'équipe EyesOpen a le plaisir de vous informer que votre proposition a été <strong>retenue</strong> pour l'évènement cybersécurité <strong>EOCON 2026</strong>. Merci pour votre contribution et votre intérêt pour cet évènement.</p>
<p>🎯 <strong>Talk :</strong> {{talkTitle}}</p>
<p>Afin de promouvoir votre intervention, nous aurons besoin des éléments suivants :</p>
<ul>
<li>📷 Une <strong>photo portrait</strong> à jour (de préférence avec un fond clair et uniforme) ;</li>
<li>📍 Votre <strong>localisation</strong> (pays, ville, fuseau horaire) ;</li>
<li>🧑‍💼 Votre <strong>occupation actuelle</strong>, vos titres, réalisations, et une brève description de vous-même (la manière dont vous vous présenteriez en une, deux phrases ou plus).</li>
</ul>
<p>Ces informations serviront à assurer votre branding sur nos réseaux et à donner de la visibilité à votre intervention.</p>
<p>À la suite de cet email, vous recevrez le <strong>modèle PowerPoint</strong> qui servira de trame à toutes les présentations de l'évènement. Vous recevrez également le programme et les modalités pour nos speakers (avantages et règles d'engagement).</p>
<p>Merci de votre confiance.<br>L'équipe EOCON 2026<br><a href="mailto:speakers@eyesopensecurity.com" style="color:#00ff9d;">speakers@eyesopensecurity.com</a></p>`,
    subjectEn: "EOCON 2026 — Your proposal has been selected! 🎉",
    htmlBodyEn: `<p>Hello {{fname}}!</p>
<p>The EyesOpen team would like to inform you that your proposal has been <strong>selected</strong> for the <strong>EOCON 2026</strong> cybersecurity event. Thank you for your contribution and interest in this event.</p>
<p>🎯 <strong>Talk:</strong> {{talkTitle}}</p>
<p>We take this opportunity to inform you that to promote your presentation, we will need:</p>
<ul>
<li>📷 An <strong>up-to-date portrait photo</strong> of you (preferably with a bright and uniform background);</li>
<li>📍 Your <strong>permanent location</strong> (country, town, time zone);</li>
<li>🧑‍💼 Your <strong>current occupation</strong>, titles, achievements, and a brief description of yourself (roughly, how you would present yourself in one, two, or more sentences).</li>
</ul>
<p>This information will be used to ensure your branding on our networks and to give visibility to your intervention.</p>
<p>As a result of this email, you will receive the <strong>PowerPoint template</strong> which will serve as a cover for all the presentations during the event. You will also receive the program and orderliness for our speakers (benefits and rules of engagement).</p>
<p>Thank you for your confidence.<br>The EOCON 2026 team<br><a href="mailto:speakers@eyesopensecurity.com" style="color:#00ff9d;">speakers@eyesopensecurity.com</a></p>`,
  },
  {
    // Auto-personnalisés à l'envoi : {{fname}} (nom), {{talkTitle}} (sujet du talk),
    // et les détails de la session programmée dans le calendrier :
    // {{date}} {{time}} {{mode}} {{zoomLink}} {{slidesDeadline}}.
    name: "🎤 Speaker — Programmé (modalités de présentation)",
    segment: "cfp_scheduled",
    subject: "EOCON 2026 — Modalités de votre présentation 🎤",
    htmlBody: `<p>Bonjour {{fname}},</p>
<p>À la suite de nos échanges concernant l'évènement <strong>EOCON 2026</strong>, nous partageons avec vous les modalités de votre présentation :</p>
<ul>
<li>🖥 <strong>Mode :</strong> {{mode}}</li>
<li>🔗 <strong>Connexion :</strong> {{zoomLink}} <span style="color:#888;">(le cas échéant — le lien peut vous être partagé ultérieurement)</span></li>
<li>📅 <strong>Date :</strong> {{date}}</li>
<li>🕓 <strong>Horaire :</strong> à partir de {{time}}</li>
<li>🎯 <strong>Sujet :</strong> {{talkTitle}}</li>
</ul>
<p><em>PS : merci de bien vouloir confirmer si le timing ci-dessus vous convient.</em></p>
<h2 style="color:#00ff9d;font-size:1rem;margin-top:1.5rem;">📊 La présentation</h2>
<ul>
<li>Elle durera <strong>50 minutes</strong> (prévoir 10 minutes pour les questions de l'auditoire) ;</li>
<li>Le modèle graphique PowerPoint est le même pour tous les speakers (voir fichiers joints) ;</li>
<li>Pour garder une cohérence entre la durée planifiée et votre fichier, merci de ne pas dépasser <strong>20 pages</strong> (pages de garde exclues : titre, speaker, plan, questions) ;</li>
<li>Merci de nous faire parvenir votre présentation complète au plus tard le <strong>{{slidesDeadline}}</strong> ;</li>
<li>Votre présentation orale sera enregistrée pendant l'évènement et partagée sur nos réseaux ;</li>
<li>Si vous illustrez des attaques informatiques, merci de préciser un <strong>disclaimer/avertissement</strong> à ne pas reproduire et d'expliquer à l'auditoire comment s'en protéger.</li>
</ul>
<h2 style="color:#00ff9d;font-size:1rem;margin-top:1.5rem;">📣 Publicités et annonces</h2>
<p>Vous n'êtes malheureusement pas autorisé(e) à faire de la publicité ou la promotion d'un produit/service (que vous en soyez le représentant ou non), aussi bien dans votre fichier que dans le contenu de votre présentation. Si toutefois vous le souhaitez, nous avons des formules flexibles adaptées à ce besoin (prendre attache avec le comité).</p>
<h2 style="color:#00ff9d;font-size:1rem;margin-top:1.5rem;">📍 L'évènement</h2>
<p>Quel que soit votre horaire de passage, votre présence est requise <strong>30 minutes avant le début effectif</strong> de l'évènement. Cette disposition est importante pour l'organisation de nos équipes et les modalités pratiques.</p>
<p>Merci de nous prévenir bien à l'avance de tout éventuel contretemps ou absence. Nous faisons confiance à votre sens des responsabilités.</p>
<p>Merci encore d'être de la partie. Nous restons disponibles pour toutes vos questions.<br>L'équipe EOCON 2026</p>`,
    subjectEn: "EOCON 2026 — Your presentation details 🎤",
    htmlBodyEn: `<p>Hello {{fname}}!</p>
<p>Following our discussions regarding the <strong>EOCON 2026</strong> event, we are sharing the details of your presentation with you:</p>
<ul>
<li>🖥 <strong>Mode:</strong> {{mode}}</li>
<li>🔗 <strong>Connection:</strong> {{zoomLink}} <span style="color:#888;">(if applicable — the link may be shared with you later)</span></li>
<li>📅 <strong>Date:</strong> {{date}}</li>
<li>🕓 <strong>Time:</strong> from {{time}}</li>
<li>🎯 <strong>Topic:</strong> {{talkTitle}}</li>
</ul>
<p><em>PS: please confirm whether the timing above works for you.</em></p>
<h2 style="color:#00ff9d;font-size:1rem;margin-top:1.5rem;">📊 The presentation</h2>
<ul>
<li>It will last <strong>50 minutes</strong> (allow 10 minutes for audience questions);</li>
<li>The PowerPoint graphic template is the same for all speakers (see attached files);</li>
<li>To keep consistency between the planned duration and your file, please do not exceed <strong>20 pages</strong> (cover pages excluded: title, speaker, outline, questions);</li>
<li>Please send us your complete presentation no later than <strong>{{slidesDeadline}}</strong>;</li>
<li>Your oral presentation will be recorded during the event and shared on our networks;</li>
<li>If you illustrate cyberattacks, please include a <strong>disclaimer/warning</strong> not to reproduce them and explain to the audience how to protect themselves.</li>
</ul>
<h2 style="color:#00ff9d;font-size:1rem;margin-top:1.5rem;">📣 Advertising and announcements</h2>
<p>Unfortunately, you are not allowed to advertise or promote a product/service (whether or not you are its representative), either in your file or in the content of your presentation. However, if you wish to do so, we have flexible packages suited to this need (please contact the committee).</p>
<h2 style="color:#00ff9d;font-size:1rem;margin-top:1.5rem;">📍 The event</h2>
<p>Regardless of your speaking time, your presence is required <strong>30 minutes before the actual start</strong> of the event. This is important for the organization of our teams and practical arrangements.</p>
<p>Please notify us well in advance of any possible delay or absence. We trust your sense of responsibility.</p>
<p>Thank you again for being part of it. We remain available for any questions.<br>The EOCON 2026 team</p>`,
  },
];

export async function POST() {
  if (!(await hasPermission("communication", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // The three CTF competitor emails were reworked into the lore theme (NORA-7).
  // Remove their pre-lore versions so the new templates replace them instead of
  // lingering as duplicates. Idempotent.
  const RETIRED_NAMES = [
    "🔑 CTF — Accès CTFd & identifiants de connexion",
    "🤝 CTF — Participation sans équipe (solo)",
    "⏰ CTF — Rappel J-1 EyesOpenCTF",
  ];
  const removed = await prisma.emailTemplate.deleteMany({ where: { name: { in: RETIRED_NAMES } } });

  const existing = await prisma.emailTemplate.findMany({ select: { name: true } });
  const existingNames = new Set(existing.map(t => t.name));

  const toCreate = SEED_TEMPLATES.filter(t => !existingNames.has(t.name));
  if (toCreate.length === 0 && removed.count === 0) {
    return NextResponse.json({ created: 0, message: "Templates déjà seedés" });
  }
  if (toCreate.length > 0) await prisma.emailTemplate.createMany({ data: toCreate });
  return NextResponse.json({ created: toCreate.length, retired: removed.count });
}
