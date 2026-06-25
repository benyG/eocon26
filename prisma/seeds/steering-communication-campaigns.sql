-- =============================================================================
-- EOCON 2026 — Plan des campagnes mailing « Resp. Communication & Marketing »
-- À injecter dans le pilotage global (table steering_tasks)
--
-- Événement  : EOCON 2026 — Semaine cyber 22–27 nov (online) + 28 nov (présentiel, Douala)
-- Phases     : P1 Fondations (14 juin–15 juil) · P2 Construction (16 juil–30 sept)
--              P3 Finalisation (1–21 nov) · P4 Online (22–27 nov)
--              P5 Jour J (28 nov) · P6 Post-événement (29 nov–15 déc)
-- Usage      : mysql -u <user> -p <db_name> < prisma/seeds/steering-communication-campaigns.sql
-- =============================================================================
-- Note : INSERT uniquement, sortOrder à partir de 200 pour ne pas écraser
-- les tâches existantes seedées via docs/roadmap-equipe.md.
-- =============================================================================

INSERT INTO `steering_tasks`
  (`title`, `description`, `phase`, `pole`, `subTeam`, `status`, `priority`,
   `dueDate`, `isMilestone`, `sortOrder`, `createdAt`, `updatedAt`)
VALUES

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 1 — Fondations (14 juin → 15 juillet 2026)
-- ─────────────────────────────────────────────────────────────────────────────

(
  'Rédiger le calendrier éditorial complet des campagnes mailing',
  'Planifier chaque campagne de P1 à P6 : objectif, audience cible, date d''envoi, template à utiliser, KPIs attendus (taux d''ouverture ≥ 35 %, taux de clics ≥ 8 %, désabonnements ≤ 0,3 %). Valider avec Coordo Global avant diffusion.',
  1, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'critical',
  '2026-06-27 00:00:00', TRUE, 200, NOW(), NOW()
),

(
  'Créer les templates d''email campagne (FR + EN)',
  'Dans Campagnes > Templates : créer les gabarits bilingues réutilisables — Annonce, Rappel, Brief speaker, Brief modérateur, Rappel quotidien semaine, Remerciement, Replay & ressources. Respecter la charte graphique EOCON 2026 (couleurs, logo, footer avec liens de désabonnement).',
  1, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'high',
  '2026-06-30 00:00:00', FALSE, 201, NOW(), NOW()
),

(
  'Configurer la liste de diffusion newsletter (import contacts)',
  'Importer la liste d''abonnés existants (CSV Mailchimp ou autre) via Campagnes > Contacts. Nettoyer les doublons, vérifier les consentements RGPD, segmenter par langue (FR/EN) et profil (cyber pro, étudiant, grand public). Préparer les segments audience pour les campagnes futures.',
  1, 'Resp. Communication & Marketing', 'Général', 'todo', 'high',
  '2026-06-30 00:00:00', FALSE, 202, NOW(), NOW()
),

(
  'Campagne #1 — Lancement officiel EOCON 2026',
  'AUDIENCE : newsletter complète + contacts partenaires. OBJET : "EOCON 2026 est lancé — Semaine cyber 22–28 novembre, Douala + online". Contenu : vision de l''édition, thèmes (IA & cybersécurité, souveraineté numérique, CTF…), format hybride, double call-to-action inscription + CFP. Envoi A/B test sur l''objet (FR vs EN). KPI cible : taux ouverture ≥ 35 %.',
  1, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'critical',
  '2026-07-01 00:00:00', TRUE, 203, NOW(), NOW()
),

(
  'Campagne #2 — Ouverture CFP : appel à speakers',
  'AUDIENCE : profils cyber (abonnés newsletter segment "pro" + anciens speakers + contacts partenaires). OBJET : "Partagez votre expertise — CFP EOCON 2026 ouvert jusqu''au [date clôture]". Contenu : thèmes prioritaires, formats acceptés (talk 30 min / workshop 90 min / keynote), critères de sélection, lien formulaire CFP. KPI : nb soumissions générées.',
  1, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'high',
  '2026-07-03 00:00:00', TRUE, 204, NOW(), NOW()
),

(
  'Campagne #3 — Early Bird : ouverture inscriptions à tarif réduit',
  'AUDIENCE : newsletter complète. OBJET : "Places Early Bird ouvertes — tarif préférentiel EOCON 2026 (offre limitée)". Contenu : avantages du tarif early bird, date de fin, types de tickets (online / présentiel / CTF), call-to-action urgent avec lien d''inscription. JALON commercial clé. KPI : nb inscriptions semaine 1.',
  1, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'high',
  '2026-07-08 00:00:00', TRUE, 205, NOW(), NOW()
),

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 2 — Construction (16 juillet → 30 septembre 2026)
-- ─────────────────────────────────────────────────────────────────────────────

