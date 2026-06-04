CREATE TABLE `audit_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `actor` VARCHAR(120) NOT NULL DEFAULT 'admin',
  `ip` VARCHAR(45) NULL,
  `action` VARCHAR(50) NOT NULL,
  `resource` VARCHAR(50) NOT NULL,
  `resourceId` VARCHAR(50) NULL,
  `details` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `audit_logs_createdAt_idx` (`createdAt`),
  INDEX `audit_logs_resource_idx` (`resource`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
