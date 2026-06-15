# Plan — Module « 🎯 Pilotage Global » (MVP)

> Spec de reprise pour une nouvelle session. Source : `docs/roadmap-equipe.md`
> (18 rôles, 6 phases, 5 sous-équipes, réunions R1–R8 + sous-équipes, ~200 actions datées).
> Branche de dev : `claude/reintegration-fonctionnalites`.

## Décisions validées par l'utilisateur
- **Périmètre** : MVP d'abord (Kanban + pôles + assignation + responsables + rappels d'échéance email). Réunions/digest/escalade inclus au MVP côté email/cron ; **in-app + WhatsApp = phase 2**.
- **Modèle de données** : nouveau modèle dédié (pas de réutilisation de `LogisticsTask`).
- **Pré-remplissage** : **TOUT importer** depuis la feuille de route (toutes les tâches datées + les 8 réunions R1–R8 + réunions de sous-équipe), en 1 clic.
- **Emplacement navbar** : sous-menu **« 🎯 Pilotage global » dans le groupe « Vue d'ensemble »** (à côté du Dashboard).
- **Responsables** : ajouter un champ **`email` à `TeamMember`** + sélecteur de responsable dans le formulaire de tâche.
- **Notifications** : Email (Resend) au MVP ; in-app admin + WhatsApp en phase 2.
- **Permission dédiée** : nouvelle clé `pilotage` (intégrée au système de profils refait récemment).
- **Coordo Global** : désigné via réglage `pilotage_coordo_email` (défaut `contact@eyesopensecurity.com`).

## Étapes d'implémentation

