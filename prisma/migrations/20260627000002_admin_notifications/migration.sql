-- CreateTable: admin_notifications
CREATE TABLE IF NOT EXISTS `admin_notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `recipientEmail` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `refType` VARCHAR(191) NOT NULL,
    `refId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admin_notifications_recipientEmail_refType_refId_key`(`recipientEmail`, `refType`, `refId`),
    INDEX `admin_notifications_recipientEmail_readAt_idx`(`recipientEmail`, `readAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