(
  'Campagne #4 — Relance CFP (J-30 avant clôture)',
  'AUDIENCE : abonnés newsletter non encore soumis au CFP (segment négatif inscriptions CFP). OBJET : "Il reste 30 jours pour soumettre votre talk — CFP EOCON 2026". Inclure témoignage d''un speaker d''une édition précédente. KPI : soumissions supplémentaires post-relance vs. avant relance.',
  2, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'high',
  '2026-08-15 00:00:00', FALSE, 206, NOW(), NOW()
),

(
  'Campagne #5 — Clôture Early Bird : dernières heures',
  'AUDIENCE : abonnés non inscrits. OBJET : "Dernières heures Early Bird — après ça, tarif plein". Email de rareté honnête, sans fausse urgence. Envoyer la veille de clôture à 18 h et le jour J à 9 h. KPI : conversions dans les 48 h suivant l''envoi.',
  2, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'medium',
  '2026-08-01 00:00:00', FALSE, 207, NOW(), NOW()
),

(
  'Campagne #6 — Confirmation speakers sélectionnés (onboarding individuel)',
  'AUDIENCE : speakers dont le CFP est passé en statut "Accepté" dans le pipeline. Email personnalisé (prénom, titre exact du talk) via le pipeline CFP > Envoi onboarding. Contenu : félicitations, prochaines étapes (fiche profil, photo HD, abstract final, test technique), lien espace speaker. CRITIQUE pour l''onboarding. Coordonner avec Resp. Programme.',
  2, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'critical',
  '2026-08-20 00:00:00', TRUE, 208, NOW(), NOW()
),

(
  'Campagne #7 — Annonce sponsors et partenaires confirmés',
  'AUDIENCE : newsletter complète. OBJET : "Merci à nos partenaires EOCON 2026 — ils croient en la cybersécurité africaine". Contenu : logos sponsors (Platinum / Gold / Silver), brève présentation de chaque partenaire (1–2 phrases), lien vers leurs sites. Coordonnée avec Resp. Sponsor. KPI : clics vers sites sponsors.',
  2, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'medium',
  '2026-09-01 00:00:00', FALSE, 209, NOW(), NOW()
),

(
  'Campagne #8 — Programme provisoire dévoilé + speakers confirmés',
  'AUDIENCE : inscrits confirmés + newsletter. OBJET : "Le programme EOCON 2026 se dévoile — découvrez les speakers confirmés". Contenu : aperçu du programme semaine (J1 à J6 + J présentiel), photos + bios des 5–10 premiers speakers annoncés, teaser des keynotes. JALON programme. KPI : taux de clics sur profils speakers.',
  2, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'critical',
  '2026-09-05 00:00:00', TRUE, 210, NOW(), NOW()
),

(
  'Campagne #9 — Ouverture tarif standard (fin early bird)',
  'AUDIENCE : abonnés non inscrits. OBJET : "L''early bird est terminé — inscriptions au tarif standard maintenant ouvertes". Rassurer sur la valeur : programme déjà visible, speakers annoncés. Call-to-action inscription. KPI : taux de conversion sur les 7 jours suivants.',
  2, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'high',
  '2026-09-10 00:00:00', TRUE, 211, NOW(), NOW()
),

(
  'Campagne #10 — Relance inscriptions (abonnés non inscrits)',
  'AUDIENCE : segment abonnés newsletter sans inscription confirmée. OBJET : "Vous ne vous êtes pas encore inscrit·e — voici pourquoi vous devriez". Contenu : top 3 raisons de participer, témoignage d''un participant d''une édition précédente, nombre indicatif de places restantes. KPI : taux de conversion.',
  2, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'medium',
  '2026-09-20 00:00:00', FALSE, 212, NOW(), NOW()
),

(
  'Campagne #11 — Newsletter mensuelle : "Ce qui vous attend à EOCON 2026"',
  'AUDIENCE : newsletter complète. OBJET : "EOCON 2026 — à 2 mois de l''événement, voici ce qui vous attend". Contenu éditorial (pas commercial) : thèmes en détail, preview workshops, update CTF, zoom sur 2 speakers. Ton magazine. KPI : taux d''ouverture ≥ 30 %, désabonnements ≤ 0,3 %.',
  2, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'medium',
  '2026-09-15 00:00:00', FALSE, 213, NOW(), NOW()
),

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 3 — Finalisation (1 → 21 novembre 2026)
-- ─────────────────────────────────────────────────────────────────────────────

