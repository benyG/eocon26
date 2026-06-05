-- Link ConferenceSession to Workshop (optional FK)
ALTER TABLE `sessions` ADD COLUMN `workshopId` INT NULL;
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_workshopId_fkey` FOREIGN KEY (`workshopId`) REFERENCES `workshops`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
