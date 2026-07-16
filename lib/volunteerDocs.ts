// Onboarding documents for volunteers: hands-on tutorials for the admin menu
// blocks, one framing guide per volunteer role, and the volunteer charter.
// Sent by email from the volunteer kanban's "Documents" tab.
//
// Content is French-first (the operating language of the volunteer team).

export interface VolunteerDoc {
  key: string;
  title: string;
  emoji: string;
  kind: "tutorial" | "role" | "charter";
  html: string; // inner HTML of the document body (email-safe inline styles)
}

// ── Small HTML helpers (email clients need inline styles) ────────────────────
const AC = "#00ff9d";
const h2 = (t: string) => `<h2 style="font-size:16px;color:${AC};margin:28px 0 10px;font-family:Georgia,serif;">${t}</h2>`;
const h3 = (t: string) => `<h3 style="font-size:13px;color:#ffffff;margin:18px 0 6px;">${t}</h3>`;
const p = (t: string) => `<p style="font-size:13px;color:#b8c0c8;line-height:1.8;margin:0 0 10px;">${t}</p>`;
const ol = (items: string[]) => `<ol style="margin:0 0 12px;padding-left:22px;">${items.map(i => `<li style="font-size:13px;color:#b8c0c8;line-height:1.8;margin-bottom:6px;">${i}</li>`).join("")}</ol>`;
const ul = (items: string[]) => `<ul style="margin:0 0 12px;padding-left:22px;">${items.map(i => `<li style="font-size:13px;color:#b8c0c8;line-height:1.8;margin-bottom:6px;">${i}</li>`).join("")}</ul>`;
const tip = (t: string) => `<p style="font-size:12px;color:#ffaa00;background:#ffaa0012;border:1px solid #ffaa0030;border-radius:6px;padding:10px 12px;line-height:1.7;margin:0 0 12px;">💡 ${t}</p>`;
const warn = (t: string) => `<p style="font-size:12px;color:#ff8888;background:#ff333312;border:1px solid #ff333330;border-radius:6px;padding:10px 12px;line-height:1.7;margin:0 0 12px;">⚠️ ${t}</p>`;
const b = (t: string) => `<strong style="color:#ffffff;">${t}</strong>`;
const g = (t: string) => `<strong style="color:${AC};">${t}</strong>`;

// ══ TUTORIELS DE PRISE EN MAIN ════════════════════════════════════════════════

const TUTO_COMMUNICATION = `
${p(`Ce tutoriel vous apprend à utiliser le bloc ${b("Communication")} de l'espace admin : publier sur les réseaux sociaux, suivre le calendrier éditorial et envoyer des campagnes mailing. Accès : menu latéral → groupe ${g("📢 Communication")}.`)}

${h2("1. Votre boussole : la checklist de la semaine")}
${p(`En haut de l'onglet ${b("📱 Social network")} se trouve la ${b("checklist de la semaine")}. C'est votre liste de choses à ne pas rater (ex. « 1–2 posts/jour », « Email de la semaine », « 2 posts veille cyber »). Cochez chaque tâche accomplie : rien ne doit rester décoché en fin de semaine.`)}

${h2("2. Le calendrier éditorial")}
${p(`Le calendrier mensuel affiche ${b("toute la planification")} : posts sociaux, campagnes email, publications ciblées et jalons. Chaque pastille colorée est un élément planifié. Cliquez sur un jour pour voir/éditer les posts de ce jour.`)}
${ul([
  `${b("Orange/rouge")} = en retard : à traiter en priorité.`,
  `Un élément « à configurer » attend qu'un opérateur le transforme en vrai post ou campagne.`,
])}

${h2("3. Créer un post avec l'IA (flux complet)")}
${ol([
  `Choisissez le ${b("type de contexte")} : speaker, session, workshop, sponsor, compte à rebours, CFP, inscriptions, CTF, volunteer ou custom. Pour ${b("workshop")} et ${b("sponsor")}, choisissez aussi l'${b("axe")} : annoncer un élément précis (combobox) ou encourager à saisir l'opportunité.`,
  `Le ${b("brief")} se pré-remplit automatiquement ; complétez-le si besoin.`,
  `Sélectionnez les ${b("plateformes")} (LinkedIn, Twitter/X, Instagram, Facebook, WhatsApp) et la ${b("langue")} (FR/EN/les deux).`,
  `Ajoutez une ${b("image")} depuis la Library si pertinent — l'image est associée à tous les posts générés. ${b("Instagram exige une image")}.`,
  `Cliquez ${g("Générer")} : l'IA rédige un texte calibré par plateforme (280 caractères max pour Twitter/X).`,
  `${b("Relisez et modifiez")} chaque texte : rien ne part sans validation humaine.`,
  `${g("Programmer")} (date/heure — par défaut le lendemain 09h00) ou ${g("Publier maintenant")}.`,
])}
${tip(`Si votre compte est soumis à la « contrainte de validation », votre publication part d'abord en ${b("Approbations")} : un approbateur la valide avant qu'elle ne rejoigne le calendrier. C'est normal, pas une erreur.`)}

