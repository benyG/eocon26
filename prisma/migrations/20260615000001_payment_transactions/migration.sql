CREATE TABLE IF NOT EXISTS `payment_transactions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `registrationId` INT NULL,
  `email` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(191) NULL,
  `provider` VARCHAR(191) NOT NULL,
  `amount` INT NOT NULL DEFAULT 0,
  `ticketType` VARCHAR(191) NULL,
  `state` VARCHAR(191) NOT NULL DEFAULT 'pending',
  `reason` VARCHAR(191) NULL,
  `providerRef` VARCHAR(191) NULL,
  `message` TEXT NULL,
  `ticketEmailSent` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `payment_transactions_registrationId_idx`(`registrationId`),
  INDEX `payment_transactions_state_idx`(`state`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
