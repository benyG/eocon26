ALTER TABLE `sponsor_prospects` ADD COLUMN `assigneeId` INT NULL;
ALTER TABLE `sponsor_prospects` ADD CONSTRAINT `sponsor_prospects_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
