-- Online check-in: magic link token + session tracking
ALTER TABLE `registrations`
  ADD COLUMN IF NOT EXISTS `onlineToken`        VARCHAR(128) NULL UNIQUE,
  ADD COLUMN IF NOT EXISTS `onlineCheckedInAt`  DATETIME(3) NULL,
  ADD COLUMN IF NOT EXISTS `onlineAccessSentAt` DATETIME(3) NULL;

CREATE TABLE IF NOT EXISTS `online_sessions` (
  `id`             INT           NOT NULL AUTO_INCREMENT,
  `registrationId` INT           NOT NULL,
  `sessionToken`   VARCHAR(128)  NOT NULL,
  `expiresAt`      DATETIME(3)   NOT NULL,
  `lastSeenAt`     DATETIME(3)   NULL,
  `ipAddress`      VARCHAR(64)   NULL,
  `userAgent`      LONGTEXT      NULL,
  `createdAt`      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `online_sessions_sessionToken_key` (`sessionToken`),
  CONSTRAINT `online_sessions_registrationId_fkey`
    FOREIGN KEY (`registrationId`) REFERENCES `registrations` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
