-- CreateTable: admin_notifications
CREATE TABLE `admin_notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `recipient_email` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `ref_type` VARCHAR(191) NOT NULL,
    `ref_id` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admin_notifications_recipient_email_ref_type_ref_id_key`(`recipient_email`, `ref_type`, `ref_id`),
    INDEX `admin_notifications_recipient_email_read_at_idx`(`recipient_email`, `read_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