${h2("4. Suivre les posts publiés")}
${p(`Sous le calendrier, la liste des posts montre leur statut : ${b("draft")} (brouillon), ${b("scheduled")} (programmé), ${b("published")} (publié, avec lien « Voir »), ${b("failed")} (échec, message d'erreur affiché — corrigez et relancez).`)}

${h2("5. Campagnes mailing (onglet 📬 Campagnes)")}
${ol([
  `Ouvrez ${b("Campagnes")} → ${g("Nouvelle campagne")}.`,
  `Donnez un ${b("nom")} et choisissez un ${b("modèle d'email")} (créez-le d'abord dans « Modèles campagne » si nécessaire).`,
  `Définissez le ${b("segment")} d'audience : inscrits, newsletter, speakers CFP, volontaires… avec filtres (type de billet, CTF, langue…). Le nombre de destinataires s'affiche.`,
  `Envoyez-vous un ${b("email de test")} (FR et EN) et vérifiez le rendu sur mobile.`,
  `Cliquez ${g("🚀 Envoyer")} : confirmation demandée, l'action est définitive.`,
])}
${warn(`Jamais d'envoi de masse sans test préalable et sans double lecture de l'objet et des liens. Une campagne envoyée ne peut pas être rappelée.`)}

${h2("6. En cas de problème")}
${ul([
  `Post Instagram en erreur « Media ID not available » : réessayez après ~1 minute (le média met du temps à être prêt côté Meta).`,
  `Doute sur un contenu sensible : demandez validation au responsable communication avant de publier.`,
])}
`;

const TUTO_SPONSORS = `
${p(`Ce tutoriel couvre le bloc ${b("Sponsors")} : le pipeline de prospection, les relances et la conclusion d'un partenariat. Accès : menu latéral → groupe ${g("🤝 Sponsors")} → ${b("Pipeline Sponsors")}.`)}

${h2("1. Comprendre le kanban")}
${p(`Chaque carte est un prospect (une entreprise). Les colonnes reflètent l'avancement : ${b("Demande, Prospect, Contacté, Réunion, Avancée positive, Avancée négative, Conclu, Abandonné, En pause")}. On fait glisser la carte de colonne en colonne au fil des échanges.`)}
${ul([
  `L'avatar rond sur la carte = le ${b("responsable assigné")} (« Assigné à »). Chaque prospect a un responsable unique.`,
  `Le bandeau ${b("« À traiter aujourd'hui »")} en haut liste vos relances dues et les prospects jamais contactés : commencez par là chaque jour.`,
])}

${h2("2. Ajouter des prospects")}
${ul([
  `${b("Un par un")} : bouton ${g("Ajouter un prospect")} → organisation (obligatoire), contact, email, téléphone, site, package visé, ${b("Assigné à")} (obligatoire), notes.`,
  `${b("En masse")} : bouton ${g("📥 Importer XLSX")}. Fichier avec en-têtes : Organisation (obligatoire), Contact, Email, Téléphone, Site web, Package, Notes. Les prospects importés restent ${b("« en attente d'attribution »")} et n'entrent dans le pipeline qu'une fois un responsable désigné dans le bandeau jaune.`,
])}

${h2("3. La cadence de relance J+2 / J+5 / J+10 / J+15")}
${p(`Après un premier contact, le système programme automatiquement des rappels de relance à J+2, J+5, J+10 puis J+15. Le responsable assigné reçoit un rappel par email. Quand vous relancez réellement le prospect, cliquez ${g("🔄 Marquer relancé")} : la cadence redémarre.`)}

${h2("4. Générer et envoyer un email avec l'IA")}
${ol([
  `Sur la carte du prospect, cliquez ${g("✨ Générer une relance")} (ou ✨ Draft).`,
  `L'IA rédige un email court (≤ 150 mots) dont le ton s'adapte au statut du prospect (premier contact vs relance).`,
  `${b("Relisez, personnalisez")} (nom du contact, référence à votre dernier échange), choisissez les documents à joindre (deck sponsor…).`,
  `Envoyez : l'horloge de relance se repositionne automatiquement.`,
])}

${h2("5. Conclure un sponsor")}
${ol([
  `Quand l'accord est trouvé, cliquez ${g("Conclure")} sur la carte.`,
  `Choisissez le ${b("package")} définitif : le sponsor officiel est créé et la carte passe en « Conclu ».`,
  `Une ${b("checklist des livrables")} (logo sur le site, posts d'annonce, stand…) apparaît : cochez chaque contrepartie livrée jusqu'à « N/N livrés ».`,
])}
${tip(`Notez CHAQUE échange dans les notes du prospect (date + résumé en une ligne). Le suivant qui ouvre la carte doit comprendre l'historique en 10 secondes.`)}
${warn(`Ne promettez jamais une contrepartie hors package sans validation du responsable sponsors.`)}
`;

const TUTO_CTF = `
${p(`Ce tutoriel couvre le bloc ${b("⚡ EyesOpen CTF")} : préparation des challenges, plateforme CTFd et gestion des participants. Accès : menu latéral → groupe ${g("CTF")}.`)}

${h2("1. Les trois sous-onglets")}
${ul([
  `${b("⚙ Config")} : connexion à la plateforme CTFd (URL + clé API) et activation du scoreboard public.`,
  `${b("🏁 Challenges")} : le kanban de préparation des épreuves.`,
  `${b("👤 Participants")} : les compétiteurs inscrits et la synchronisation de leurs comptes CTFd.`,
])}

