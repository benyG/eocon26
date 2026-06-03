-- CreateTable
CREATE TABLE `cfp_submissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `org` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `talkTitle` VARCHAR(191) NOT NULL,
    `format` VARCHAR(191) NULL,
    `abstract` TEXT NOT NULL,
    `bio` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `notes` TEXT NULL,
    `decisionSentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `volunteer_applications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `role` VARCHAR(191) NULL,
    `experience` TEXT NULL,
    `motivation` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `assignedRole` VARCHAR(191) NULL,
    `shiftStart` DATETIME(3) NULL,
    `shiftEnd` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registrations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fname` VARCHAR(191) NOT NULL,
    `lname` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `org` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `ticketType` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `qrCode` VARCHAR(191) NULL,
    `checkedInAt` DATETIME(3) NULL,
    `checkedInBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `speakers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `company` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `bio` TEXT NOT NULL,
    `photoUrl` VARCHAR(191) NULL,
    `linkedin` VARCHAR(191) NULL,
    `twitter` VARCHAR(191) NULL,
    `talkTitle` VARCHAR(191) NULL,
    `talkAbstract` TEXT NULL,
    `talkFormat` VARCHAR(191) NULL,
    `isKeynote` BOOLEAN NOT NULL DEFAULT false,
    `edition` VARCHAR(191) NOT NULL DEFAULT '2026',
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sponsors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `logoUrl` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `tier` VARCHAR(191) NOT NULL,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` VARCHAR(191) NULL,
    `time` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `speakerName` VARCHAR(191) NULL,
    `room` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `displayFrom` DATETIME(3) NULL,
    `displayUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workshops` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `level` VARCHAR(191) NOT NULL,
    `duration` VARCHAR(191) NOT NULL DEFAULT '3h',
    `maxSeats` INTEGER NULL,
    `instructor` VARCHAR(191) NULL,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `bio` TEXT NULL,
    `photoUrl` VARCHAR(191) NULL,
    `linkedin` VARCHAR(191) NULL,
    `twitter` VARCHAR(191) NULL,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `past_speakers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `company` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `edition` VARCHAR(191) NULL,
    `photoUrl` VARCHAR(191) NULL,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `newsletter_subscribers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `newsletter_subscribers_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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

-- CreateTable
CREATE TABLE `admin_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admin_sessions_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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

-- CreateTable
CREATE TABLE `ticket_capacities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticketType` VARCHAR(191) NOT NULL,
    `maxCapacity` INTEGER NOT NULL DEFAULT 100,
    `alertPercent` INTEGER NOT NULL DEFAULT 80,

    UNIQUE INDEX `ticket_capacities_ticketType_key`(`ticketType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `admin_sessions` ADD CONSTRAINT `admin_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `admin_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `speaker_onboarding` ADD CONSTRAINT `speaker_onboarding_speakerId_fkey` FOREIGN KEY (`speakerId`) REFERENCES `speakers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

