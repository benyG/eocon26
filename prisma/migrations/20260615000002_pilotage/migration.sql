-- TeamMember.email
ALTER TABLE `team_members` ADD COLUMN IF NOT EXISTS `email` VARCHAR(191) NULL;

-- SteeringTask
CREATE TABLE IF NOT EXISTS `steering_tasks` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` TEXT NOT NULL,
  `description` TEXT NULL,
  `phase` INT NOT NULL DEFAULT 1,
  `pole` VARCHAR(191) NOT NULL,
  `subTeam` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'todo',
  `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
  `assigneeName` VARCHAR(191) NULL,
  `assigneeEmail` VARCHAR(191) NULL,
  `dueDate` DATETIME(3) NULL,
  `isMilestone` BOOLEAN NOT NULL DEFAULT FALSE,
  `reminderStage` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `steering_tasks_phase_idx`(`phase`),
  INDEX `steering_tasks_status_idx`(`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- SteeringMeeting
CREATE TABLE IF NOT EXISTS `steering_meetings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL DEFAULT 'collective',
  `subTeam` VARCHAR(191) NULL,
  `scheduledAt` DATETIME(3) NOT NULL,
  `location` VARCHAR(191) NULL,
  `agenda` TEXT NULL,
  `attendees` TEXT NULL,
  `reminderStage` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
