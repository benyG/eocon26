-- ============================================================
-- EOCON 2026 — Consolidated initial schema
-- Replaces all prior incremental migrations.
-- Assumes a completely empty database.
-- ============================================================

-- ── workshops (no deps) ──────────────────────────────────────
CREATE TABLE `workshops` (
  `id`          INT           NOT NULL AUTO_INCREMENT,
  `title`       VARCHAR(191)  NOT NULL,
  `description` TEXT          NOT NULL,
  `level`       VARCHAR(191)  NOT NULL,
  `duration`    VARCHAR(191)  NOT NULL DEFAULT '3h',
  `maxSeats`    INT           NULL,
  `instructor`  VARCHAR(191)  NULL,
  `isVisible`   TINYINT(1)    NOT NULL DEFAULT 1,
  `sortOrder`   INT           NOT NULL DEFAULT 0,
  `createdAt`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── speakers (no deps) ──────────────────────────────────────
CREATE TABLE `speakers` (
  `id`               INT           NOT NULL AUTO_INCREMENT,
  `name`             VARCHAR(191)  NOT NULL,
  `title`            VARCHAR(191)  NOT NULL,
  `company`          VARCHAR(191)  NULL,
  `country`          VARCHAR(191)  NULL,
  `bio`              TEXT          NOT NULL,
  `photoUrl`         VARCHAR(191)  NULL,
  `visualUrl`        VARCHAR(191)  NULL,
  `linkedin`         VARCHAR(191)  NULL,
  `twitter`          VARCHAR(191)  NULL,
  `talkTitle`        VARCHAR(191)  NULL,
  `talkAbstract`     TEXT          NULL,
  `talkFormat`       VARCHAR(191)  NULL,
  `isKeynote`        TINYINT(1)    NOT NULL DEFAULT 0,
  `edition`          VARCHAR(191)  NOT NULL DEFAULT '2026',
  `isVisible`        TINYINT(1)    NOT NULL DEFAULT 1,
  `sortOrder`        INT           NOT NULL DEFAULT 0,
  `onboardingStatus` VARCHAR(191)  NULL DEFAULT 'pending',
  `createdAt`        DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── admin_profiles (no deps) ─────────────────────────────────
CREATE TABLE `admin_profiles` (
  `id`          INT           NOT NULL AUTO_INCREMENT,
  `slug`        VARCHAR(191)  NOT NULL,
  `name`        VARCHAR(191)  NOT NULL,
  `description` VARCHAR(191)  NOT NULL DEFAULT '',
  `color`       VARCHAR(191)  NOT NULL DEFAULT '#888888',
  `permissions` TEXT          NOT NULL,
  `isSystem`    TINYINT(1)    NOT NULL DEFAULT 0,
  `createdAt`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `admin_profiles_slug_key` (`slug`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── admin_users (deps: admin_profiles) ──────────────────────
CREATE TABLE `admin_users` (
  `id`            INT           NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(191)  NOT NULL,
  `email`         VARCHAR(191)  NOT NULL,
  `passwordHash`  VARCHAR(191)  NOT NULL,
  `permissions`   TEXT          NOT NULL,
  `isActive`      TINYINT(1)    NOT NULL DEFAULT 1,
  `profileId`     INT           NULL,
  `createdAt`     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `mfaSecret`     TEXT          NULL,
  `mfaEnabled`    TINYINT(1)    NOT NULL DEFAULT 0,
  `mfaEnrolledAt` DATETIME(3)   NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `admin_users_email_key` (`email`),
  CONSTRAINT `admin_users_profileId_fkey`
    FOREIGN KEY (`profileId`) REFERENCES `admin_profiles` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── admin_sessions (deps: admin_users) ──────────────────────
CREATE TABLE `admin_sessions` (
  `id`        INT           NOT NULL AUTO_INCREMENT,
  `token`     VARCHAR(191)  NOT NULL,
  `userId`    INT           NOT NULL,
  `expiresAt` DATETIME(3)   NOT NULL,
  `createdAt` DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `admin_sessions_token_key` (`token`),
  CONSTRAINT `admin_sessions_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `admin_users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── speaker_onboarding (deps: speakers) ─────────────────────
CREATE TABLE `speaker_onboarding` (
  `id`                 INT         NOT NULL AUTO_INCREMENT,
  `speakerId`          INT         NOT NULL,
  `selectionMailSent`  TINYINT(1)  NOT NULL DEFAULT 0,
  `modalitiesMailSent` TINYINT(1)  NOT NULL DEFAULT 0,
  `timingMailSent`     TINYINT(1)  NOT NULL DEFAULT 0,
  `bioReceived`        TINYINT(1)  NOT NULL DEFAULT 0,
  `photoReceived`      TINYINT(1)  NOT NULL DEFAULT 0,
  `slidesReceived`     TINYINT(1)  NOT NULL DEFAULT 0,
  `transportArranged`  TINYINT(1)  NOT NULL DEFAULT 0,
  `accommodationDone`  TINYINT(1)  NOT NULL DEFAULT 0,
  `agreementSigned`    TINYINT(1)  NOT NULL DEFAULT 0,
  `notes`              TEXT        NULL,
  `updatedAt`          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `speaker_onboarding_speakerId_key` (`speakerId`),
  CONSTRAINT `speaker_onboarding_speakerId_fkey`
    FOREIGN KEY (`speakerId`) REFERENCES `speakers` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── cfp_submissions (deps: speakers) ────────────────────────
CREATE TABLE `cfp_submissions` (
  `id`               INT           NOT NULL AUTO_INCREMENT,
  `name`             VARCHAR(191)  NOT NULL,
  `email`            VARCHAR(191)  NOT NULL,
  `org`              VARCHAR(191)  NULL,
  `country`          VARCHAR(191)  NULL,
  `talkTitle`        VARCHAR(191)  NOT NULL,
  `format`           VARCHAR(191)  NULL,
  `abstract`         TEXT          NOT NULL,
  `bio`              TEXT          NULL,
  `langPresentation` VARCHAR(191)  NULL DEFAULT 'fr',
  `status`           VARCHAR(191)  NOT NULL DEFAULT 'pending',
  `pipelineStage`    VARCHAR(191)  NOT NULL DEFAULT 'submitted',
  `notes`            TEXT          NULL,
  `decisionSentAt`   DATETIME(3)   NULL,
  `aiScore`          DOUBLE        NULL,
  `aiAnalysis`       TEXT          NULL,
  `createdAt`        DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `speakerId`        INT           NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cfp_submissions_speakerId_key` (`speakerId`),
  CONSTRAINT `cfp_submissions_speakerId_fkey`
    FOREIGN KEY (`speakerId`) REFERENCES `speakers` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── sessions (deps: workshops) ───────────────────────────────
CREATE TABLE `sessions` (
  `id`           INT           NOT NULL AUTO_INCREMENT,
  `date`         VARCHAR(191)  NULL,
  `time`         VARCHAR(191)  NOT NULL,
  `endTime`      VARCHAR(191)  NULL,
  `title`        VARCHAR(191)  NOT NULL,
  `type`         VARCHAR(191)  NOT NULL,
  `speakerName`  VARCHAR(191)  NULL,
  `speakerId`    INT           NULL,
  `workshopId`   INT           NULL,
  `room`         VARCHAR(191)  NULL,
  `description`  TEXT          NULL,
  `sortOrder`    INT           NOT NULL DEFAULT 0,
  `isVisible`    TINYINT(1)    NOT NULL DEFAULT 1,
  `displayFrom`  DATETIME(3)   NULL,
  `displayUntil` DATETIME(3)   NULL,
  `createdAt`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `sessions_workshopId_fkey`
    FOREIGN KEY (`workshopId`) REFERENCES `workshops` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── registrations (no FK deps) ───────────────────────────────
CREATE TABLE `registrations` (
  `id`                INT           NOT NULL AUTO_INCREMENT,
  `fname`             VARCHAR(191)  NOT NULL,
  `lname`             VARCHAR(191)  NOT NULL,
  `email`             VARCHAR(191)  NOT NULL,
  `org`               VARCHAR(191)  NULL,
  `country`           VARCHAR(191)  NULL,
  `ticketType`        VARCHAR(191)  NOT NULL,
  `ticketRef`         VARCHAR(191)  NULL,
  `langExpression`    VARCHAR(191)  NULL DEFAULT 'fr',
  `status`            VARCHAR(191)  NOT NULL DEFAULT 'pending',
  `qrCode`            VARCHAR(191)  NULL,
  `checkedInAt`       DATETIME(3)   NULL,
  `checkedInBy`       VARCHAR(191)  NULL,
  `linkedin`          VARCHAR(191)  NULL,
  `whatsapp`          VARCHAR(191)  NULL,
  `ctfCompetitorName` VARCHAR(191)  NULL,
  `ctfTeamName`       VARCHAR(191)  NULL,
  `ctfPassword`       VARCHAR(191)  NULL,
  `ctfAccountCreated` TINYINT(1)    NOT NULL DEFAULT 0,
  `createdAt`         DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `registrations_ticketRef_key` (`ticketRef`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── volunteer_applications (no FK deps) ──────────────────────
CREATE TABLE `volunteer_applications` (
  `id`             INT           NOT NULL AUTO_INCREMENT,
  `name`           VARCHAR(191)  NOT NULL,
  `email`          VARCHAR(191)  NOT NULL,
  `phone`          VARCHAR(191)  NULL,
  `city`           VARCHAR(191)  NULL,
  `role`           VARCHAR(191)  NULL,
  `experience`     TEXT          NULL,
  `motivation`     TEXT          NOT NULL,
  `langExpression` VARCHAR(191)  NULL DEFAULT 'fr',
  `status`         VARCHAR(191)  NOT NULL DEFAULT 'pending',
  `assignedRole`   VARCHAR(191)  NULL,
  `shiftStart`     DATETIME(3)   NULL,
  `shiftEnd`       DATETIME(3)   NULL,
  `createdAt`      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── sponsors (no FK deps) ────────────────────────────────────
CREATE TABLE `sponsors` (
  `id`        INT           NOT NULL AUTO_INCREMENT,
  `name`      VARCHAR(191)  NOT NULL,
  `logoUrl`   VARCHAR(191)  NULL,
  `website`   VARCHAR(191)  NULL,
  `tier`      VARCHAR(191)  NOT NULL,
  `isVisible` TINYINT(1)    NOT NULL DEFAULT 1,
  `sortOrder` INT           NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── newsletter_subscribers ───────────────────────────────────
CREATE TABLE `newsletter_subscribers` (
  `id`        INT           NOT NULL AUTO_INCREMENT,
  `email`     VARCHAR(191)  NOT NULL,
  `createdAt` DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `newsletter_subscribers_email_key` (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── team_members ─────────────────────────────────────────────
CREATE TABLE `team_members` (
  `id`        INT           NOT NULL AUTO_INCREMENT,
  `name`      VARCHAR(191)  NOT NULL,
  `role`      VARCHAR(191)  NOT NULL,
  `bio`       TEXT          NULL,
  `photoUrl`  VARCHAR(191)  NULL,
  `linkedin`  VARCHAR(191)  NULL,
  `twitter`   VARCHAR(191)  NULL,
  `isVisible` TINYINT(1)    NOT NULL DEFAULT 1,
  `sortOrder` INT           NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── past_speakers ────────────────────────────────────────────
CREATE TABLE `past_speakers` (
  `id`        INT           NOT NULL AUTO_INCREMENT,
  `name`      VARCHAR(191)  NOT NULL,
  `role`      VARCHAR(191)  NOT NULL,
  `company`   VARCHAR(191)  NULL,
  `country`   VARCHAR(191)  NULL,
  `edition`   VARCHAR(191)  NULL,
  `photoUrl`  VARCHAR(191)  NULL,
  `isVisible` TINYINT(1)    NOT NULL DEFAULT 1,
  `sortOrder` INT           NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── ticket_capacities ────────────────────────────────────────
CREATE TABLE `ticket_capacities` (
  `id`           INT           NOT NULL AUTO_INCREMENT,
  `ticketType`   VARCHAR(191)  NOT NULL,
  `maxCapacity`  INT           NOT NULL DEFAULT 100,
  `alertPercent` INT           NOT NULL DEFAULT 80,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ticket_capacities_ticketType_key` (`ticketType`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── ticket_types ─────────────────────────────────────────────
CREATE TABLE `ticket_types` (
  `id`               INT           NOT NULL AUTO_INCREMENT,
  `slug`             VARCHAR(191)  NOT NULL,
  `nameFr`           VARCHAR(191)  NOT NULL,
  `nameEn`           VARCHAR(191)  NOT NULL,
  `priceFr`          INT           NOT NULL DEFAULT 0,
  `priceEn`          INT           NOT NULL DEFAULT 0,
  `perksFr`          TEXT          NOT NULL,
  `perksEn`          TEXT          NOT NULL,
  `earlyBirdPriceFr` INT           NULL,
  `earlyBirdPriceEn` INT           NULL,
  `earlyBirdUntil`   DATETIME(3)   NULL,
  `color`            VARCHAR(191)  NOT NULL DEFAULT '#00ff9d',
  `isFeatured`       TINYINT(1)    NOT NULL DEFAULT 0,
  `isVisible`        TINYINT(1)    NOT NULL DEFAULT 1,
  `ctfAccess`        TINYINT(1)    NOT NULL DEFAULT 0,
  `includesCTF`      TINYINT(1)    NOT NULL DEFAULT 0,
  `maxCapacity`      INT           NOT NULL DEFAULT 200,
  `sortOrder`        INT           NOT NULL DEFAULT 0,
  `createdAt`        DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`        DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ticket_types_slug_key` (`slug`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── event_settings ───────────────────────────────────────────
CREATE TABLE `event_settings` (
  `key`       VARCHAR(191) NOT NULL,
  `value`     TEXT         NOT NULL,
  `updatedAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── email_templates ──────────────────────────────────────────
CREATE TABLE `email_templates` (
  `id`          INT           NOT NULL AUTO_INCREMENT,
  `slug`        VARCHAR(191)  NULL,
  `name`        VARCHAR(191)  NOT NULL,
  `subject`     VARCHAR(191)  NOT NULL,
  `htmlBody`    LONGTEXT      NOT NULL,
  `variables`   TEXT          NULL,
  `segment`     VARCHAR(191)  NOT NULL DEFAULT 'all',
  `scheduledAt` DATETIME(3)   NULL,
  `sentAt`      DATETIME(3)   NULL,
  `createdAt`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_templates_slug_key` (`slug`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── email_logs ───────────────────────────────────────────────
CREATE TABLE `email_logs` (
  `id`         INT           NOT NULL AUTO_INCREMENT,
  `templateId` INT           NULL,
  `recipient`  VARCHAR(191)  NOT NULL,
  `subject`    VARCHAR(191)  NOT NULL,
  `status`     VARCHAR(191)  NOT NULL DEFAULT 'sent',
  `sentAt`     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── sponsor_prospects ────────────────────────────────────────
CREATE TABLE `sponsor_prospects` (
  `id`        INT           NOT NULL AUTO_INCREMENT,
  `org`       VARCHAR(191)  NOT NULL,
  `contact`   VARCHAR(191)  NULL,
  `email`     VARCHAR(191)  NULL,
  `phone`     VARCHAR(191)  NULL,
  `package`   VARCHAR(191)  NULL,
  `status`    VARCHAR(191)  NOT NULL DEFAULT 'contacted',
  `notes`     TEXT          NULL,
  `createdAt` DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── budget_items ─────────────────────────────────────────────
CREATE TABLE `budget_items` (
  `id`          INT           NOT NULL AUTO_INCREMENT,
  `category`    VARCHAR(191)  NOT NULL DEFAULT 'costs',
  `label`       VARCHAR(191)  NOT NULL,
  `planned`     DOUBLE        NOT NULL DEFAULT 0,
  `actual`      DOUBLE        NOT NULL DEFAULT 0,
  `status`      VARCHAR(191)  NOT NULL DEFAULT 'pending',
  `responsable` VARCHAR(191)  NULL,
  `createdAt`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── logistics_tasks ──────────────────────────────────────────
CREATE TABLE `logistics_tasks` (
  `id`        INT           NOT NULL AUTO_INCREMENT,
  `category`  VARCHAR(191)  NOT NULL,
  `title`     VARCHAR(191)  NOT NULL,
  `assignee`  VARCHAR(191)  NULL,
  `deadline`  DATETIME(3)   NULL,
  `done`      TINYINT(1)    NOT NULL DEFAULT 0,
  `sortOrder` INT           NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── social_posts ─────────────────────────────────────────────
CREATE TABLE `social_posts` (
  `id`             INT           NOT NULL AUTO_INCREMENT,
  `brief`          TEXT          NOT NULL,
  `platform`       VARCHAR(191)  NOT NULL,
  `lang`           VARCHAR(191)  NOT NULL,
  `content`        TEXT          NOT NULL,
  `imageUrl`       VARCHAR(191)  NULL,
  `scheduledAt`    DATETIME(3)   NULL,
  `publishedAt`    DATETIME(3)   NULL,
  `linkedinPostId` VARCHAR(191)  NULL,
  `status`         VARCHAR(191)  NOT NULL DEFAULT 'draft',
  `errorMessage`   TEXT          NULL,
  `createdAt`      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `contentType`    VARCHAR(191)  NULL,
  `speakerId`      INT           NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── prospect_leads ───────────────────────────────────────────
CREATE TABLE `prospect_leads` (
  `id`                 INT           NOT NULL AUTO_INCREMENT,
  `source`             VARCHAR(191)  NOT NULL DEFAULT 'manual',
  `org`                VARCHAR(191)  NOT NULL,
  `sector`             VARCHAR(191)  NULL,
  `city`               VARCHAR(191)  NULL,
  `website`            VARCHAR(191)  NULL,
  `phone`              VARCHAR(191)  NULL,
  `contactName`        VARCHAR(191)  NULL,
  `contactTitle`       VARCHAR(191)  NULL,
  `contactEmail`       VARCHAR(191)  NULL,
  `contactLinkedin`    VARCHAR(191)  NULL,
  `aiScore`            DOUBLE        NULL,
  `aiScoreReason`      TEXT          NULL,
  `recommendedPackage` VARCHAR(191)  NULL,
  `addedToPipeline`    TINYINT(1)    NOT NULL DEFAULT 0,
  `createdAt`          DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── audit_logs ───────────────────────────────────────────────
CREATE TABLE `audit_logs` (
  `id`         INT           NOT NULL AUTO_INCREMENT,
  `actor`      VARCHAR(120)  NOT NULL DEFAULT 'admin',
  `ip`         VARCHAR(45)   NULL,
  `action`     VARCHAR(50)   NOT NULL,
  `resource`   VARCHAR(50)   NOT NULL,
  `resourceId` VARCHAR(50)   NULL,
  `details`    JSON          NULL,
  `createdAt`  DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `audit_logs_createdAt_idx` (`createdAt`),
  INDEX `audit_logs_resource_idx` (`resource`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── badge_credentials ────────────────────────────────────────
CREATE TABLE `badge_credentials` (
  `id`             INT           NOT NULL AUTO_INCREMENT,
  `uuid`           VARCHAR(191)  NOT NULL,
  `badgeType`      VARCHAR(191)  NOT NULL,
  `subtype`        VARCHAR(191)  NULL,
  `recipientName`  VARCHAR(191)  NOT NULL,
  `recipientEmail` VARCHAR(191)  NOT NULL,
  `credentialJson` LONGTEXT      NOT NULL,
  `issuedAt`       DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `revokedAt`      DATETIME(3)   NULL,
  `emailSentAt`    DATETIME(3)   NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `badge_credentials_uuid_key` (`uuid`),
  INDEX `badge_credentials_recipientEmail_idx` (`recipientEmail`),
  INDEX `badge_credentials_badgeType_idx` (`badgeType`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── sponsor_packages ─────────────────────────────────────────
CREATE TABLE `sponsor_packages` (
  `id`             INT           NOT NULL AUTO_INCREMENT,
  `tier`           VARCHAR(191)  NOT NULL,
  `nameFr`         VARCHAR(191)  NOT NULL,
  `nameEn`         VARCHAR(191)  NOT NULL,
  `price`          INT           NOT NULL,
  `maxSponsors`    INT           NOT NULL DEFAULT 1,
  `perks`          TEXT          NOT NULL,
  `perksFr`        TEXT          NOT NULL,
  `perksEn`        TEXT          NOT NULL,
  `isVisible`      TINYINT(1)    NOT NULL DEFAULT 1,
  `sortOrder`      INT           NOT NULL DEFAULT 0,
  `highlightColor` VARCHAR(191)  NULL,
  `createdAt`      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sponsor_packages_tier_key` (`tier`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── ctf_challenges ───────────────────────────────────────────
CREATE TABLE `ctf_challenges` (
  `id`         INT           NOT NULL AUTO_INCREMENT,
  `title`      VARCHAR(191)  NOT NULL,
  `category`   VARCHAR(191)  NOT NULL,
  `difficulty` VARCHAR(191)  NOT NULL DEFAULT 'medium',
  `points`     INT           NOT NULL DEFAULT 0,
  `author`     VARCHAR(191)  NULL,
  `status`     VARCHAR(191)  NOT NULL DEFAULT 'idea',
  `ctfdId`     INT           NULL,
  `notes`      TEXT          NULL,
  `sortOrder`  INT           NOT NULL DEFAULT 0,
  `createdAt`  DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================
-- SEED DATA
-- ============================================================

-- ── Admin profiles ───────────────────────────────────────────
INSERT INTO `admin_profiles` (`slug`, `name`, `description`, `color`, `permissions`, `isSystem`, `updatedAt`) VALUES
('super_admin', 'Super Admin', 'Accès complet à toutes les fonctionnalités', '#00ff9d',
 '{"cfp":"write","speakers":"write","onboarding":"write","sessions":"write","workshops":"write","volunteers":"write","registrations":"write","newsletter":"write","sponsors":"write","sponsor-pipeline":"write","budget":"write","logistics":"write","communication":"write","team":"write","export":"write","users":"write","prospection":"write","certificates":"write","checkin":"write","ctf":"write"}',
 1, NOW()),
('coordinateur_cfp', 'Coordinateur CFP', 'Gestion des soumissions, speakers et programme', '#cc00ff',
 '{"cfp":"write","speakers":"write","onboarding":"write","sessions":"read","workshops":"read","registrations":"read"}',
 1, NOW()),
('charge_communication', 'Chargé de Communication', 'Communication, réseaux sociaux et newsletter', '#0066ff',
 '{"communication":"write","newsletter":"write","speakers":"read","sessions":"read","sponsors":"read"}',
 1, NOW()),
('responsable_sponsors', 'Responsable Sponsors', 'Pipeline sponsors, packages et budget', '#ffaa00',
 '{"sponsors":"write","sponsor-pipeline":"write","budget":"write","prospection":"write","export":"read"}',
 1, NOW()),
('responsable_logistique', 'Responsable Logistique', 'Logistique, bénévoles et inscriptions', '#ff6600',
 '{"logistics":"write","volunteers":"write","registrations":"write","checkin":"write","team":"write","export":"read"}',
 1, NOW()),
('hotesse', 'Hôtesse d''Accueil', 'Validation check-in et consultation des inscrits', '#00ccff',
 '{"checkin":"write","registrations":"read"}',
 1, NOW()),
('observateur', 'Observateur', 'Lecture seule sur toutes les sections', '#888888',
 '{"cfp":"read","speakers":"read","sessions":"read","workshops":"read","volunteers":"read","registrations":"read","newsletter":"read","sponsors":"read","budget":"read","logistics":"read"}',
 1, NOW());

-- ── Hôtesse user (password = "hotesse2026") ──────────────────
INSERT INTO `admin_users` (`name`, `email`, `passwordHash`, `permissions`, `isActive`, `profileId`)
SELECT
  'Hôtesse Accueil',
  'hotesse@eocon.local',
  'hotesse:a4f2b9c1d8e7f3a5b6c2d9e0f1a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
  '{"checkin":"write","registrations":"read"}',
  1,
  (SELECT `id` FROM `admin_profiles` WHERE `slug` = 'hotesse' LIMIT 1);

-- ── Default ticket types ──────────────────────────────────────
INSERT INTO `ticket_types` (`slug`, `nameFr`, `nameEn`, `priceFr`, `priceEn`, `perksFr`, `perksEn`, `earlyBirdPriceFr`, `earlyBirdPriceEn`, `earlyBirdUntil`, `color`, `isFeatured`, `isVisible`, `ctfAccess`, `includesCTF`, `maxCapacity`, `sortOrder`, `updatedAt`) VALUES
('student', 'Étudiant', 'Student', 5000, 10,
 '["Accès conférence","Sessions keynote","Networking","Certificate of attendance"]',
 '["Conference access","Keynote sessions","Networking","Certificate of attendance"]',
 NULL, NULL, NULL, '#888888', 0, 1, 0, 0, 150, 0, NOW()),
('standard', 'Standard', 'Standard', 20000, 35,
 '["Accès conférence","Tous les ateliers","Kit participant","Déjeuner inclus","Networking","Certificate of attendance"]',
 '["Conference access","All workshops","Participant kit","Lunch included","Networking","Certificate of attendance"]',
 15000, 25, '2026-09-30 23:59:59', '#00ff9d', 1, 1, 0, 0, 300, 1, NOW()),
('vip', 'VIP', 'VIP', 50000, 90,
 '["Accès complet","Table ronde speakers","Kit premium","Déjeuner & dîner de gala","Certificat officiel","Accès CTF EOCTF prioritaire"]',
 '["Full access","Speakers roundtable","Premium kit","Lunch & gala dinner","Official certificate","Priority CTF EOCTF access"]',
 NULL, NULL, NULL, '#ffaa00', 0, 1, 1, 1, 50, 2, NOW()),
('ctf', 'CTF Only', 'CTF Only', 10000, 18,
 '["Accès CTF EyesOpen","Plateforme compétition","Accès salle CTF"]',
 '["CTF EyesOpen access","Competition platform","CTF room access"]',
 NULL, NULL, NULL, '#ff0066', 0, 1, 1, 1, 100, 3, NOW());

-- ── Event settings ────────────────────────────────────────────
INSERT INTO `event_settings` (`key`, `value`, `updatedAt`) VALUES
('event_date',             '2026-11-28',                                              NOW()),
('event_date_display_fr',  '28 novembre 2026',                                        NOW()),
('event_date_display_en',  'November 28, 2026',                                       NOW()),
('event_venue',            'Hotel Onomo',                                             NOW()),
('event_city',             'Douala',                                                  NOW()),
('event_country',          'Cameroun',                                                NOW()),
('event_address',          'Hotel Onomo, Boulevard de la Liberté, Douala, Cameroun',  NOW()),
('event_time_start',       '08:00',                                                   NOW()),
('event_edition',          '7',                                                       NOW()),
('site_base_url',          'https://eyesopensecurity.com',                            NOW()),
('url_inscription',        'https://eyesopensecurity.com/#inscription',               NOW()),
('url_cfp',                'https://eyesopensecurity.com/#cfp',                       NOW()),
('url_benevoles',          'https://eyesopensecurity.com/#benevoles',                 NOW()),
('url_programme',          'https://eyesopensecurity.com/#programme',                 NOW()),
('url_ctf',                'https://eyesopensecurity.com/#ctf',                       NOW());

-- ── Past speakers ─────────────────────────────────────────────
INSERT INTO `past_speakers` (`name`, `role`, `company`, `country`, `edition`, `photoUrl`, `isVisible`, `sortOrder`, `createdAt`) VALUES
('Abene Bertin',          'Sr. Information Security Architect', NULL, 'Canada',        NULL, NULL, 1,  10, NOW()),
('Chioma Chigozie-Okwum', 'Director, Spiritan University',      NULL, 'Nigeria',       NULL, NULL, 1,  20, NOW()),
('Simon Nolet',           'Spécialiste Sécurité Offensive',     NULL, 'Canada',        NULL, NULL, 1,  30, NOW()),
('Bernard Wanyama',       'President, ISACA Kampala',           NULL, 'Uganda',        NULL, NULL, 1,  40, NOW()),
('Shruti Kalsi',          'Director at EY-Parthenon',           NULL, 'India',         NULL, NULL, 1,  50, NOW()),
('Tomslin Samme-Nlar',    'CEO CyberDefenz, Pentester',         NULL, 'Cameroon',      NULL, NULL, 1,  60, NOW()),
('Kevin Monkam',          'Information Security Architect',     NULL, 'France',        NULL, NULL, 1,  70, NOW()),
('Honoré Tapoko',         'Sr. Cybersecurity Engineer',         NULL, 'United States', NULL, NULL, 1,  80, NOW()),
('Blay Abu Safian',       'CEO of Inveteck Global',             NULL, 'Ghana',         NULL, NULL, 1,  90, NOW()),
('Isaac Noumba',          'Security Product Manager at F5',     NULL, 'United States', NULL, NULL, 1, 100, NOW()),
('Sagar Tiwari',          'Independent OSINT Researcher',       NULL, 'Australia',     NULL, NULL, 1, 110, NOW()),
('Stephen Pullum',        'Founder Africurity',                 NULL, 'United States', NULL, NULL, 1, 120, NOW());
