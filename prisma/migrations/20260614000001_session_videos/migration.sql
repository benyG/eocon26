CREATE TABLE IF NOT EXISTS `session_videos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(191) NOT NULL,
  `titleEn` VARCHAR(191) NULL,
  `description` TEXT NULL,
  `descriptionEn` TEXT NULL,
  `youtubeUrl` VARCHAR(191) NOT NULL,
  `thumbnailUrl` VARCHAR(191) NULL,
  `speaker` VARCHAR(191) NULL,
  `edition` VARCHAR(191) NOT NULL DEFAULT '2025',
  `category` VARCHAR(191) NULL,
  `isVisible` BOOLEAN NOT NULL DEFAULT TRUE,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
