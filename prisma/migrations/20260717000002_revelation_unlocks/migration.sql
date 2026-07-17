-- Living Lore Bible: global unlock state for the 8 Revelation arcs.
CREATE TABLE IF NOT EXISTS `revelation_unlocks` (
  `arc` INT NOT NULL,
  `unlockedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `unlockedBy` VARCHAR(191) NULL,
  `unlockedVia` VARCHAR(191) NOT NULL DEFAULT 'key',
  PRIMARY KEY (`arc`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
