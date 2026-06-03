-- AlterTable: CFPSubmission
ALTER TABLE `cfp_submissions` ADD COLUMN `notes` TEXT NULL,
                               ADD COLUMN `decisionSentAt` DATETIME(3) NULL;

-- AlterTable: Registration
ALTER TABLE `registrations` ADD COLUMN `qrCode` VARCHAR(191) NULL,
                             ADD COLUMN `checkedInAt` DATETIME(3) NULL,
                             ADD COLUMN `checkedInBy` VARCHAR(191) NULL;

-- AlterTable: VolunteerApplication
ALTER TABLE `volunteer_applications` ADD COLUMN `assignedRole` VARCHAR(191) NULL,
                                      ADD COLUMN `shiftStart` DATETIME(3) NULL,
                                      ADD COLUMN `shiftEnd` DATETIME(3) NULL;

-- CreateTable: AdminUser
CREATE TABLE `admin_users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `permissions` TEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admin_users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: AdminSession
CREATE TABLE `admin_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admin_sessions_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: SpeakerOnboarding
CREATE TABLE `speaker_onboarding` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `speakerId` INTEGER NOT NULL,
    `selectionMailSent` BOOLEAN NOT NULL DEFAULT false,
    `modalitiesMailSent` BOOLEAN NOT NULL DEFAULT false,
    `timingMailSent` BOOLEAN NOT NULL DEFAULT false,
    `bioReceived` BOOLEAN NOT NULL DEFAULT false,
    `photoReceived` BOOLEAN NOT NULL DEFAULT false,
    `slidesReceived` BOOLEAN NOT NULL DEFAULT false,
    `transportArranged` BOOLEAN NOT NULL DEFAULT false,
    `accommodationDone` BOOLEAN NOT NULL DEFAULT false,
    `agreementSigned` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `speaker_onboarding_speakerId_key`(`speakerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: TicketCapacity
CREATE TABLE `ticket_capacities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticketType` VARCHAR(191) NOT NULL,
    `maxCapacity` INTEGER NOT NULL DEFAULT 100,
    `alertPercent` INTEGER NOT NULL DEFAULT 80,

    UNIQUE INDEX `ticket_capacities_ticketType_key`(`ticketType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey: AdminSession -> AdminUser
ALTER TABLE `admin_sessions` ADD CONSTRAINT `admin_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `admin_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: SpeakerOnboarding -> Speaker
ALTER TABLE `speaker_onboarding` ADD CONSTRAINT `speaker_onboarding_speakerId_fkey` FOREIGN KEY (`speakerId`) REFERENCES `speakers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