${h2("2. Préparer les challenges (kanban)")}
${p(`Chaque challenge avance dans 5 colonnes : ${b("Idée → En cours → Test → Validé → Publié CTFd")}. Glissez-déposez les cartes au fil de l'avancement.`)}
${ol([
  `${g("+ Ajouter challenge")} : titre, catégorie (WEB, CRYPTO, FORENSICS, REVERSE, PWN, OSINT, MISC), difficulté (Easy/Medium/Hard), points, auteur.`,
  `Cliquez une carte pour l'éditer et surtout ${b("assigner un responsable")} (membre d'équipe) — il reçoit un email de notification.`,
  `Un challenge ne passe en ${b("Validé")} qu'après avoir été ${b("testé par quelqu'un d'autre que son auteur")} (flag soumis avec succès, énoncé clair, fichiers joints fonctionnels).`,
  `${b("Publié CTFd")} = mis en ligne sur la plateforme de compétition.`,
])}
${p(`La barre du haut montre le compte par catégorie et le total « ✓ N prêts » — l'objectif est un jeu équilibré entre catégories et difficultés.`)}

${h2("3. Gérer les participants")}
${ol([
  `L'onglet ${b("👤 Participants")} liste les inscrits ayant un billet CTF validé, avec pseudo, équipe (ou « solo ») et l'état du compte CTFd.`,
  `${g("⚡ Tout synchroniser sur CTFd")} crée en masse les comptes manquants — les identifiants (mot de passe unique de 7 caractères) sont ${b("envoyés automatiquement par email")} à chaque compétiteur.`,
  `Si une bannière ${b("« Conflits de noms d'équipe »")} apparaît (ex. « Team Alpha » vs « TeamAlpha »), cliquez ${g("Réconcilier")}, choisissez le nom à garder et confirmez : les participants sont fusionnés dans la même équipe.`,
  `Le bouton ${b("Créer compte")} sur une ligne synchronise un participant individuellement.`,
])}

${h2("4. Avant le jour J — check final")}
${ul([
  `Config : ${g("Tester la connexion")} CTFd doit répondre « ✓ Connexion réussie ».`,
  `Tous les challenges prévus sont en ${b("Publié CTFd")}.`,
  `Tous les participants ont leur compte « ✓ Créé ».`,
  `Le toggle ${b("CTF activé")} rend le scoreboard public visible (page /ctf).`,
])}
${warn(`Ne partagez JAMAIS un flag, même à un participant insistant. En cas de challenge cassé pendant la compétition, prévenez immédiatement le responsable CTF — ne le réparez pas seul en production.`)}
`;

const TUTO_LIVE = `
${p(`Ce tutoriel couvre le bloc ${b("🔴 Live Streaming")} : préparer les sessions diffusées, opérer pendant le direct et modérer les questions du public. Accès : menu latéral → groupe ${g("Live Streaming")} → ${b("🎬 Studio")}. Le bouton ${b("📖 Guide opérateur")} en haut de page contient l'aide-mémoire complet.`)}

${h2("1. Les trois modes")}
${ul([
  `${b("🔴 En direct")} : le tableau de bord du jour J (statut du flux, spectateurs, Q&A).`,
  `${b("📅 Planification session")} : préparer chaque session diffusée (liens, modérateurs, techniciens).`,
  `${b("⚙️ Configuration")} : flux, salles, overlays, connexion Restream — ne pas toucher sans consigne.`,
])}

${h2("2. Avant l'événement — planifier une session")}
${ol([
  `Mode ${b("Planification")} : choisissez la session au programme.`,
  `Renseignez le ${b("lien live")} : ${g("↗ Récupérer")} détecte le live Restream en cours, ou ${g("+ Créer")} génère un événement YouTube non listé.`,
  `Désignez le(s) ${b("modérateur(s)")} et ${b("technicien(s)")} parmi l'équipe, plus les panélistes externes éventuels (nom/email/langue).`,
  `${g("Sauvegarder")} puis ${g("Notifier l'équipe")} : chacun reçoit son lien par email — le modérateur reçoit un ${b("lien modérateur personnel")} avec ses consignes.`,
])}

${h2("3. Pendant le direct — votre écran de contrôle")}
${ul([
  `${b("Statut Restream")} : voyant EN DIRECT/HORS LIGNE et, par canal (YouTube, Facebook, LinkedIn…), le badge LIVE et le nombre de spectateurs. Si tout est HORS LIGNE alors que la salle diffuse → alertez le technicien immédiatement.`,
  `${b("📢 Annonce broadcast")} : bannière affichée sur la page publique /live (retard, changement de salle, pause déjeuner…). Cochez « Activer », fixez l'expiration.`,
  `Les stats (En ligne, Q en attente…) se rafraîchissent automatiquement toutes les 60 secondes ; ${g("↺ Rafraîchir")} pour forcer.`,
])}

