CREATE TABLE `badge_credentials` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(191) NOT NULL,
  `badgeType` VARCHAR(50) NOT NULL,
  `subtype` VARCHAR(50) NULL,
  `recipientName` VARCHAR(191) NOT NULL,
  `recipientEmail` VARCHAR(191) NOT NULL,
  `credentialJson` LONGTEXT NOT NULL,
  `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `revokedAt` DATETIME(3) NULL,
  `emailSentAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `badge_credentials_uuid_key` (`uuid`),
  INDEX `badge_credentials_recipientEmail_idx` (`recipientEmail`),
  INDEX `badge_credentials_badgeType_idx` (`badgeType`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
