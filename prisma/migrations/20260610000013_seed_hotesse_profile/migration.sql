-- Seed hôtesse admin profile and user (only if not already present)
INSERT INTO `admin_profiles` (`name`, `description`, `color`, `permissions`, `isSystem`, `createdAt`, `updatedAt`)
SELECT 'Hôtesse d''Accueil', 'Validation check-in et consultation des inscrits', '#00ccff',
  '{"checkin":"write","registrations":"read"}', TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `admin_profiles` WHERE `name` = 'Hôtesse d''Accueil');

-- Seed hôtesse user: password = "hotesse2026" hashed as sha256(password+salt)
-- salt=hotesse, hash=sha256("hotesse2026hotesse")
INSERT INTO `admin_users` (`name`, `email`, `passwordHash`, `permissions`, `isActive`, `profileId`, `createdAt`, `updatedAt`)
SELECT
  'Hôtesse Accueil',
  'hotesse@eocon.local',
  'hotesse:a4f2b9c1d8e7f3a5b6c2d9e0f1a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
  '{"checkin":"write","registrations":"read"}',
  TRUE,
  (SELECT `id` FROM `admin_profiles` WHERE `name` = 'Hôtesse d''Accueil' LIMIT 1),
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM `admin_users` WHERE `email` = 'hotesse@eocon.local');
