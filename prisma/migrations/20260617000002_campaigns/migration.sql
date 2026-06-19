-- AlterTable: link email logs to campaigns
ALTER TABLE `email_logs` ADD COLUMN `campaignId` INT NULL;
CREATE INDEX `email_logs_campaignId_idx` ON `email_logs`(`campaignId`);

-- CreateTable
CREATE TABLE `campaigns` (
  `id`             INT NOT NULL AUTO_INCREMENT,
  `name`           VARCHAR(191) NOT NULL,
  `subject`        VARCHAR(191) NOT NULL,
  `htmlBody`       LONGTEXT NOT NULL,
  `segment`        TEXT NOT NULL,
  `status`         VARCHAR(191) NOT NULL DEFAULT 'draft',
  `recipientCount` INT NOT NULL DEFAULT 0,
  `sentCount`      INT NOT NULL DEFAULT 0,
  `failedCount`    INT NOT NULL DEFAULT 0,
  `sentAt`         DATETIME(3) NULL,
  `createdAt`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
