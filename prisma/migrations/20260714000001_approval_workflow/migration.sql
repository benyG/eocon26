-- AdminUser: validation-constraint flags
ALTER TABLE `admin_users`
  ADD COLUMN `requiresApproval` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `isCommApprover` BOOLEAN NOT NULL DEFAULT false;

-- Approval requests raised when a constrained admin schedules/publishes a post
-- or sends a campaign.
CREATE TABLE `approval_requests` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `kind` VARCHAR(20) NOT NULL,
  `action` VARCHAR(20) NOT NULL,
  `targetType` VARCHAR(20) NOT NULL,
  `targetId` INTEGER NOT NULL,
  `title` TEXT NOT NULL,
  `payload` TEXT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
  `requestedBy` VARCHAR(191) NOT NULL,
  `reviewedBy` VARCHAR(191) NULL,
  `reviewedAt` DATETIME(3) NULL,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `approval_requests_status_idx`(`status`),
  INDEX `approval_requests_targetType_targetId_idx`(`targetType`, `targetId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