${h2("4. Modérer les questions (Q&A)")}
${ol([
  `Les questions du public arrivent en ${b("pending")} (en attente).`,
  `${g("✓ Approuver")} rend la question visible pour l'animateur — filtrez le hors-sujet, les doublons et tout contenu inapproprié.`,
  `Quand le speaker y a répondu, marquez ${g("✅ Répondue")}.`,
  `Priorisez les questions avec beaucoup de ${b("votes")} (upvotes).`,
])}
${tip(`Rythme conseillé : balayez la file des questions toutes les 2–3 minutes pendant une session. Une question approuvée tardivement est une question perdue.`)}
${warn(`Ne modifiez jamais la Configuration (flux, RTMP, salles) pendant un direct sans instruction explicite du technicien responsable.`)}
`;

const TUTO_CHECKIN = `
${p(`Ce tutoriel couvre le ${b("Check-in & Scan QR")} : valider l'entrée des participants le jour J. Deux outils : le ${b("scanner QR")} (${g("/checkin/scan")}) et la ${b("liste des inscrits")} (${g("/checkin")}). Votre compte doit avoir les droits check-in — sinon « ACCÈS REFUSÉ », voyez votre référent.`)}

${h2("1. Préparer votre appareil")}
${ul([
  `Utilisez ${b("Chrome")} sur smartphone ou tablette (le lecteur QR n'est pas supporté sur tous les navigateurs).`,
  `La caméra exige ${b("HTTPS")} : ouvrez toujours l'URL officielle de la plateforme.`,
  `Au premier lancement, ${b("autorisez l'accès caméra")} quand le navigateur le demande (caméra arrière utilisée automatiquement).`,
])}

${h2("2. Scanner un participant")}
${ol([
  `Ouvrez ${g("/checkin/scan")} → ${g("DÉMARRER LE SCANNER")}.`,
  `Pointez le viseur vers le QR code du billet (à l'écran ou imprimé).`,
  `Lisez le résultat — c'est l'étape qui compte :`,
])}
${ul([
  `${b("✓ CHECK-IN VALIDÉ")} (vert) : nom + type de billet affichés. Souhaitez la bienvenue, remettez le badge/bracelet. Le scanner reprend seul après 2,5 s.`,
  `${b("🚨 DÉJÀ ENREGISTRÉ")} (rouge) : ce billet a déjà servi (date, heure et opérateur affichés). ${b("Ne laissez pas entrer")} ; une alerte a été envoyée automatiquement à la sécurité — notifiez aussi le chef de protocole. Restez courtois : c'est souvent un double-scan involontaire.`,
  `${b("✗ QR INVALIDE")} : QR non reconnu. Vérifiez que c'est bien le billet EOCON, essayez la saisie manuelle (ci-dessous), sinon orientez vers le point d'accueil principal.`,
  `${b("Paiement non confirmé")} : l'inscription n'est pas validée — dirigez le participant vers le responsable des inscriptions, n'improvisez pas de validation.`,
])}

${h2("3. Les plans B")}
${ul([
  `${b("Saisie manuelle")} : sur la page scanner, collez le contenu du QR dans le champ « Saisie manuelle » → OK.`,
  `${b("Recherche par nom")} : ouvrez ${g("/checkin")}, tapez le nom ou l'email. Si l'inscrit est validé et pas encore pointé, bouton ${g("Check-in")} → confirmez. (Seuls les inscrits « validés » apparaissent.)`,
])}

${h2("4. Réflexes d'hôte/hôtesse")}
${ul([
  `Un scan = une personne physiquement présente devant vous. Jamais de scan « pour un ami ».`,
  `Gardez un œil sur le ${b("compteur de check-ins")} en haut : c'est le chiffre de fréquentation en temps réel.`,
  `Batterie faible = poste mort : chargeur ou powerbank à portée de main.`,
  `Tout cas litigieux remonte au chef de protocole. Votre rôle est de fluidifier, pas d'arbitrer.`,
])}
`;

// ══ DOCUMENTS D'ENCADREMENT PAR RÔLE ═════════════════════════════════════════

const roleDoc = (opts: { mission: string; responsabilites: string[]; avant: string[]; pendant: string[]; contact: string; tuto?: string }) => `
${h2("Votre mission")}
${p(opts.mission)}
${h2("Vos responsabilités")}
${ul(opts.responsabilites)}
${h2("Avant l'événement")}
${ul(opts.avant)}
${h2("Le jour J")}
${ul(opts.pendant)}
${h2("Votre référent")}
${p(opts.contact)}
${opts.tuto ? tip(`Tutoriel associé : ${opts.tuto} — lisez-le et entraînez-vous sur la plateforme AVANT le jour J.`) : ""}
`;

const ROLE_ACCUEIL = roleDoc({
  mission: `Vous êtes le premier visage d'EOCON 2026. Vous accueillez les participants, vérifiez leur billet par scan QR et leur remettez badge et goodies, avec efficacité et bonne humeur.`,
  responsabilites: [
    `Tenir le poste d'accueil et scanner les billets (check-in QR).`,
    `Remettre badges, bracelets et kits participants.`,
    `Orienter les participants (salles, vestiaire, programme, sanitaires).`,
    `Signaler tout incident (billet déjà utilisé, personne non inscrite) au chef de protocole.`,
  ],
  avant: [
    `Lire le tutoriel « Check-in & Scan QR » et tester le scanner avec votre compte.`,
    `Repérer les lieux : entrées, salles, points d'information.`,
    `Vérifier vos accès à la plateforme (droits check-in).`,
  ],
  pendant: [
    `Arrivée 1h30 avant l'ouverture des portes ; brief d'équipe 30 min avant.`,
    `Téléphone chargé + powerbank ; tenue selon consigne protocole.`,
    `Pic d'affluence à l'ouverture : privilégier la fluidité, escalader les cas litigieux sans bloquer la file.`,
  ],
  contact: `Le ${b("chef de protocole")} pour tout ce qui concerne l'accueil, et le ${b("responsable logistique")} pour le matériel.`,
  tuto: `🎫 Check-in & Scan QR`,
});

