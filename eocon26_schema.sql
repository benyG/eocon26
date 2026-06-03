-- ============================================================
-- EOCON 2026 — Schéma complet de la base de données
-- Importer sur une base VIDE via phpMyAdmin ou mysql CLI
-- mysql -u USER -p DATABASE < eocon26_schema.sql
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Tables de base (formulaires publics)
-- ------------------------------------------------------------

CREATE TABLE `cfp_submissions` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `name`           VARCHAR(255) NOT NULL,
  `email`          VARCHAR(255) NOT NULL,
  `org`            VARCHAR(255) NULL,
  `country`        VARCHAR(100) NULL,
  `talkTitle`      VARCHAR(255) NOT NULL,
  `format`         VARCHAR(100) NULL,
  `abstract`       TEXT         NOT NULL,
  `bio`            TEXT         NULL,
  `status`         VARCHAR(20)  NOT NULL DEFAULT 'pending',
  `notes`          TEXT         NULL,
  `decisionSentAt` DATETIME(3)  NULL,
  `aiScore`        DOUBLE       NULL,
  `aiAnalysis`     TEXT         NULL,
  `createdAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `volunteer_applications` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `name`         VARCHAR(255) NOT NULL,
  `email`        VARCHAR(255) NOT NULL,
  `phone`        VARCHAR(50)  NULL,
  `city`         VARCHAR(100) NULL,
  `role`         VARCHAR(100) NULL,
  `experience`   TEXT         NULL,
  `motivation`   TEXT         NOT NULL,
  `status`       VARCHAR(20)  NOT NULL DEFAULT 'pending',
  `assignedRole` VARCHAR(191) NULL,
  `shiftStart`   DATETIME(3)  NULL,
  `shiftEnd`     DATETIME(3)  NULL,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `registrations` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `fname`       VARCHAR(100) NOT NULL,
  `lname`       VARCHAR(100) NOT NULL,
  `email`       VARCHAR(255) NOT NULL,
  `org`         VARCHAR(255) NULL,
  `country`     VARCHAR(100) NULL,
  `ticketType`  VARCHAR(100) NOT NULL,
  `status`      VARCHAR(20)  NOT NULL DEFAULT 'pending',
  `qrCode`      VARCHAR(191) NULL,
  `checkedInAt` DATETIME(3)  NULL,
  `checkedInBy` VARCHAR(191) NULL,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `newsletter_subscribers` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `email`     VARCHAR(255) NOT NULL,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `newsletter_subscribers_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Contenu éditorial
-- ------------------------------------------------------------

CREATE TABLE `speakers` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `name`         VARCHAR(255) NOT NULL,
  `title`        VARCHAR(255) NOT NULL,
  `company`      VARCHAR(255) NULL,
  `country`      VARCHAR(100) NULL,
  `bio`          TEXT         NOT NULL,
  `photoUrl`     VARCHAR(500) NULL,
  `linkedin`     VARCHAR(500) NULL,
  `twitter`      VARCHAR(255) NULL,
  `talkTitle`    VARCHAR(255) NULL,
  `talkAbstract` TEXT         NULL,
  `talkFormat`   VARCHAR(100) NULL,
  `isKeynote`    TINYINT(1)   NOT NULL DEFAULT 0,
  `edition`      VARCHAR(10)  NOT NULL DEFAULT '2026',
  `isVisible`    TINYINT(1)   NOT NULL DEFAULT 1,
  `sortOrder`    INT          NOT NULL DEFAULT 0,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sponsors` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `name`      VARCHAR(255) NOT NULL,
  `logoUrl`   VARCHAR(500) NULL,
  `website`   VARCHAR(500) NULL,
  `tier`      VARCHAR(20)  NOT NULL,
  `isVisible` TINYINT(1)   NOT NULL DEFAULT 1,
  `sortOrder` INT          NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sessions` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `date`         VARCHAR(10)  NULL,
  `time`         VARCHAR(10)  NOT NULL,
  `endTime`      VARCHAR(10)  NULL,
  `title`        VARCHAR(255) NOT NULL,
  `type`         VARCHAR(20)  NOT NULL,
  `speakerName`  VARCHAR(255) NULL,
  `room`         VARCHAR(100) NULL,
  `description`  TEXT         NULL,
  `sortOrder`    INT          NOT NULL DEFAULT 0,
  `isVisible`    TINYINT(1)   NOT NULL DEFAULT 1,
  `displayFrom`  DATETIME     NULL,
  `displayUntil` DATETIME     NULL,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `workshops` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `title`       VARCHAR(191) NOT NULL,
  `description` TEXT         NOT NULL,
  `level`       VARCHAR(191) NOT NULL,
  `duration`    VARCHAR(191) NOT NULL DEFAULT '3h',
  `maxSeats`    INT          NULL,
  `instructor`  VARCHAR(191) NULL,
  `isVisible`   BOOLEAN      NOT NULL DEFAULT TRUE,
  `sortOrder`   INT          NOT NULL DEFAULT 0,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `team_members` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `name`      VARCHAR(191) NOT NULL,
  `role`      VARCHAR(191) NOT NULL,
  `bio`       TEXT         NULL,
  `photoUrl`  VARCHAR(191) NULL,
  `linkedin`  VARCHAR(191) NULL,
  `twitter`   VARCHAR(191) NULL,
  `isVisible` BOOLEAN      NOT NULL DEFAULT TRUE,
  `sortOrder` INT          NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `past_speakers` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `name`      VARCHAR(191) NOT NULL,
  `role`      VARCHAR(191) NOT NULL,
  `company`   VARCHAR(191) NULL,
  `country`   VARCHAR(191) NULL,
  `edition`   VARCHAR(191) NULL,
  `photoUrl`  VARCHAR(191) NULL,
  `isVisible` BOOLEAN      NOT NULL DEFAULT TRUE,
  `sortOrder` INT          NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Administration & Auth
