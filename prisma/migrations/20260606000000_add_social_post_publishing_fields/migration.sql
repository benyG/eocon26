-- AlterTable
ALTER TABLE `social_posts` ADD COLUMN `imageUrl` VARCHAR(191) NULL,
    ADD COLUMN `scheduledAt` DATETIME(3) NULL,
    ADD COLUMN `publishedAt` DATETIME(3) NULL,
    ADD COLUMN `linkedinPostId` VARCHAR(191) NULL,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    ADD COLUMN `errorMessage` TEXT NULL;