const ROLE_SESSIONS = roleDoc({
  mission: `Vous assistez le bon déroulement des sessions (conférences, panels) : accueil des speakers en salle, respect du timing et liaison avec la régie.`,
  responsabilites: [
    `Accueillir le speaker en salle, vérifier micro et projection avec le technicien.`,
    `Tenir le timing : signaler les 10/5/2 dernières minutes au speaker.`,
    `Faire circuler le micro pendant les Q&R en salle.`,
    `Remonter tout problème technique à la régie sans interrompre la session.`,
  ],
  avant: [
    `Lire le tutoriel « Live Streaming » (les sessions sont diffusées).`,
    `Connaître le programme de VOS sessions : horaires, speakers, salle.`,
    `Assister à la répétition générale si elle est organisée.`,
  ],
  pendant: [
    `En salle 20 min avant chaque session que vous couvrez.`,
    `Ayez le programme et les horaires sous la main (papier ou téléphone).`,
    `À la fin : raccompagner le speaker, vérifier que la salle est prête pour la session suivante.`,
  ],
  contact: `Le ${b("coordinateur programme")} pour le contenu, la ${b("régie technique")} pour l'audiovisuel.`,
  tuto: `🔴 Live Streaming`,
});

const ROLE_MODERATEUR = roleDoc({
  mission: `Vous animez et modérez une session : présentation du speaker, gestion des questions (salle et en ligne) et respect du timing, en français et/ou en anglais selon la session.`,
  responsabilites: [
    `Préparer une courte introduction du speaker (bio en 3 phrases).`,
    `Modérer les questions en ligne depuis votre lien modérateur personnel et sélectionner les meilleures pour le speaker.`,
    `Tenir le chrono : une session qui déborde décale toute la journée.`,
    `Clôturer : remerciements, annonce de la session suivante.`,
  ],
  avant: [
    `Lire le tutoriel « Live Streaming » (section Q&A).`,
    `Lire le résumé du talk et la bio du speaker ; préparer 2–3 questions de secours si la salle est timide.`,
    `Tester votre lien modérateur dès réception de l'email de notification.`,
  ],
  pendant: [
    `Brief avec le speaker 15 min avant la session.`,
    `Gardez un œil sur la file de questions en ligne toutes les 2–3 minutes.`,
    `En cas de question inappropriée : ne pas la relayer, la rejeter dans l'outil.`,
  ],
  contact: `Le ${b("coordinateur programme")} et la ${b("régie streaming")}.`,
  tuto: `🔴 Live Streaming`,
});

const ROLE_STREAMING = roleDoc({
  mission: `Vous assurez la diffusion en direct des sessions : caméras, son, régie Restream et supervision des canaux (YouTube, LinkedIn, Facebook…).`,
  responsabilites: [
    `Démarrer/arrêter les directs selon le programme.`,
    `Surveiller le statut des canaux et le nombre de spectateurs dans l'onglet Live.`,
    `Gérer les overlays (nom du speaker, titre de session).`,
    `Réagir immédiatement à toute coupure (flux HORS LIGNE).`,
  ],
  avant: [
    `Lire le tutoriel « Live Streaming » en entier, y compris le Guide opérateur intégré.`,
    `Participer au test technique général (répétition à blanc obligatoire).`,
    `Vérifier vos accès : plateforme admin + Restream Studio.`,
  ],
  pendant: [
    `En régie 45 min avant la première session.`,
    `Check avant chaque session : flux actif, son OK, overlay correct, lien live fonctionnel.`,
    `Ne jamais modifier la Configuration pendant un direct sans concertation.`,
  ],
  contact: `Le ${b("responsable technique streaming")} — c'est lui qui tranche en cas d'incident.`,
  tuto: `🔴 Live Streaming`,
});

const ROLE_AMBASSADEUR = roleDoc({
  mission: `Vous amplifiez la visibilité d'EOCON 2026 sur les réseaux sociaux : relais des publications officielles, couverture terrain et engagement de votre communauté.`,
  responsabilites: [
    `Relayer les publications officielles (repost/partage) dans les 24h.`,
    `Produire du contenu terrain le jour J : photos, stories, citations marquantes.`,
    `Utiliser systématiquement les hashtags officiels : #EOCON2026 #EyesOpenCTF #SecureTheFuture.`,
    `Faire remonter les retours/questions du public à l'équipe communication.`,
  ],
  avant: [
    `Lire le tutoriel « Communication » pour comprendre le calendrier éditorial.`,
    `Suivre tous les comptes officiels EOCON/EyesOpen Security.`,
    `Valider avec l'équipe com' le ton et les éléments de langage.`,
  ],
  pendant: [
    `2–3 stories minimum par demi-journée pendant l'événement.`,
    `Toujours vérifier une info (nom, titre, horaire) avant de la publier.`,
    `Ne jamais publier de photo d'un participant qui l'a refusé, ni de contenu des espaces privés (régie, backstage).`,
  ],
  contact: `Le ${b("responsable communication")} — validation obligatoire pour toute prise de parole sensible.`,
  tuto: `📱 Communication`,
});

