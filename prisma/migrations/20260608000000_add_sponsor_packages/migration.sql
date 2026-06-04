-- CreateTable
CREATE TABLE `sponsor_packages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tier` VARCHAR(191) NOT NULL,
    `nameFr` VARCHAR(191) NOT NULL,
    `nameEn` VARCHAR(191) NOT NULL,
    `price` INTEGER NOT NULL,
    `maxSponsors` INTEGER NOT NULL DEFAULT 1,
    `perks` TEXT NOT NULL,
    `perksFr` TEXT NOT NULL,
    `perksEn` TEXT NOT NULL,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `highlightColor` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sponsor_packages_tier_key`(`tier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
