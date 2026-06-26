-- Add liveToken to registrations
ALTER TABLE `registrations` ADD COLUMN IF NOT EXISTS `live_token` VARCHAR(191) NULL;
CREATE UNIQUE INDEX IF NOT EXISTS `registrations_live_token_key` ON `registrations`(`live_token`);

-- Create live_presences table
CREATE TABLE IF NOT EXISTS `live_presences` (
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

-- Add FK for live_presences (conditional — safe to re-run)
SET @__fk1 = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'live_presences'
    AND CONSTRAINT_NAME = 'live_presences_registration_id_fkey'
);
SET @__sql1 = IF(@__fk1 = 0,
  'ALTER TABLE `live_presences` ADD CONSTRAINT `live_presences_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE __stmt1 FROM @__sql1;
EXECUTE __stmt1;
DEALLOCATE PREPARE __stmt1;

-- Create streaming_rooms table
CREATE TABLE IF NOT EXISTS `streaming_rooms` (
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
-- JSON cols are NULL (no DEFAULT) — compatible with all MySQL 8.x versions;
-- Prisma always supplies [] on insert so rows will never actually be NULL.
CREATE TABLE IF NOT EXISTS `session_plannings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `session_id` INTEGER NOT NULL,
    `room_id` INTEGER NULL,
    `lien_webinaire` VARCHAR(191) NULL,
    `lien_live` VARCHAR(191) NULL,
    `restream_event_id` VARCHAR(191) NULL,
    `technicien_ids` JSON NULL,
    `moderateur_ids` JSON NULL,
    `panelistes_extra` JSON NULL,
    `notified_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `session_plannings_session_id_key`(`session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add FK: session_plannings → conference_sessions (conditional)
SET @__fk2 = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'session_plannings'
    AND CONSTRAINT_NAME = 'session_plannings_session_id_fkey'
);
SET @__sql2 = IF(@__fk2 = 0,
  'ALTER TABLE `session_plannings` ADD CONSTRAINT `session_plannings_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `conference_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE __stmt2 FROM @__sql2;
EXECUTE __stmt2;
DEALLOCATE PREPARE __stmt2;

-- Add FK: session_plannings → streaming_rooms (conditional)
SET @__fk3 = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'session_plannings'
    AND CONSTRAINT_NAME = 'session_plannings_room_id_fkey'
);
SET @__sql3 = IF(@__fk3 = 0,
  'ALTER TABLE `session_plannings` ADD CONSTRAINT `session_plannings_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `streaming_rooms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE __stmt3 FROM @__sql3;
EXECUTE __stmt3;
DEALLOCATE PREPARE __stmt3;