const ROLE_CTF = roleDoc({
  mission: `Vous contribuez à la compétition EyesOpenCTF 2026 : création et test des challenges en amont, support technique aux compétiteurs pendant les 48h de compétition.`,
  responsabilites: [
    `Créer et documenter les challenges qui vous sont assignés (énoncé, flag, fichiers, write-up).`,
    `Tester les challenges des autres auteurs avant validation.`,
    `Pendant la compétition : répondre aux tickets des participants (problèmes techniques, pas d'indices non prévus).`,
    `Signaler tout challenge cassé ou toute suspicion de triche au responsable CTF.`,
  ],
  avant: [
    `Lire le tutoriel « CTF » et prendre en main le kanban des challenges.`,
    `Faire avancer vos challenges jusqu'à « Validé » avant la deadline fixée.`,
    `Vérifier votre compte sur la plateforme CTFd.`,
  ],
  pendant: [
    `Respecter les créneaux de permanence du planning support (compétition 48h non-stop).`,
    `Équité absolue : mêmes réponses pour tous, aucun favoritisme, aucun flag communiqué.`,
    `Consigner chaque incident (heure, équipe, challenge, résolution).`,
  ],
  contact: `Le ${b("responsable CTF")} — seul habilité à décider d'une correction de challenge ou d'une pénalité.`,
  tuto: `⚡ CTF`,
});

const ROLE_MEDIAS = roleDoc({
  mission: `Vous produisez la couverture média officielle de l'événement : photos, vidéos, interviews et alimentation des réseaux sociaux en temps réel.`,
  responsabilites: [
    `Couvrir les moments clés : keynotes, remises de prix, CTF, ambiance.`,
    `Alimenter l'équipe communication en contenus bruts exploitables (photos nettes, vidéos stables).`,
    `Réaliser de courtes interviews (speakers, participants, sponsors) selon la liste fournie.`,
    `Trier et déposer les contenus dans la Library le soir même.`,
  ],
  avant: [
    `Lire le tutoriel « Communication » (partie posts et images).`,
    `Vérifier le matériel : batteries, cartes mémoire, stabilisateur.`,
    `Récupérer le shot-list (liste des plans attendus) auprès de l'équipe com'.`,
  ],
  pendant: [
    `Discrétion en salle pendant les talks (pas de flash, déplacements silencieux).`,
    `Respect du droit à l'image : pas de gros plan sur un participant qui le refuse.`,
    `Livrer un premier lot de photos dans les 2h après chaque temps fort.`,
  ],
  contact: `Le ${b("responsable communication")}.`,
  tuto: `📱 Communication`,
});

const ROLE_SPONSORING = roleDoc({
  mission: `Vous prospectez activement des entreprises et les convainquez de soutenir EOCON 2026 en échange de visibilité. Vous travaillez dans le pipeline sponsors de la plateforme.`,
  responsabilites: [
    `Identifier des entreprises cibles et les ajouter au pipeline (ou traiter celles qui vous sont assignées).`,
    `Prendre contact, présenter les packages de sponsoring et organiser des rendez-vous.`,
    `Tenir le pipeline à jour : chaque échange est noté, chaque carte est dans la bonne colonne.`,
    `Respecter la cadence de relance J+2/J+5/J+10/J+15 proposée par la plateforme.`,
  ],
  avant: [
    `Lire le tutoriel « Sponsors » et le deck de sponsoring officiel (packages et contreparties).`,
    `Valider votre argumentaire avec le responsable sponsors.`,
    `Vérifier vos accès au pipeline (droits prospection).`,
  ],
  pendant: [
    `Le jour J : accueillir « vos » sponsors, vérifier que leurs contreparties sont livrées (stand, logo, annonces).`,
    `Faciliter les mises en relation sponsors ↔ organisateurs.`,
  ],
  contact: `Le ${b("responsable sponsors")} — validation obligatoire avant toute promesse de contrepartie hors package.`,
  tuto: `🤝 Sponsors`,
});

const ROLE_LOGISTIQUE = roleDoc({
  mission: `Vous assurez la mise en place matérielle de l'événement : aménagement des salles, signalétique, connexion internet, sonorisation et soutien général aux équipes.`,
  responsabilites: [
    `Monter/démonter les espaces : scène, stands sponsors, poste d'accueil, salle CTF.`,
    `Installer et vérifier la signalétique (fléchage, plans, affiches).`,
    `Soutenir les autres pôles : eau pour les speakers, matériel manquant, courses urgentes.`,
    `Participer à l'état des lieux d'entrée et de sortie du site.`,
  ],
  avant: [
    `Participer à la visite technique du lieu (Hôtel Onomo).`,
    `Connaître le plan d'implantation et le planning de montage.`,
    `Signaler vos disponibilités précises (montage la veille, démontage le soir).`,
  ],
  pendant: [
    `Arrivée à l'heure du planning de montage (souvent tôt !). Tenue pratique.`,
    `Un problème matériel = photo + message immédiat au responsable logistique.`,
    `Rien ne quitte le site sans validation (matériel loué, prêté, sponsorisé).`,
  ],
  contact: `Le ${b("responsable logistique")}.`,
});

