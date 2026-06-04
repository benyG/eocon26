CREATE TABLE `ticket_types` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(191) NOT NULL,
  `nameFr` VARCHAR(191) NOT NULL,
  `nameEn` VARCHAR(191) NOT NULL,
  `priceFr` INTEGER NOT NULL DEFAULT 0,
  `priceEn` INTEGER NOT NULL DEFAULT 0,
  `perksFr` TEXT NOT NULL,
  `perksEn` TEXT NOT NULL,
  `earlyBirdPriceFr` INTEGER NULL,
  `earlyBirdPriceEn` INTEGER NULL,
  `earlyBirdUntil` DATETIME(3) NULL,
  `color` VARCHAR(191) NOT NULL DEFAULT '#00ff9d',
  `isFeatured` BOOLEAN NOT NULL DEFAULT false,
  `isVisible` BOOLEAN NOT NULL DEFAULT true,
  `maxCapacity` INTEGER NOT NULL DEFAULT 200,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ticket_types_slug_key` (`slug`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed default ticket types
INSERT INTO `ticket_types` (`slug`, `nameFr`, `nameEn`, `priceFr`, `priceEn`, `perksFr`, `perksEn`, `earlyBirdPriceFr`, `earlyBirdPriceEn`, `earlyBirdUntil`, `color`, `isFeatured`, `isVisible`, `maxCapacity`, `sortOrder`, `updatedAt`) VALUES
('student', 'Étudiant', 'Student', 5000, 10,
 '["Accès conférence","Sessions keynote","Networking","Certificate of attendance"]',
 '["Conference access","Keynote sessions","Networking","Certificate of attendance"]',
 NULL, NULL, NULL, '#888888', false, true, 150, 0, NOW()),
('standard', 'Standard', 'Standard', 20000, 35,
 '["Accès conférence","Tous les ateliers","Kit participant","Déjeuner inclus","Networking","Certificate of attendance"]',
 '["Conference access","All workshops","Participant kit","Lunch included","Networking","Certificate of attendance"]',
 15000, 25, '2026-09-30 23:59:59', '#00ff9d', true, true, 300, 1, NOW()),
('vip', 'VIP', 'VIP', 50000, 90,
 '["Accès complet","Table ronde speakers","Kit premium","Déjeuner & dîner de gala","Certificat officiel","Accès CTF EOCTF prioritaire"]',
 '["Full access","Speakers roundtable","Premium kit","Lunch & gala dinner","Official certificate","Priority CTF EOCTF access"]',
 NULL, NULL, NULL, '#ffaa00', false, true, 50, 2, NOW());
