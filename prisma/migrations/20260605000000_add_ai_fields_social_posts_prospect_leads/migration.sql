-- AlterTable
ALTER TABLE `cfp_submissions` ADD COLUMN `aiScore` DOUBLE NULL,
    ADD COLUMN `aiAnalysis` TEXT NULL;

-- CreateTable
CREATE TABLE `social_posts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `brief` TEXT NOT NULL,
    `platform` VARCHAR(191) NOT NULL,
    `lang` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prospect_leads` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `source` VARCHAR(191) NOT NULL DEFAULT 'manual',
    `org` VARCHAR(191) NOT NULL,
    `sector` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `contactName` VARCHAR(191) NULL,
    `contactTitle` VARCHAR(191) NULL,
    `contactEmail` VARCHAR(191) NULL,
    `contactLinkedin` VARCHAR(191) NULL,
    `aiScore` DOUBLE NULL,
    `aiScoreReason` TEXT NULL,
    `recommendedPackage` VARCHAR(191) NULL,
    `addedToPipeline` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
