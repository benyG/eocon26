ALTER TABLE `email_templates` ADD COLUMN `slug` VARCHAR(100) NULL UNIQUE;
ALTER TABLE `email_templates` ADD COLUMN `variables` TEXT NULL;
ALTER TABLE `registrations` ADD COLUMN `ticketRef` VARCHAR(50) NULL UNIQUE;
