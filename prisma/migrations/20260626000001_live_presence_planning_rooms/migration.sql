-- Add liveToken to registrations
ALTER TABLE `registrations` ADD COLUMN `live_token` VARCHAR(191) NULL;
ALTER TABLE `registrations` ADD UNIQUE INDEX `registrations_live_token_key`(`live_token`);

-- Create live_presences table
CREATE TABLE `live_presences` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `live_token` VARCHAR(191) NOT NULL,
    `registration_id` INTEGER NOT NULL,
    `total_minutes` INTEGER NOT NULL DEFAULT 0,
    `last_heartbeat` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `live_presences_live_token_key`(`live_token`),
    UNIQUE INDEX `live_presences_registration_id_key`(`registration_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add foreign key for live_presences
ALTER TABLE `live_presences` ADD CONSTRAINT `live_presences_registration_id_fkey`
    FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Create streaming_rooms table
CREATE TABLE `streaming_rooms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `guest_link` VARCHAR(191) NULL,
    `jaas_room` VARCHAR(191) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create session_plannings table
CREATE TABLE `session_plannings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `session_id` INTEGER NOT NULL,
    `room_id` INTEGER NULL,
    `lien_webinaire` VARCHAR(191) NULL,
    `lien_live` VARCHAR(191) NULL,
    `restream_event_id` VARCHAR(191) NULL,
    `technicien_ids` JSON NOT NULL DEFAULT ('[]'),
    `moderateur_ids` JSON NOT NULL DEFAULT ('[]'),
    `panelistes_extra` JSON NOT NULL DEFAULT ('[]'),
    `notified_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `session_plannings_session_id_key`(`session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add foreign keys for session_plannings
ALTER TABLE `session_plannings` ADD CONSTRAINT `session_plannings_session_id_fkey`
    FOREIGN KEY (`session_id`) REFERENCES `conference_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `session_plannings` ADD CONSTRAINT `session_plannings_room_id_fkey`
    FOREIGN KEY (`room_id`) REFERENCES `streaming_rooms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