(
  'Campagne #12 — Programme complet révélé : agenda définitif',
  'AUDIENCE : inscrits confirmés + newsletter. OBJET : "Le programme EOCON 2026 est complet — votre agenda semaine". Contenu : tableau programme jour par jour (22–28 nov), tous les speakers, horaires UTC + heure Douala, liens d''ajout au calendrier (.ics). JALON majeur de communication. KPI : partages + inscriptions de dernière minute.',
  3, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'critical',
  '2026-11-03 00:00:00', TRUE, 214, NOW(), NOW()
),

(
  'Campagne #13 — Compte à rebours J-21 + dernière chance inscriptions',
  'AUDIENCE : abonnés non inscrits + relais réseaux sociaux. OBJET : "J-21 — il reste des places, mais plus pour longtemps". Urgence éditoriale honnête (nb places restantes si connu), top sessions à ne pas manquer, call-to-action fort. KPI : inscriptions générées dans les 7 jours.',
  3, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'high',
  '2026-11-07 00:00:00', FALSE, 215, NOW(), NOW()
),

(
  'Campagne #14 — Guide logistique inscrits (liens, timezone, matériel)',
  'AUDIENCE : inscrits confirmés en 2 segments (online / présentiel). Online : lien /live, test connexion recommandé, fuseau horaire (UTC+1), fichier .ics programme complet, canal support. Présentiel : adresse exacte à Douala, transport, hébergement partenaire, plan de salle, dress code. JALON opérationnel. Coordonner avec Resp. Logistique.',
  3, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'critical',
  '2026-11-14 00:00:00', TRUE, 216, NOW(), NOW()
),

(
  'Campagne #15 — Brief speakers : lien Restream Studio + checklist A/V',
  'AUDIENCE : speakers confirmés programmés (segment cfp_scheduled). OBJET : "Votre briefing technique EOCON 2026 — action requise avant le [date]". Contenu : lien Restream Studio individuel (généré via Live > Équipe & Invitations), date du test technique obligatoire, checklist caméra / micro / fond neutre / éclairage / navigateur (Chrome ou Edge uniquement), contact support streaming. CRITIQUE. Coordonner avec Resp. Live Streaming.',
  3, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'critical',
  '2026-11-17 00:00:00', TRUE, 217, NOW(), NOW()
),

(
  'Campagne #16 — Brief modérateurs : rôle, Q&A admin, protocole de session',
  'AUDIENCE : modérateurs désignés (liste manuelle depuis Live > Équipe & Invitations). OBJET : "Votre briefing modérateur EOCON 2026 — rôle, outils, protocole". Contenu : rôle détaillé (intro speaker, gestion du temps, Q&A, clôture), lien admin Q&A (/admin?tab=live), lien Restream Studio hôte, protocole démarrage / clôture de session, contacts d''escalade. Généré via le bouton "📨 Briefing" du panel Live.',
  3, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'critical',
  '2026-11-17 00:00:00', FALSE, 218, NOW(), NOW()
),

(
  'Campagne #17 — Rappel J-3 : préparez votre participation',
  'AUDIENCE : inscrits confirmés (online + présentiel). OBJET : "Dans 3 jours — EOCON 2026 démarre. Êtes-vous prêt·e ?". Contenu : rappel date/heure de début (22 nov 09 h UTC+1), lien /live pour online, checklist participant (connexion testée, agenda téléchargé, profil LinkedIn à jour pour le networking), hashtag #EOCON2026. Ton enthousiaste.',
  3, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'high',
  '2026-11-19 00:00:00', FALSE, 219, NOW(), NOW()
),

(
  'Campagne #18 — Rappel J-1 : liens d''accès + programme du lendemain',
  'AUDIENCE : inscrits confirmés (tous). OBJET : "Demain c''est EOCON 2026 — vos liens d''accès + programme Jour 1". Contenu : lien direct /live, programme J1 (keynote ouverture + sessions), heure de démarrage, contacts urgence technique, rappel réseaux #EOCON2026. Envoi le 21 novembre à 18 h (heure Douala). JALON pré-événement. KPI : taux ouverture ≥ 60 %.',
  3, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'critical',
  '2026-11-21 00:00:00', TRUE, 220, NOW(), NOW()
),

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 4 — Semaine EOCON Online (22 → 27 novembre 2026)
-- ─────────────────────────────────────────────────────────────────────────────

