-- Repair migration: ensure all live-streaming tables and columns exist,
-- regardless of which statements from 20260626000001 actually ran.

-- ── registrations.live_token ──────────────────────────────────────────────────
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

SET @__rp1 = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'live_presences'
    AND CONSTRAINT_NAME = 'live_presences_registration_id_fkey'
);
SET @__rs1 = IF(@__rp1 = 0,
  'ALTER TABLE `live_presences` ADD CONSTRAINT `live_presences_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE __rpst1 FROM @__rs1; EXECUTE __rpst1; DEALLOCATE PREPARE __rpst1;

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

-- Ensure columns exist even if the table was created in a partial state
ALTER TABLE `streaming_rooms` ADD COLUMN IF NOT EXISTS `guest_link` VARCHAR(191) NULL;
ALTER TABLE `streaming_rooms` ADD COLUMN IF NOT EXISTS `jaas_room` VARCHAR(191) NULL;
ALTER TABLE `streaming_rooms` ADD COLUMN IF NOT EXISTS `sort_order` INTEGER NOT NULL DEFAULT 0;

-- ── session_plannings ─────────────────────────────────────────────────────────
-- session_id is NULL here (no DEFAULT possible for NOT NULL w/o value);
-- Prisma always supplies it on INSERT so no row will ever be NULL.
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

-- Unique index on session_id (conditional)
SET @__rp2 = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'session_plannings'
    AND INDEX_NAME = 'session_plannings_session_id_key'
);
SET @__rs2 = IF(@__rp2 = 0,
  'CREATE UNIQUE INDEX `session_plannings_session_id_key` ON `session_plannings`(`session_id`)',
  'SELECT 1'
);
PREPARE __rpst2 FROM @__rs2; EXECUTE __rpst2; DEALLOCATE PREPARE __rpst2;

-- FK: session_plannings → sessions (conditional)
SET @__rp3 = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'session_plannings'
    AND CONSTRAINT_NAME = 'session_plannings_session_id_fkey'
);
SET @__rs3 = IF(@__rp3 = 0,
  'ALTER TABLE `session_plannings` ADD CONSTRAINT `session_plannings_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE __rpst3 FROM @__rs3; EXECUTE __rpst3; DEALLOCATE PREPARE __rpst3;

-- FK: session_plannings → streaming_rooms (conditional)
SET @__rp4 = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'session_plannings'
    AND CONSTRAINT_NAME = 'session_plannings_room_id_fkey'
);
SET @__rs4 = IF(@__rp4 = 0,
  'ALTER TABLE `session_plannings` ADD CONSTRAINT `session_plannings_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `streaming_rooms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE __rpst4 FROM @__rs4; EXECUTE __rpst4; DEALLOCATE PREPARE __rpst4;
