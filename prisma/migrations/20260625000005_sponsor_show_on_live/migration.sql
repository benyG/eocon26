-- Add showOnLive flag to sponsors for live page banner
ALTER TABLE `sponsors` ADD COLUMN `show_on_live` BOOLEAN NOT NULL DEFAULT false;