(
  'Campagne #19 — Lancement semaine ! Email Jour 1 matin (22 novembre)',
  'AUDIENCE : inscrits confirmés + newsletter. OBJET : "C''est parti — EOCON 2026 commence aujourd''hui !". Contenu : enthousiasme de lancement, programme du jour (keynote ouverture + sessions J1 avec horaires), lien /live, hashtag réseaux #EOCON2026, invitation à partager. Envoi le 22 nov à 08 h UTC. JALON événementiel majeur.',
  4, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'critical',
  '2026-11-22 00:00:00', TRUE, 221, NOW(), NOW()
),

(
  'Rappel quotidien J2 — Programme du jour (23 novembre)',
  'AUDIENCE : inscrits confirmés. OBJET : "EOCON J2 — programme du jour". Liste des sessions du jour avec horaires et liens directs, speaker mis en avant (portrait + bio courte), rappel Q&A live. Envoi le 23 nov à 08 h UTC. Template : "Rappel quotidien". KPI : taux d''ouverture comparé à J1.',
  4, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'high',
  '2026-11-23 00:00:00', FALSE, 222, NOW(), NOW()
),

(
  'Rappel quotidien J3 — Programme du jour (24 novembre)',
  'AUDIENCE : inscrits confirmés. OBJET : "EOCON J3 — programme du jour". Même structure que J2. Mettre en avant la session spéciale du jour si applicable (workshop, panel multi-experts). Envoi le 24 nov à 08 h UTC.',
  4, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'high',
  '2026-11-24 00:00:00', FALSE, 223, NOW(), NOW()
),

(
  'Rappel quotidien J4 — Programme du jour (25 novembre)',
  'AUDIENCE : inscrits confirmés. OBJET : "EOCON J4 — programme du jour". Même structure. Inclure un bilan mi-semaine (stats en direct : nb vues, sessions les plus populaires, questions posées). Envoi le 25 nov à 08 h UTC.',
  4, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'high',
  '2026-11-25 00:00:00', FALSE, 224, NOW(), NOW()
),

(
  'Rappel quotidien J5 — Programme du jour (26 novembre)',
  'AUDIENCE : inscrits confirmés. OBJET : "EOCON J5 — programme du jour". Même structure. Teaser : demain J6 = dernière journée online, et après-demain = Jour J présentiel à Douala. Envoi le 26 nov à 08 h UTC.',
  4, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'high',
  '2026-11-26 00:00:00', FALSE, 225, NOW(), NOW()
),

(
  'Campagne #20 — Clôture semaine online + preview Jour J présentiel',
  'AUDIENCE : inscrits confirmés + newsletter. OBJET : "EOCON J6 — dernière journée online + demain : Douala !". Contenu : programme J6 (sessions de clôture online), message de clôture de la semaine, enthousiasme pour le Jour J présentiel du 28 nov, rappel lien live streaming pour ceux qui suivent à distance. JALON de transition. Envoi le 27 nov à 08 h UTC.',
  4, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'critical',
  '2026-11-27 00:00:00', TRUE, 226, NOW(), NOW()
),

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 5 — Jour J Présentiel (28 novembre 2026)
-- ─────────────────────────────────────────────────────────────────────────────

(
  'Campagne #21 — Jour J matin : accueil + plan de salle (présentiels)',
  'AUDIENCE : inscrits présentiels (segment ticketType=présentiel). OBJET : "Aujourd''hui c''est le grand jour — votre guide d''accueil EOCON 2026 Douala". Contenu : adresse exacte, heure d''ouverture accueil, plan de salle, programme de la journée, contact responsable accueil sur place (téléphone). Envoi le 28 nov à 06 h (heure Douala = UTC+1). JALON critique Jour J.',
  5, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'critical',
  '2026-11-28 00:00:00', TRUE, 227, NOW(), NOW()
),

(
  'Campagne #22 — Lien live streaming Jour J (suivi à distance)',
  'AUDIENCE : inscrits online + abonnés newsletter. OBJET : "EOCON Jour J — suivez le présentiel en direct depuis chez vous". Contenu : lien embed YouTube ou /live, programme de la journée présentielle avec horaires UTC, invitation à interagir sur les réseaux (#EOCON2026), lien Q&A si disponible. Envoi le 28 nov à 08 h UTC.',
  5, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'high',
  '2026-11-28 00:00:00', FALSE, 228, NOW(), NOW()
),

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 6 — Post-événement (29 novembre → 15 décembre 2026)
-- ─────────────────────────────────────────────────────────────────────────────