-- ------------------------------------------------------------

CREATE TABLE `admin_users` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `name`         VARCHAR(191) NOT NULL,
  `email`        VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(191) NOT NULL,
  `permissions`  TEXT         NOT NULL,
  `isActive`     BOOLEAN      NOT NULL DEFAULT TRUE,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `admin_users_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `admin_sessions` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `token`     VARCHAR(191) NOT NULL,
  `userId`    INT          NOT NULL,
  `expiresAt` DATETIME(3)  NOT NULL,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `admin_sessions_token_key` (`token`),
  CONSTRAINT `admin_sessions_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `admin_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Onboarding speakers
-- ------------------------------------------------------------

CREATE TABLE `speaker_onboarding` (
  `id`                 INT          NOT NULL AUTO_INCREMENT,
  `speakerId`          INT          NOT NULL,
  `selectionMailSent`  BOOLEAN      NOT NULL DEFAULT FALSE,
  `modalitiesMailSent` BOOLEAN      NOT NULL DEFAULT FALSE,
  `timingMailSent`     BOOLEAN      NOT NULL DEFAULT FALSE,
  `bioReceived`        BOOLEAN      NOT NULL DEFAULT FALSE,
  `photoReceived`      BOOLEAN      NOT NULL DEFAULT FALSE,
  `slidesReceived`     BOOLEAN      NOT NULL DEFAULT FALSE,
  `transportArranged`  BOOLEAN      NOT NULL DEFAULT FALSE,
  `accommodationDone`  BOOLEAN      NOT NULL DEFAULT FALSE,
  `agreementSigned`    BOOLEAN      NOT NULL DEFAULT FALSE,
  `notes`              TEXT         NULL,
  `updatedAt`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `speaker_onboarding_speakerId_key` (`speakerId`),
  CONSTRAINT `speaker_onboarding_speakerId_fkey`
    FOREIGN KEY (`speakerId`) REFERENCES `speakers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ticket_capacities` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `ticketType`   VARCHAR(191) NOT NULL,
  `maxCapacity`  INT          NOT NULL DEFAULT 100,
  `alertPercent` INT          NOT NULL DEFAULT 80,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ticket_capacities_ticketType_key` (`ticketType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Communication & Email
-- ------------------------------------------------------------

CREATE TABLE `email_templates` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(191) NOT NULL,
  `subject`     VARCHAR(191) NOT NULL,
  `htmlBody`    LONGTEXT     NOT NULL,
  `segment`     VARCHAR(191) NOT NULL DEFAULT 'all',
  `scheduledAt` DATETIME(3)  NULL,
  `sentAt`      DATETIME(3)  NULL,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `email_logs` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `templateId` INT          NULL,
  `recipient`  VARCHAR(191) NOT NULL,
  `subject`    VARCHAR(191) NOT NULL,
  `status`     VARCHAR(191) NOT NULL DEFAULT 'sent',
  `sentAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `social_posts` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `brief`          TEXT         NOT NULL,
  `platform`       VARCHAR(191) NOT NULL,
  `lang`           VARCHAR(191) NOT NULL,
  `content`        TEXT         NOT NULL,
  `imageUrl`       VARCHAR(191) NULL,
  `scheduledAt`    DATETIME(3)  NULL,
  `publishedAt`    DATETIME(3)  NULL,
  `linkedinPostId` VARCHAR(191) NULL,
  `status`         VARCHAR(191) NOT NULL DEFAULT 'draft',
  `errorMessage`   TEXT         NULL,
  `createdAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Sponsors pipeline & prospection
-- ------------------------------------------------------------

CREATE TABLE `sponsor_prospects` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `org`       VARCHAR(191) NOT NULL,
  `contact`   VARCHAR(191) NULL,
  `email`     VARCHAR(191) NULL,
  `phone`     VARCHAR(191) NULL,
  `package`   VARCHAR(191) NULL,
  `status`    VARCHAR(191) NOT NULL DEFAULT 'contacted',
  `notes`     TEXT         NULL,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `prospect_leads` (
  `id`                 INT          NOT NULL AUTO_INCREMENT,
  `source`             VARCHAR(191) NOT NULL DEFAULT 'manual',
  `org`                VARCHAR(191) NOT NULL,
  `sector`             VARCHAR(191) NULL,
  `city`               VARCHAR(191) NULL,
  `website`            VARCHAR(191) NULL,
  `phone`              VARCHAR(191) NULL,
  `contactName`        VARCHAR(191) NULL,
  `contactTitle`       VARCHAR(191) NULL,
  `contactEmail`       VARCHAR(191) NULL,
  `contactLinkedin`    VARCHAR(191) NULL,
  `aiScore`            DOUBLE       NULL,
  `aiScoreReason`      TEXT         NULL,
  `recommendedPackage` VARCHAR(191) NULL,
  `addedToPipeline`    BOOLEAN      NOT NULL DEFAULT FALSE,
  `createdAt`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Budget & Logistique
-- ------------------------------------------------------------

CREATE TABLE `budget_items` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `category`  VARCHAR(191) NOT NULL DEFAULT 'costs',
  `label`     VARCHAR(191) NOT NULL,
  `planned`   DOUBLE       NOT NULL DEFAULT 0,
  `actual`    DOUBLE       NOT NULL DEFAULT 0,
  `status`    VARCHAR(191) NOT NULL DEFAULT 'pending',
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `logistics_tasks` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `category`  VARCHAR(191) NOT NULL,
  `title`     VARCHAR(191) NOT NULL,
  `assignee`  VARCHAR(191) NULL,
  `deadline`  DATETIME(3)  NULL,
  `done`      BOOLEAN      NOT NULL DEFAULT FALSE,
  `sortOrder` INT          NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table interne Prisma (obligatoire pour migrate deploy)
-- ------------------------------------------------------------

CREATE TABLE `_prisma_migrations` (
  `id`                   VARCHAR(36)  NOT NULL,
  `checksum`             VARCHAR(64)  NOT NULL,
  `finished_at`          DATETIME(3)  NULL,
  `migration_name`       VARCHAR(255) NOT NULL,
  `logs`                 TEXT         NULL,
  `rolled_back_at`       DATETIME(3)  NULL,
  `started_at`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count`  INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Marquer toutes les migrations comme déjà appliquées
INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `logs`, `rolled_back_at`, `started_at`, `applied_steps_count`) VALUES
('00000001-0000-0000-0000-000000000001', 'eocon_manual_import', NOW(), '0001_init', NULL, NULL, NOW(), 1),
('00000001-0000-0000-0000-000000000002', 'eocon_manual_import', NOW(), '0002_add_content_tables', NULL, NULL, NOW(), 1),
('00000001-0000-0000-0000-000000000003', 'eocon_manual_import', NOW(), '0003_team_pastspeaker_session_calendar', NULL, NULL, NOW(), 1),
('00000001-0000-0000-0000-000000000004', 'eocon_manual_import', NOW(), '0004_workshops', NULL, NULL, NOW(), 1),
('00000001-0000-0000-0000-000000000005', 'eocon_manual_import', NOW(), '0005_add_admin_users_onboarding_qr', NULL, NULL, NOW(), 1),
('00000001-0000-0000-0000-000000000006', 'eocon_manual_import', NOW(), '20260603000000_add_admin_users_onboarding_qr', NULL, NULL, NOW(), 1),
('00000001-0000-0000-0000-000000000007', 'eocon_manual_import', NOW(), '20260604000000_add_comms_sponsor_budget_logistics', NULL, NULL, NOW(), 1),
('00000001-0000-0000-0000-000000000008', 'eocon_manual_import', NOW(), '20260605000000_add_ai_fields_social_posts_prospect_leads', NULL, NULL, NOW(), 1),
('00000001-0000-0000-0000-000000000009', 'eocon_manual_import', NOW(), '20260606000000_add_social_post_publishing_fields', NULL, NULL, NOW(), 1);

SET FOREIGN_KEY_CHECKS = 1;
