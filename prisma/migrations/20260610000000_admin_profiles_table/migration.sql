-- CreateTable: admin_profiles
CREATE TABLE `admin_profiles` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` VARCHAR(191) NOT NULL DEFAULT '',
  `color` VARCHAR(191) NOT NULL DEFAULT '#888888',
  `permissions` TEXT NOT NULL,
  `isSystem` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `admin_profiles_slug_key` (`slug`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Migrate profileId from String? to Int? (drop & recreate column)
ALTER TABLE `admin_users` DROP COLUMN `profileId`;
ALTER TABLE `admin_users` ADD COLUMN `profileId` INTEGER NULL;
ALTER TABLE `admin_users` ADD CONSTRAINT `admin_users_profileId_fkey`
  FOREIGN KEY (`profileId`) REFERENCES `admin_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default system profiles
INSERT INTO `admin_profiles` (`slug`, `name`, `description`, `color`, `permissions`, `isSystem`, `updatedAt`) VALUES
('super_admin', 'Super Admin', 'Accès complet à toutes les fonctionnalités', '#00ff9d',
 '{"cfp":"write","speakers":"write","onboarding":"write","sessions":"write","workshops":"write","volunteers":"write","registrations":"write","newsletter":"write","sponsors":"write","sponsor-pipeline":"write","budget":"write","logistics":"write","communication":"write","team":"write","export":"write","users":"write","prospection":"write","certificates":"write"}',
 true, NOW()),
('coordinateur_cfp', 'Coordinateur CFP', 'Gestion des soumissions, speakers et programme', '#cc00ff',
 '{"cfp":"write","speakers":"write","onboarding":"write","sessions":"read","workshops":"read","registrations":"read"}',
 true, NOW()),
('charge_communication', 'Chargé de Communication', 'Communication, réseaux sociaux et newsletter', '#0066ff',
 '{"communication":"write","newsletter":"write","speakers":"read","sessions":"read","sponsors":"read"}',
 true, NOW()),
('responsable_sponsors', 'Responsable Sponsors', 'Pipeline sponsors, packages et budget', '#ffaa00',
 '{"sponsors":"write","sponsor-pipeline":"write","budget":"write","prospection":"write","export":"read"}',
 true, NOW()),
('responsable_logistique', 'Responsable Logistique', 'Logistique, bénévoles et inscriptions', '#ff6600',
 '{"logistics":"write","volunteers":"write","registrations":"write","team":"write","export":"read"}',
 true, NOW()),
('observateur', 'Observateur', 'Lecture seule sur toutes les sections', '#888888',
 '{"cfp":"read","speakers":"read","sessions":"read","workshops":"read","volunteers":"read","registrations":"read","newsletter":"read","sponsors":"read","budget":"read","logistics":"read"}',
 true, NOW());