(
  'Campagne #23 — Remerciements "Thank you" — tous participants (J+1)',
  'AUDIENCE : inscrits confirmés (online + présentiel) + speakers + volontaires (envois segmentés). OBJET : "Merci d''avoir fait EOCON 2026 — ensemble c''était exceptionnel". Contenu : chiffres clés de l''édition (nb participants, sessions, pays représentés), message de remerciement sincère de l''équipe, teaser replays à venir, invitation à partager un avis / témoignage sur les réseaux. JALON post-événement. Envoi le 29 nov à 10 h.',
  6, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'critical',
  '2026-11-29 00:00:00', TRUE, 229, NOW(), NOW()
),

(
  'Campagne #24 — Replays et ressources disponibles (vidéos + slides)',
  'AUDIENCE : inscrits + newsletter. OBJET : "Les replays EOCON 2026 sont en ligne — accès illimité". Contenu : liste des sessions avec liens YouTube par session, slides disponibles en téléchargement, mise en avant des 3 sessions les plus regardées. Envoi J+3 (1 déc) après upload des replays et mise en visibilité des sessions sur la plateforme. Coordonner avec Resp. Prise vidéo. JALON ressources. KPI : clics sur replays.',
  6, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'high',
  '2026-12-01 00:00:00', TRUE, 230, NOW(), NOW()
),

(
  'Campagne #25 — Enquête satisfaction participants',
  'AUDIENCE : inscrits confirmés (online / présentiel en segments séparés). OBJET : "Votre avis compte — 3 minutes pour évaluer EOCON 2026". Contenu : lien formulaire court (max 8 questions : note globale, meilleure session, point d''amélioration, intérêt EOCON 2027). Optionnel : incentive (tirage au sort). KPI : taux de réponse ≥ 25 %. Envoi J+3.',
  6, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'high',
  '2026-12-01 00:00:00', FALSE, 231, NOW(), NOW()
),

(
  'Campagne #26 — Retour d''expérience speakers',
  'AUDIENCE : speakers ayant présenté. OBJET : "Comment s''est passée votre expérience EOCON 2026 ? Votre retour nous aide à grandir". Formulaire dédié : qualité technique du setup Restream, support de l''équipe, visibilité obtenue, suggestions. Invitation à re-soumettre pour EOCON 2027. Coordonner avec Resp. Programme. Envoi J+3.',
  6, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'medium',
  '2026-12-01 00:00:00', FALSE, 232, NOW(), NOW()
),

(
  'Bilan éditorial : métriques email + rapport campagnes mailing',
  'Compiler dans un rapport consolidé les métriques de toutes les campagnes (taux d''ouverture, taux de clics, désabonnements, conversions par phase). Comparer aux objectifs du calendrier éditorial. Identifier les formats / objets les plus performants. Documenter les apprentissages pour EOCON 2027. À remettre à Coordo Global pour le bilan global de l''édition (avant le 8 déc).',
  6, 'Resp. Communication & Marketing', 'Général', 'todo', 'high',
  '2026-12-05 00:00:00', FALSE, 233, NOW(), NOW()
),

(
  'Campagne #27 — Newsletter bilan + teaser EOCON 2027',
  'AUDIENCE : newsletter complète + inscrits. OBJET : "EOCON 2026, c''est dans les livres — et 2027 s''annonce encore plus grand". Contenu : bilan éditorial de l''édition (highlights, chiffres clés, moments forts), mention des talks les plus regardés (liens replays), phrase de teaser pour EOCON 2027, invitation à rester abonné et rejoindre la liste d''attente early 2027. JALON de clôture de la communication annuelle. Envoi 12 déc.',
  6, 'Resp. Communication & Marketing', 'Contenu', 'todo', 'medium',
  '2026-12-12 00:00:00', TRUE, 234, NOW(), NOW()
);

-- =============================================================================
-- RÉSUMÉ DES INSERTIONS
-- =============================================================================
-- Phase 1 — Fondations       : 6 tâches  (sortOrder 200–205)  ·  3 jalons
-- Phase 2 — Construction     : 8 tâches  (sortOrder 206–213)  ·  3 jalons
-- Phase 3 — Finalisation     : 7 tâches  (sortOrder 214–220)  ·  5 jalons
-- Phase 4 — Semaine Online   : 6 tâches  (sortOrder 221–226)  ·  2 jalons
-- Phase 5 — Jour J           : 2 tâches  (sortOrder 227–228)  ·  1 jalon
-- Phase 6 — Post-événement   : 5 tâches  (sortOrder 229–234)  ·  3 jalons
--                                                             ──────────────
-- TOTAL                      : 34 tâches                      · 17 jalons
-- Pôle                       : Resp. Communication & Marketing
-- Sous-équipes               : Contenu (32) · Général (2)
-- =============================================================================
