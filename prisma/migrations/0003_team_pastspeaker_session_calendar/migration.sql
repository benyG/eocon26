-- Add calendar fields to sessions
ALTER TABLE `sessions`
  ADD COLUMN `date` VARCHAR(10) NULL,
  ADD COLUMN `endTime` VARCHAR(10) NULL,
  ADD COLUMN `displayFrom` DATETIME NULL,
  ADD COLUMN `displayUntil` DATETIME NULL;

-- Team members
CREATE TABLE `team_members` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `role` VARCHAR(191) NOT NULL,
  `bio` TEXT NULL,
  `photoUrl` VARCHAR(191) NULL,
  `linkedin` VARCHAR(191) NULL,
  `twitter` VARCHAR(191) NULL,
  `isVisible` BOOLEAN NOT NULL DEFAULT TRUE,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Past speakers
CREATE TABLE `past_speakers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `role` VARCHAR(191) NOT NULL,
  `company` VARCHAR(191) NULL,
  `country` VARCHAR(191) NULL,
  `edition` VARCHAR(191) NULL,
  `photoUrl` VARCHAR(191) NULL,
  `isVisible` BOOLEAN NOT NULL DEFAULT TRUE,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
