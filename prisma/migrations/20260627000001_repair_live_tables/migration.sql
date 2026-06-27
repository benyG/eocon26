-- Repair migration: fills in any columns or tables that may be missing due to
-- partial execution of 20260626000001 on the existing production database.
-- Safe to run on a fresh DB (all statements become no-ops via IF NOT EXISTS).
-- No FK constraints here — avoids duplicate-constraint errors when they were
-- already added by 20260626000001.

-- ── registrations ────────────────────────────────────────────────────────────
ALTER TABLE `registrations` ADD COLUMN IF NOT EXISTS `live_token` VARCHAR(191) NULL;
CREATE UNIQUE INDEX IF NOT EXISTS `registrations_live_token_key` ON `registrations`(`live_token`);

-- ── live_presences ────────────────────────────────────────────────────────────
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

-- ── streaming_rooms ───────────────────────────────────────────────────────────
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

ALTER TABLE `streaming_rooms` ADD COLUMN IF NOT EXISTS `guest_link` VARCHAR(191) NULL;
ALTER TABLE `streaming_rooms` ADD COLUMN IF NOT EXISTS `jaas_room` VARCHAR(191) NULL;
ALTER TABLE `streaming_rooms` ADD COLUMN IF NOT EXISTS `sort_order` INTEGER NOT NULL DEFAULT 0;

-- ── session_plannings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `session_plannings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `session_id` INTEGER NULL,
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
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `session_plannings` ADD COLUMN IF NOT EXISTS `session_id` INTEGER NULL;
ALTER TABLE `session_plannings` ADD COLUMN IF NOT EXISTS `room_id` INTEGER NULL;
ALTER TABLE `session_plannings` ADD COLUMN IF NOT EXISTS `lien_webinaire` VARCHAR(191) NULL;
ALTER TABLE `session_plannings` ADD COLUMN IF NOT EXISTS `lien_live` VARCHAR(191) NULL;
ALTER TABLE `session_plannings` ADD COLUMN IF NOT EXISTS `restream_event_id` VARCHAR(191) NULL;
ALTER TABLE `session_plannings` ADD COLUMN IF NOT EXISTS `technicien_ids` JSON NULL;
ALTER TABLE `session_plannings` ADD COLUMN IF NOT EXISTS `moderateur_ids` JSON NULL;
ALTER TABLE `session_plannings` ADD COLUMN IF NOT EXISTS `panelistes_extra` JSON NULL;
ALTER TABLE `session_plannings` ADD COLUMN IF NOT EXISTS `notified_at` DATETIME(3) NULL;
