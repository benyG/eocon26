-- AlterTable: add searchQuery to prospect_leads
ALTER TABLE `prospect_leads` ADD COLUMN IF NOT EXISTS `searchQuery` VARCHAR(191) NULL;
CREATE INDEX IF NOT EXISTS `prospect_leads_searchQuery_idx` ON `prospect_leads`(`searchQuery`);

-- CreateTable: supplier_offers
CREATE TABLE IF NOT EXISTS `supplier_offers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `supplier` VARCHAR(191) NOT NULL,
    `domain` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `amount` DOUBLE NULL,
    `paymentTerms` TEXT NULL,
    `pdfUrl` VARCHAR(191) NULL,
    `advantages` TEXT NULL,
    `risks` TEXT NULL,
    `comment` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `supplier_offers_domain_idx`(`domain`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
