-- Add status column to existing tables
ALTER TABLE `cfp_submissions`
  ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  MODIFY COLUMN `abstract` TEXT NOT NULL,
  MODIFY COLUMN `bio` TEXT;

ALTER TABLE `volunteer_applications`
  ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  MODIFY COLUMN `experience` TEXT,
  MODIFY COLUMN `motivation` TEXT NOT NULL;

ALTER TABLE `registrations`
  ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'pending';

-- Speakers
CREATE TABLE `speakers` (
  `id`           INT           NOT NULL AUTO_INCREMENT,
  `name`         VARCHAR(255)  NOT NULL,
  `title`        VARCHAR(255)  NOT NULL,
  `company`      VARCHAR(255)  DEFAULT NULL,
  `country`      VARCHAR(100)  DEFAULT NULL,
  `bio`          TEXT          NOT NULL,
  `photoUrl`     VARCHAR(500)  DEFAULT NULL,
  `linkedin`     VARCHAR(500)  DEFAULT NULL,
  `twitter`      VARCHAR(255)  DEFAULT NULL,
  `talkTitle`    VARCHAR(255)  DEFAULT NULL,
  `talkAbstract` TEXT          DEFAULT NULL,
  `talkFormat`   VARCHAR(100)  DEFAULT NULL,
  `isKeynote`    TINYINT(1)    NOT NULL DEFAULT 0,
  `edition`      VARCHAR(10)   NOT NULL DEFAULT '2026',
  `isVisible`    TINYINT(1)    NOT NULL DEFAULT 1,
  `sortOrder`    INT           NOT NULL DEFAULT 0,
  `createdAt`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sponsors
CREATE TABLE `sponsors` (
  `id`        INT           NOT NULL AUTO_INCREMENT,
  `name`      VARCHAR(255)  NOT NULL,
  `logoUrl`   VARCHAR(500)  DEFAULT NULL,
  `website`   VARCHAR(500)  DEFAULT NULL,
  `tier`      VARCHAR(20)   NOT NULL,
  `isVisible` TINYINT(1)    NOT NULL DEFAULT 1,
  `sortOrder` INT           NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions (schedule)
CREATE TABLE `sessions` (
  `id`          INT           NOT NULL AUTO_INCREMENT,
  `time`        VARCHAR(10)   NOT NULL,
  `title`       VARCHAR(255)  NOT NULL,
  `type`        VARCHAR(20)   NOT NULL,
  `speakerName` VARCHAR(255)  DEFAULT NULL,
  `room`        VARCHAR(100)  DEFAULT NULL,
  `description` TEXT          DEFAULT NULL,
  `sortOrder`   INT           NOT NULL DEFAULT 0,
  `isVisible`   TINYINT(1)    NOT NULL DEFAULT 1,
  `createdAt`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Newsletter subscribers
CREATE TABLE `newsletter_subscribers` (
  `id`        INT           NOT NULL AUTO_INCREMENT,
  `email`     VARCHAR(255)  NOT NULL,
  `createdAt` DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `newsletter_subscribers_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
