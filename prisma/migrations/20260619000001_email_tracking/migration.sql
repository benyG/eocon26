-- Email delivery/click tracking via Resend webhooks
ALTER TABLE `email_logs`
  ADD COLUMN `resendId` VARCHAR(191) NULL,
  ADD COLUMN `deliveredAt` DATETIME(3) NULL,
  ADD COLUMN `openedAt` DATETIME(3) NULL,
  ADD COLUMN `clickedAt` DATETIME(3) NULL,
  ADD COLUMN `bouncedAt` DATETIME(3) NULL;

CREATE INDEX `email_logs_resendId_idx` ON `email_logs`(`resendId`);
