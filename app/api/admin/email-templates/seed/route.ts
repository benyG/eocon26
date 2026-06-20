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
✅ CTF EOCTF — 48h de compétition</p>
<p>Si vous n'êtes pas encore inscrit(e), il est encore temps :</p>
<p><a href="https://eyesopensecurity.com/#inscription" style="background:#00ff9d;color:#000;padding:12px 24px;border-radius:4px;font-weight:bold;text-decoration:none;">S'inscrire maintenant</a></p>`,
    subjectEn: "EOCON 2026 — Only 30 days left!",
    htmlBodyEn: `<h1>30 days until EOCON 2026 ⚡</h1>
<p>Hi {{fname}},</p>
<p>Only <strong>30 days</strong> left before the event! Are you ready?</p>
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
  {
    name: "🔑 CTF — Accès CTFd & identifiants de connexion",
    segment: "registered",
    subject: "EOCTF 2026 — Votre compte CTFd est prêt 🔑",
    htmlBody: `<h1>Vos identifiants EOCTF 2026 🔑</h1>
<p>Bonjour {{fname}},</p>
<p>Votre compte sur la plateforme <strong>CTFd EOCTF</strong> vient d'être créé. Voici vos informations de connexion :</p>
<ul>
<li>🌐 <strong>Plateforme :</strong> <a href="https://ctf.eyesopensecurity.com" style="color:#00ff9d;">ctf.eyesopensecurity.com</a></li>
<li>👤 <strong>Nom d'utilisateur :</strong> {{fname}}</li>
<li>📧 <strong>Email :</strong> {{email}}</li>
<li>🔒 <strong>Mot de passe :</strong> défini lors de votre inscription — réinitialisable via la plateforme</li>
</ul>
<p>⚠️ Connectez-vous <strong>avant le début de la compétition</strong> pour vérifier votre accès et rejoindre ou créer votre équipe (max 4 personnes).</p>
<p>La compétition démarre le <strong>27 novembre 2026 à 20h00</strong> et se termine le <strong>28 novembre à 20h00</strong>.</p>
<p>May the flags be with you 🚩<br>L'équipe EOCON 2026</p>`,
    subjectEn: "EOCTF 2026 — Your CTFd account is ready 🔑",
    htmlBodyEn: `<h1>Your EOCTF 2026 credentials 🔑</h1>
<p>Hi {{fname}},</p>
<p>Your account on the <strong>EOCTF CTFd</strong> platform has just been created. Here are your login details:</p>
<ul>
<li>🌐 <strong>Platform:</strong> <a href="https://ctf.eyesopensecurity.com" style="color:#00ff9d;">ctf.eyesopensecurity.com</a></li>
<li>👤 <strong>Username:</strong> {{fname}}</li>
<li>📧 <strong>Email:</strong> {{email}}</li>
<li>🔒 <strong>Password:</strong> set during registration — can be reset via the platform</li>
</ul>
<p>⚠️ Log in <strong>before the competition starts</strong> to verify your access and join or create your team (max 4 members).</p>
<p>The competition runs from <strong>November 27, 2026 at 8:00 PM</strong> to <strong>November 28 at 8:00 PM</strong>.</p>
<p>May the flags be with you 🚩<br>The EOCON 2026 team</p>`,
  },
  {
    name: "🤝 CTF — Participation sans équipe (solo)",
    segment: "registered",
    subject: "EOCTF 2026 — Vous participez en solo 🤝",
    htmlBody: `<h1>Vous jouez en solo à EOCTF 2026 🤝</h1>
<p>Bonjour {{fname}},</p>
<p>Nous avons constaté que vous n'êtes encore rattaché(e) à aucune équipe pour le <strong>CTF EOCTF 2026</strong>. Pas de panique — vous pouvez tout à fait participer en <strong>solo</strong> !</p>
<p>Quelques options s'offrent à vous :</p>
<ul>
<li>🔍 <strong>Rejoindre une équipe existante</strong> — consultez le forum Discord EOCON pour trouver une équipe qui recrute</li>
<li>🆕 <strong>Créer votre propre équipe</strong> — invitez jusqu'à 3 autres participants via la plateforme CTFd</li>
<li>🎯 <strong>Jouer en solo</strong> — tout à fait valide, le classement individuel est actif</li>
</ul>
<p>💬 Rejoignez le serveur Discord EOCON pour échanger avec d'autres participants : <a href="https://discord.gg/eocon" style="color:#00ff9d;">discord.gg/eocon</a></p>
<p>La compétition démarre le <strong>27 novembre 2026 à 20h00</strong>. Bonne chance !<br>L'équipe EOCON 2026</p>`,
    subjectEn: "EOCTF 2026 — You're participating solo 🤝",
    htmlBodyEn: `<h1>You're playing solo at EOCTF 2026 🤝</h1>
<p>Hi {{fname}},</p>
<p>We noticed you haven't joined a team yet for the <strong>EOCTF 2026 CTF</strong>. No worries — you can absolutely compete <strong>solo</strong>!</p>
<p>Here are your options:</p>
<ul>
<li>🔍 <strong>Join an existing team</strong> — check the EOCON Discord forum to find a team that's recruiting</li>
<li>🆕 <strong>Create your own team</strong> — invite up to 3 other participants via the CTFd platform</li>
<li>🎯 <strong>Play solo</strong> — totally valid, the individual leaderboard is live</li>
</ul>
<p>💬 Join the EOCON Discord server to connect with other participants: <a href="https://discord.gg/eocon" style="color:#00ff9d;">discord.gg/eocon</a></p>
<p>The competition starts <strong>November 27, 2026 at 8:00 PM</strong>. Good luck!<br>The EOCON 2026 team</p>`,
  },
  {
    name: "⏰ CTF — Rappel J-1 EOCTF",
    segment: "registered",
    subject: "EOCTF 2026 — La compétition commence demain soir ! ⚡",
    htmlBody: `<h1>EOCTF 2026, c'est demain ! ⚡</h1>
<p>Bonjour {{fname}},</p>
<p>La compétition <strong>EOCTF 2026</strong> démarre dans moins de 24 heures. Êtes-vous prêt(e) ?</p>
<p>📋 <strong>Checklist avant le départ :</strong></p>
<ul>
<li>✅ Compte CTFd vérifié — <a href="https://ctf.eyesopensecurity.com" style="color:#00ff9d;">ctf.eyesopensecurity.com</a></li>
<li>✅ Équipe rejointe ou créée (ou prêt(e) à jouer en solo)</li>
<li>✅ Environnement prêt : Kali Linux / VM / outils CTF installés</li>
<li>✅ Laptop chargé & chargeur dans le sac</li>
<li>✅ Connexion internet fiable prévue</li>
</ul>
<p>🕗 <strong>Démarrage :</strong> 27 novembre 2026 à <strong>20h00</strong> (heure de Douala)<br>
🏁 <strong>Fin :</strong> 28 novembre 2026 à <strong>20h00</strong><br>
📍 Plateforme en ligne + présence sur site possible</p>
<p>Le classement en direct sera visible sur la plateforme dès le début. Les flags vous attendent — bonne chasse ! 🚩<br>L'équipe EOCON 2026</p>`,
    subjectEn: "EOCTF 2026 — The competition starts tomorrow night! ⚡",
    htmlBodyEn: `<h1>EOCTF 2026 is tomorrow! ⚡</h1>
<p>Hi {{fname}},</p>
<p>The <strong>EOCTF 2026</strong> competition kicks off in less than 24 hours. Are you ready?</p>
<p>📋 <strong>Pre-game checklist:</strong></p>
<ul>
<li>✅ CTFd account verified — <a href="https://ctf.eyesopensecurity.com" style="color:#00ff9d;">ctf.eyesopensecurity.com</a></li>
<li>✅ Team joined or created (or ready to play solo)</li>
<li>✅ Environment ready: Kali Linux / VM / CTF tools installed</li>
<li>✅ Laptop charged & charger in your bag</li>
<li>✅ Reliable internet connection secured</li>
</ul>
<p>🕗 <strong>Start:</strong> November 27, 2026 at <strong>8:00 PM</strong> (Douala time)<br>
🏁 <strong>End:</strong> November 28, 2026 at <strong>8:00 PM</strong><br>
📍 Online platform + on-site presence possible</p>
<p>The live leaderboard will be visible on the platform from the start. The flags are waiting — happy hunting! 🚩<br>The EOCON 2026 team</p>`,
  },
  {
    name: "🎤 Speaker — Onboarding & bienvenue",
    segment: "cfp_onboarding",
    subject: "EOCON 2026 — Bienvenue, vous êtes speaker ! 🎉",
    htmlBody: `<h1>Félicitations, vous êtes speaker EOCON 2026 ! 🎤</h1>
<p>Bonjour {{fname}},</p>
<p>C'est avec grand plaisir que nous vous confirmons votre sélection comme <strong>intervenant(e)</strong> à <strong>EOCON 2026</strong>, l'évènement cybersécurité de référence en Afrique centrale.</p>
<p>📅 <strong>28 novembre 2026</strong> · 📍 <strong>Hotel Onomo, Douala, Cameroun</strong></p>
<h2 style="color:#00ff9d;font-size:1rem;margin-top:1.5rem;">📋 Prochaines étapes</h2>
<ul>
<li>✅ Confirmez votre participation en répondant à cet email</li>
<li>📝 Envoyez votre <strong>biographie</strong> (150 mots max) et votre <strong>photo professionnelle</strong> (JPG, min 800×800px)</li>
<li>🎯 Précisez le <strong>titre définitif</strong> de votre talk et le résumé (200 mots max)</li>
<li>📊 Les slides devront être envoyées au plus tard <strong>7 jours avant l'évènement</strong></li>
</ul>
<h2 style="color:#00ff9d;font-size:1rem;margin-top:1.5rem;">🎁 Ce que nous prenons en charge</h2>
<ul>
<li>🏨 Hébergement la nuit du 27 au 28 novembre</li>
<li>🍽 Repas et pauses café</li>
<li>🎫 Accès VIP à l'intégralité de l'évènement</li>
</ul>
<p>Notre équipe vous contactera prochainement pour discuter de la logistique.</p>
<p>À très bientôt,<br>L'équipe EOCON 2026<br><a href="mailto:speakers@eyesopensecurity.com" style="color:#00ff9d;">speakers@eyesopensecurity.com</a></p>`,
    subjectEn: "EOCON 2026 — Welcome, you are a speaker! 🎉",
    htmlBodyEn: `<h1>Congratulations, you are an EOCON 2026 speaker! 🎤</h1>
<p>Hi {{fname}},</p>
<p>We are thrilled to confirm your selection as a <strong>speaker</strong> at <strong>EOCON 2026</strong>, Central Africa's leading cybersecurity event.</p>
<p>📅 <strong>November 28, 2026</strong> · 📍 <strong>Hotel Onomo, Douala, Cameroon</strong></p>
<h2 style="color:#00ff9d;font-size:1rem;margin-top:1.5rem;">📋 Next steps</h2>
<ul>
<li>✅ Confirm your participation by replying to this email</li>
<li>📝 Send your <strong>biography</strong> (150 words max) and <strong>professional photo</strong> (JPG, min 800×800px)</li>
<li>🎯 Specify the <strong>final title</strong> of your talk and summary (200 words max)</li>
<li>📊 Slides must be submitted no later than <strong>7 days before the event</strong></li>
</ul>
<h2 style="color:#00ff9d;font-size:1rem;margin-top:1.5rem;">🎁 What we cover</h2>
<ul>
<li>🏨 Accommodation on the night of November 27–28</li>
<li>🍽 Meals and coffee breaks</li>
<li>🎫 VIP access to the entire event</li>
</ul>
<p>Our team will contact you soon to discuss logistics.</p>
<p>See you soon,<br>The EOCON 2026 team<br><a href="mailto:speakers@eyesopensecurity.com" style="color:#00ff9d;">speakers@eyesopensecurity.com</a></p>`,
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
