-- Perk catalog + package assignments + per-sponsor validated perks (delivery checklist)
CREATE TABLE `perks` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `labelFr` VARCHAR(191) NOT NULL,
  `labelEn` VARCHAR(191) NOT NULL,
  `category` VARCHAR(191) NULL,
  `isActivation` BOOLEAN NOT NULL DEFAULT false,
  `isVisible` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `package_perks` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `package_id` INT NOT NULL,
  `perk_id` INT NOT NULL,
  `quantity` INT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  UNIQUE INDEX `package_perks_package_id_perk_id_key`(`package_id`, `perk_id`),
  INDEX `package_perks_package_id_idx`(`package_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `sponsor_perks` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `sponsor_id` INT NOT NULL,
  `perk_id` INT NULL,
  `labelFr` VARCHAR(191) NOT NULL,
  `labelEn` VARCHAR(191) NOT NULL,
  `quantity` INT NULL,
  `done` BOOLEAN NOT NULL DEFAULT false,
  `note` TEXT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `sponsor_perks_sponsor_id_idx`(`sponsor_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Sponsor: closing / billing fields
ALTER TABLE `sponsors`
  ADD COLUMN `deal_amount` INT NULL,
  ADD COLUMN `proforma_number` VARCHAR(191) NULL,
  ADD COLUMN `proforma_at` DATETIME(3) NULL,
  ADD COLUMN `invoice_number` VARCHAR(191) NULL,
  ADD COLUMN `invoice_at` DATETIME(3) NULL;

-- SponsorProspect: follow-up cadence + link to created sponsor
ALTER TABLE `sponsor_prospects`
  ADD COLUMN `contacted_at` DATETIME(3) NULL,
  ADD COLUMN `last_contact_at` DATETIME(3) NULL,
  ADD COLUMN `next_followup_at` DATETIME(3) NULL,
  ADD COLUMN `followup_stage` VARCHAR(191) NULL,
  ADD COLUMN `sponsor_id` INT NULL;

-- BudgetItem: link a revenue line to a sponsor
ALTER TABLE `budget_items`
  ADD COLUMN `sponsor_id` INT NULL,
  ADD INDEX `budget_items_sponsor_id_idx`(`sponsor_id`);

-- Foreign keys
ALTER TABLE `package_perks` ADD CONSTRAINT `package_perks_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `sponsor_packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `package_perks` ADD CONSTRAINT `package_perks_perk_id_fkey` FOREIGN KEY (`perk_id`) REFERENCES `perks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `sponsor_perks` ADD CONSTRAINT `sponsor_perks_sponsor_id_fkey` FOREIGN KEY (`sponsor_id`) REFERENCES `sponsors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `sponsor_perks` ADD CONSTRAINT `sponsor_perks_perk_id_fkey` FOREIGN KEY (`perk_id`) REFERENCES `perks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_sponsor_id_fkey` FOREIGN KEY (`sponsor_id`) REFERENCES `sponsors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