// ══ CHARTE DU VOLONTAIRE ═════════════════════════════════════════════════════

const CHARTE = `
${p(`Bienvenue dans l'équipe des volontaires d'${b("EOCON 2026")} — EyesOpen Cybersecurity Convention. Cette charte définit l'esprit et les règles de votre engagement. En rejoignant l'équipe, vous acceptez de la respecter.`)}

${h2("1. Nos valeurs")}
${ul([
  `${b("Bienveillance")} : chaque participant, speaker, sponsor ou coéquipier est traité avec respect et courtoisie, sans discrimination d'aucune sorte.`,
  `${b("Fiabilité")} : un engagement pris est un engagement tenu. L'événement repose sur chacun de nous.`,
  `${b("Éthique")} : nous sommes une convention de cybersécurité — l'exemplarité numérique (respect des accès, des données, des systèmes) est non négociable.`,
])}

${h2("2. Vos engagements")}
${ul([
  `Être ${b("ponctuel")} sur vos créneaux et prévenir votre référent ${b("au moins 48h à l'avance")} en cas d'empêchement.`,
  `Suivre les ${b("formations et tutoriels")} demandés pour votre rôle avant le jour J.`,
  `Porter les ${b("signes distinctifs")} volontaire (badge, t-shirt) pendant vos créneaux.`,
  `Respecter la ${b("confidentialité")} : les informations internes (données participants, accès plateforme, coulisses, incidents) ne se partagent pas, ni en ligne ni ailleurs.`,
  `Utiliser vos ${b("accès à la plateforme")} uniquement pour votre mission — jamais pour consulter des données sans rapport avec votre rôle.`,
  `Adopter une ${b("attitude professionnelle")} : pas d'alcool pendant le service, pas de polémique publique au nom de l'événement.`,
  `Remonter tout ${b("incident ou comportement inapproprié")} à votre référent immédiatement — vous ne gérez jamais seul un conflit.`,
])}

${h2("3. Ce que l'organisation vous doit")}
${ul([
  `Un ${b("rôle clair")}, un référent identifié et les documents/formations de prise en main.`,
  `Les ${b("repas et rafraîchissements")} pendant vos créneaux le jour J.`,
  `Le ${b("badge volontaire officiel")} et un certificat de participation numérique vérifiable en fin d'événement.`,
  `L'${b("accès aux conférences")} en dehors de vos créneaux de service.`,
  `De l'écoute : vos retours d'expérience sont sollicités et pris en compte.`,
])}

${h2("4. Cadre pratique")}
${ul([
  `Le volontariat est ${b("bénévole")} : il n'ouvre droit à aucune rémunération.`,
  `Vos coordonnées ne sont utilisées que pour l'organisation de l'événement.`,
  `L'organisation peut mettre fin à la collaboration en cas de manquement grave à la présente charte ; vous pouvez vous retirer à tout moment en prévenant votre référent.`,
  `Photos et vidéos : en participant comme volontaire, vous acceptez d'apparaître sur les contenus officiels de l'événement, sauf refus explicite signalé à l'équipe communication.`,
])}

