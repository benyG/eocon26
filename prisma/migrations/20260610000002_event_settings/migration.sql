CREATE TABLE `event_settings` (
  `key` VARCHAR(191) NOT NULL,
  `value` TEXT NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `event_settings` (`key`, `value`, `updatedAt`) VALUES
('event_date', '2026-11-28', NOW()),
('event_date_display_fr', '28 novembre 2026', NOW()),
('event_date_display_en', 'November 28, 2026', NOW()),
('event_venue', 'Hotel Onomo', NOW()),
('event_city', 'Douala', NOW()),
('event_country', 'Cameroun', NOW()),
('event_address', 'Hotel Onomo, Boulevard de la Liberté, Douala, Cameroun', NOW()),
('event_time_start', '08:00', NOW()),
('event_edition', '7', NOW()),
('site_base_url', 'https://eyesopensecurity.com', NOW()),
('url_inscription', 'https://eyesopensecurity.com/#inscription', NOW()),
('url_cfp', 'https://eyesopensecurity.com/#cfp', NOW()),
('url_benevoles', 'https://eyesopensecurity.com/#benevoles', NOW()),
('url_programme', 'https://eyesopensecurity.com/#programme', NOW()),
('url_ctf', 'https://eyesopensecurity.com/#ctf', NOW());
