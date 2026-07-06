CREATE TABLE `document_templates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `docKey` VARCHAR(191) NOT NULL,
  `nameFr` VARCHAR(191) NOT NULL,
  `nameEn` VARCHAR(191) NOT NULL,
  `bodyFr` LONGTEXT NOT NULL,
  `bodyEn` LONGTEXT NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `document_templates_docKey_key`(`docKey`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