${p(`Merci de faire partie de l'aventure. ${g("Secure the future — ensemble.")}`)}
`;

// ══ CATALOGUE ═════════════════════════════════════════════════════════════════

export const VOLUNTEER_DOCS: VolunteerDoc[] = [
  { key: "charte",             emoji: "📜", kind: "charter",  title: "Charte du volontaire",                       html: CHARTE },
  // Tutoriels de prise en main (blocs menu admin)
  { key: "tuto-communication", emoji: "📱", kind: "tutorial", title: "Tutoriel — Communication",                   html: TUTO_COMMUNICATION },
  { key: "tuto-sponsors",      emoji: "🤝", kind: "tutorial", title: "Tutoriel — Sponsors",                        html: TUTO_SPONSORS },
  { key: "tuto-ctf",           emoji: "⚡", kind: "tutorial", title: "Tutoriel — CTF",                             html: TUTO_CTF },
  { key: "tuto-live",          emoji: "🔴", kind: "tutorial", title: "Tutoriel — Live Streaming",                  html: TUTO_LIVE },
  { key: "tuto-checkin",       emoji: "🎫", kind: "tutorial", title: "Tutoriel — Check-in & Scan QR",              html: TUTO_CHECKIN },
  // Documents d'encadrement — un par rôle du formulaire (6), plus des
  // compléments pour les fonctions spécialisées (modération, régie streaming,
  // ambassadeur social) envoyables manuellement selon l'affectation réelle.
  { key: "role-accueil",       emoji: "🙋", kind: "role",     title: "Encadrement — Accueil & Inscription",        html: ROLE_ACCUEIL },
  { key: "role-sessions",      emoji: "🎤", kind: "role",     title: "Encadrement — Assistance aux sessions",      html: ROLE_SESSIONS },
  { key: "role-ctf",           emoji: "🚩", kind: "role",     title: "Encadrement — Assistance CTF",               html: ROLE_CTF },
  { key: "role-medias",        emoji: "📷", kind: "role",     title: "Encadrement — Médias & Réseaux Sociaux",     html: ROLE_MEDIAS },
  { key: "role-sponsoring",    emoji: "💼", kind: "role",     title: "Encadrement — Ambassadeur de Sponsoring",    html: ROLE_SPONSORING },
  { key: "role-logistique",    emoji: "🚛", kind: "role",     title: "Encadrement — Logistique",                   html: ROLE_LOGISTIQUE },
  { key: "role-moderateur",    emoji: "🎙️", kind: "role",     title: "Complément — Modération de session",         html: ROLE_MODERATEUR },
  { key: "role-streaming",     emoji: "🎬", kind: "role",     title: "Complément — Régie streaming",               html: ROLE_STREAMING },
  { key: "role-ambassadeur",   emoji: "📣", kind: "role",     title: "Complément — Ambassadeur réseaux sociaux",   html: ROLE_AMBASSADEUR },
];

// Suggested documents per role, keyed by CANONICAL role labels only — callers
// resolve submitted FR/EN variants through canonicalVolunteerRole()
// (lib/volunteerRoles.ts) before looking up this map. Every suggestion
// includes the charter.
export const ROLE_DOC_MAP: Record<string, string[]> = {
  "Accueil & Inscription":        ["charte", "role-accueil", "tuto-checkin"],
  "Assistance aux sessions":      ["charte", "role-sessions", "tuto-live"],
  "Assistance CTF":               ["charte", "role-ctf", "tuto-ctf"],
  "Médias & Réseaux Sociaux":     ["charte", "role-medias", "tuto-communication"],
  "Ambassadeur de Sponsoring":    ["charte", "role-sponsoring", "tuto-sponsors"],
  "Logistique":                   ["charte", "role-logistique"],
};

export const DEFAULT_DOC_KEYS = ["charte"];

// Build the recap email containing the selected documents, wrapped in the
// event's dark visual identity (email-safe inline styles only).
export function renderDocsEmail(name: string, role: string | null, docs: VolunteerDoc[]): { subject: string; html: string } {
  const subject = `📚 Vos documents d'intégration volontaire — EOCON 2026`;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const toc = docs.map(d => `<li style="font-size:13px;color:${AC};line-height:1.9;">${d.emoji} ${esc(d.title)}</li>`).join("");
  const body = docs.map(d => `
    <tr><td style="padding:0 40px;">
      <div style="border-top:2px solid ${AC}55;margin:28px 0 4px;"></div>
      <h1 style="font-size:20px;color:#ffffff;margin:18px 0 4px;font-family:Georgia,serif;">${d.emoji} ${esc(d.title)}</h1>
      ${d.html}
    </td></tr>`).join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;color:#e0e0e0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 12px;">
    <tr><td align="center">
      <table width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;background:#0d0d14;border:1px solid ${AC}30;border-radius:12px;">
        <tr><td style="padding:36px 40px 0;text-align:center;">
          <p style="font-size:11px;letter-spacing:4px;color:${AC};text-transform:uppercase;margin:0 0 8px;">&gt; EOCON 2026 · ÉQUIPE VOLONTAIRES</p>
          <h1 style="font-size:26px;color:#ffffff;margin:0;font-family:Georgia,serif;">Vos documents d'intégration</h1>
          <div style="width:60px;height:2px;background:${AC};margin:16px auto 0;"></div>
        </td></tr>
        <tr><td style="padding:24px 40px 0;">
          <p style="font-size:14px;color:#b8c0c8;line-height:1.8;margin:0;">
            Bonjour <strong style="color:#ffffff;">${esc(name)}</strong>,
          </p>
          <p style="font-size:14px;color:#b8c0c8;line-height:1.8;margin:12px 0 0;">
            Bienvenue dans l'équipe ! ${role ? `Vous rejoignez le pôle <strong style="color:${AC};">${esc(role)}</strong>. ` : ""}Vous trouverez ci-dessous ${docs.length > 1 ? "les documents" : "le document"} de prise en main de votre mission. Lisez-${docs.length > 1 ? "les" : "le"} attentivement <strong style="color:#ffffff;">avant le jour J</strong> et gardez cet email sous la main.
          </p>
          <div style="background:#111827;border:1px solid ${AC}33;border-radius:8px;padding:16px 20px;margin:20px 0 0;">
            <p style="font-size:11px;letter-spacing:2px;color:#888;text-transform:uppercase;margin:0 0 8px;">Contenu de cet envoi</p>
            <ul style="margin:0;padding-left:20px;">${toc}</ul>
          </div>
        </td></tr>
        ${body}
        <tr><td style="padding:32px 40px 36px;">
          <div style="border-top:1px solid #1a1a2e;padding-top:20px;">
            <p style="font-size:12px;color:#888;line-height:1.7;margin:0;">Des questions ? Répondez simplement à cet email ou contactez votre référent d'équipe.</p>
            <p style="font-size:11px;color:#333;margin:12px 0 0;">EOCON 2026 · EyesOpen Cybersecurity Convention · EyesOpen Security</p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html };
}
