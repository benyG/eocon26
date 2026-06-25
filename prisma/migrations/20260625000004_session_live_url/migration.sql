-- Add public live URL field to conference sessions
ALTER TABLE `sessions` ADD COLUMN `live_url` VARCHAR(512) NULL;