### 1. Schéma Prisma (`prisma/schema.prisma`) + migration MySQL idempotente
- `TeamMember` : ajouter `email String?` (NON encore appliqué — a été retiré pour laisser l'arbre propre).
- Nouveau modèle `SteeringTask` :
  - `id`, `title @db.Text`, `description String? @db.Text`
  - `phase Int @default(1)` (1..6), `pole String` (nom du rôle),
  - `subTeam String?` (Contenu | Sponsors | Tech | Logistique | Volontaires | Général)
  - `status String @default("todo")` (backlog|todo|in_progress|blocked|review|done)
  - `priority String @default("medium")` (low|medium|high|critical)
  - `assigneeName String?`, `assigneeEmail String?`
  - `dueDate DateTime?`, `isMilestone Boolean @default(false)`
  - `reminderStage String? @default("")` (liste CSV des rappels envoyés : `J-3,J-1,J0,overdue`)
  - `notes String? @db.Text`, `sortOrder Int @default(0)`, `completedAt DateTime?`
  - `createdAt`, `updatedAt` ; `@@index([phase])`, `@@index([status])` ; `@@map("steering_tasks")`
- Nouveau modèle `SteeringMeeting` :
  - `id`, `title String`, `type String @default("collective")` (collective|subteam), `subTeam String?`
  - `scheduledAt DateTime`, `location String?`, `agenda String? @db.Text`, `attendees String? @db.Text`
  - `reminderStage String? @default("")`, `createdAt`, `updatedAt` ; `@@map("steering_meetings")`
- Migration : `prisma/migrations/20260615xxxxxx_pilotage/migration.sql`
  - `ALTER TABLE team_members ADD COLUMN IF NOT EXISTS email VARCHAR(191) NULL;`
  - `CREATE TABLE IF NOT EXISTS steering_tasks (...)` et `steering_meetings (...)` (style MySQL idempotent : backticks, `AUTO_INCREMENT`, `DATETIME(3)`, `utf8mb4`). **Attention : pas de DEFAULT sur colonnes TEXT (interdit MySQL).**

### 2. Permission + navbar
- `lib/adminProfiles.ts` : ajouter `pilotage?: "read" | "write"` à l'interface ; `super_admin: pilotage:"write"` ; ajouter au profil `coordinateur_cfp`/Coordo si pertinent. (Observateur : optionnel read.)
- `app/admin/page.tsx` :
  - Type `Tab` : ajouter `"pilotage"`.
  - `tabGroups` groupe **Vue d'ensemble** : ajouter `{ id: "pilotage", label: "🎯 Pilotage global" }` après dashboard.
  - `TAB_PERMISSION` : `pilotage: "pilotage"`.
  - Rendu : `{tab === "pilotage" && <PilotagePanel />}`.
- `components/admin/AdminProfilesPanel.tsx` : ajouter `{ key: "pilotage", label: "Pilotage global" }` dans le groupe « Vue d'ensemble » (créer le groupe en tête de `NAV_GROUPS` s'il n'existe pas — actuellement il commence à « Speakers & Programme »).

### 3. API (Node runtime, `export const dynamic = "force-dynamic"`, `isAdminAuthenticated()`)
- `app/api/admin/pilotage/tasks/route.ts` : GET (liste + filtres), POST (create).
- `app/api/admin/pilotage/tasks/[id]/route.ts` : PATCH (statut/assignation/champs), DELETE.
- `app/api/admin/pilotage/meetings/route.ts` : GET, POST.
- `app/api/admin/pilotage/meetings/[id]/route.ts` : PATCH, DELETE.
- `app/api/admin/pilotage/seed/route.ts` : POST — **parse `docs/roadmap-equipe.md`** depuis le disque
  (`fs.readFile(path.join(process.cwd(), "docs/roadmap-equipe.md"))`) et insère tâches + réunions.
  - Garde-fou anti-doublon : ne seed que si `steering_tasks` est vide (ou paramètre `force`).
  - Idempotence : possibilité de `deleteMany` avant re-seed si `force=true`.

### 4. Parser de la roadmap (cœur du seed) — `lib/pilotageRoadmap.ts`
Logique de parsing du markdown (robuste, jamais crasher) :
- Suivre le **rôle courant** : ligne `## N. NOM DU RÔLE` → `pole`.
- Suivre la **phase courante** : ligne `### <emoji> Phase N — ...` → `phase` (1..6 via l'emoji 🔵🟡🟠🔴⚫🟢 ou le numéro).
- Lignes de tableau `| col1 | col2 |` à l'intérieur d'un rôle+phase = tâches :
  - Ignorer l'en-tête (`| Date | Action |`, `| Heure | Action |`) et les séparateurs (`|---|`).
  - `title` = col2 (action). `dueDate` = parse de col1.
  - **Parse date FR** : « 14 juin », « 1 nov », « 3 déc », plages « 14–18 juin » (prendre le dernier jour), « 27 nov 18h00 ». Mois FR→n° ; année **2026** (déc inclus = 2026). Heure seule (« 06h00 ») ou vague (« En continu », « Chaque jour », « Au fil des… », « Heure ») → `dueDate = null`.
  - `isMilestone` / `priority` : ligne contenant ⚠️, « CLÔTURE », « DEADLINE », « Objectif » → milestone + priority `high`/`critical`.
  - `subTeam` : mapping rôle → sous-équipe (voir ci-dessous).
- **Réunions** :
  - Table « POINTS DE RENCONTRE COLLECTIFS » → `SteeringMeeting` type `collective` (R1–R8) avec date + ordre du jour.
  - Sections « POINTS DE RENCONTRE SOUS-ÉQUIPES » (lignes de dates par sous-équipe) → meetings type `subteam`.

#### Mapping rôle → sous-équipe (d'après la roadmap)
- **Contenu** : Resp. Programme & Speaker, Resp. Communication & Marketing, R Infographie (+ Resp. Prog AV pour comm contenu).
- **Sponsors** : Coordo Global (partie sponsors), Resp. Partenaire/Sponsor, Resp. Budget, Resp. Partenaires Locaux.
- **Tech** : Resp. Plateforme Cloud (CTF), Resp. Site Web, Resp. Prog AV Live Streaming, Resp. Technique/AV Salle, Resp. Prise Vidéo Caméra.
- **Logistique** : Coordonnateur Local, Resp. Logistique, Resp. Protocole & Accueil, Resp. Animation/Présentation, Référent Sécurité & Incidents.
- **Volontaires** : R Réseaux des Volontaires.
- **Général** : Coordo Global (pilotage transverse).

#### Les 18 pôles (rôles)
1 Coordo Global · 2 Resp. Partenaire/Sponsor · 3 Resp. Programme & Speaker · 4 Resp. Communication & Marketing · 5 Resp. Plateforme Cloud (CTF) · 6 Resp. Site Web · 7 Resp. Budget · 8 R Réseaux des Volontaires · 9 R Infographie · 10 Resp. Prog AV Live Streaming · 11 Coordonnateur Local · 12 Resp. Logistique · 13 Resp. Technique/AV Salle · 14 Resp. Protocole & Accueil · 15 Resp. Prise Vidéo Caméra · 16 Resp. Partenaires Locaux · 17 Resp. Animation/Présentation · 18 Référent Sécurité & Incidents.

#### Les 6 phases (couleurs)
1 🔵 Fondations (14 juin→15 juil) · 2 🟡 Construction (16 juil→30 sept) · 3 🟠 Finalisation (1→21 nov) · 4 🔴 Semaine Online (22→27 nov) · 5 ⚫ Jour J (28 nov) · 6 🟢 Post-événement (29 nov→15 déc).

### 5. Emails (Resend) — `lib/email.ts`
Nouveaux senders (réutiliser `emailWrap`/`neonBox`) :
- `sendPilotageTaskAssigned(to, name, task)` — à l'assignation.
- `sendPilotageDeadlineReminder(to, name, task, stage)` — J-3 / J-1 / jour J.
- `sendPilotageEscalation(coordoEmail, task)` — tâche en retard → Coordo.
- `sendPilotageMeetingReminder(to, meeting, stage)` — J-1 / H-2.
- (Phase 2) `sendPilotageWeeklyDigest(coordoEmail, summary)`.

### 6. Cron — `app/api/cron/pilotage-reminders/route.ts`
- `GET ?secret=CRON_SECRET` (même pattern que `publish-scheduled`).
- Pour chaque tâche non `done` avec `dueDate` : calculer J-3/J-1/J0, envoyer le rappel au responsable si pas déjà dans `reminderStage`, marquer le stage. Si dépassée et non done → escalade Coordo (stage `overdue`).
- Pour chaque réunion à venir : rappels J-1 / H-2 aux `attendees` (ou Coordo si « toute l'équipe »).
- À déclencher via cron externe (cURL/Vercel) — documenter dans le README/.env.example.

### 7. UI — `components/admin/PilotagePanel.tsx`
- **Bandeau KPI** : avancement global (% done), jalons à risque (en retard ou < 7 j), prochaine réunion, compteurs par phase.
- **Filtres** : phase, pôle, sous-équipe, responsable, « en retard », « 30 prochains jours ».
- **Kanban** : colonnes par statut (backlog/à faire/en cours/bloqué/revue/fait), drag-and-drop HTML5 (s'inspirer de `components/admin/VolunteerKanban.tsx` / `PipelineKanban.tsx`). Carte : bande couleur de phase, badge pôle, responsable, échéance (rouge si dépassée), ⚠️ jalon.
- **Volet détail** : éditer tous les champs, réassigner (liste des `TeamMember` avec email), marquer fait.
- **Onglet/section Réunions** : liste R1–R8 + sous-équipes, prochaine en tête, édition.
- **Bouton « Initialiser depuis la feuille de route »** : appelle `/api/admin/pilotage/seed` (confirm si déjà des tâches → option force).
- **Réglage Coordo** : champ `pilotage_coordo_email` (via EventSetting) éditable depuis le panel ou les Paramètres.

### 8. Team panel — champ email
- Ajouter l'input **email** au formulaire d'ajout/édition d'un membre d'équipe (`tab === "team"` dans `app/admin/page.tsx`) + propager dans l'API `app/api/admin/team` (POST/PATCH).

## Notes techniques / pièges connus
- **Migrations MySQL** : style idempotent (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`), backticks, `AUTO_INCREMENT`, `DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)`, `utf8mb4`. **Jamais** de `DEFAULT` sur colonne `TEXT`. (Une migration précédente écrite en dialecte SQLite avait cassé le déploiement — P3009.)
- **Sandbox sans `node_modules`** : impossible de lancer `next build`/`tsc`/`prisma` localement. Valider l'équilibrage accolades/parenthèses (`node -e` split) avant commit ; le build CI fait foi.
- **Prisma client** : régénéré au build via `npx prisma generate` (déjà dans le pipeline) → `prisma.steeringTask` / `prisma.steeringMeeting` disponibles.
- **Lecture du fichier roadmap au runtime** : `process.cwd()` + `docs/roadmap-equipe.md` (le fichier est commité, donc présent au runtime Node ; route en runtime Node, pas edge).
- **Résolution des permissions** : `/api/admin/me` utilise les profils **statiques** par nom pour les profils système, et les permissions **DB** pour les profils personnalisés (corrigé récemment). Donc bien ajouter `pilotage` à `super_admin` dans `lib/adminProfiles.ts`.
- **Parser robuste** : toute ligne non parsable → tâche avec `dueDate = null` (ne jamais crasher le seed).

## Découpage commits suggéré
1. Schéma + migration (TeamMember.email, SteeringTask, SteeringMeeting).
2. Permission `pilotage` + navbar + profiles.
3. Parser `lib/pilotageRoadmap.ts` + API tasks/meetings/seed.
4. Emails + cron rappels.
5. UI `PilotagePanel` + champ email équipe.
