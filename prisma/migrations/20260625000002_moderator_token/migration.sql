-- AddColumn moderatorToken + moderatorTokenExpiresAt on sessions
ALTER TABLE `sessions` ADD COLUMN `moderatorToken` VARCHAR(191) NULL;
ALTER TABLE `sessions` ADD COLUMN `moderatorTokenExpiresAt` DATETIME(3) NULL;
CREATE UNIQUE INDEX `sessions_moderatorToken_key` ON `sessions`(`moderatorToken`);
