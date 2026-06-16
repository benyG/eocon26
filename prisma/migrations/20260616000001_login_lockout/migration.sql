-- Account lockout after repeated failed logins.
ALTER TABLE `admin_users` ADD COLUMN IF NOT EXISTS `failedLoginCount` INT NOT NULL DEFAULT 0;
ALTER TABLE `admin_users` ADD COLUMN IF NOT EXISTS `lockedUntil` DATETIME(3) NULL;
