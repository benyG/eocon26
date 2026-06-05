-- Seed past speakers from hardcoded fallback data (only if table is empty)
INSERT INTO `past_speakers` (`name`, `role`, `company`, `country`, `edition`, `photoUrl`, `isVisible`, `sortOrder`, `createdAt`)
SELECT * FROM (
  SELECT 'Abene Bertin' AS n, 'Sr. Information Security Architect' AS r, NULL AS co, 'Canada' AS ct, NULL AS ed, NULL AS pu, TRUE AS iv, 10 AS so, NOW() AS ca
  UNION ALL SELECT 'Chioma Chigozie-Okwum', 'Director, Spiritan University', NULL, 'Nigeria', NULL, NULL, TRUE, 20, NOW()
  UNION ALL SELECT 'Simon Nolet', 'Spécialiste Sécurité Offensive', NULL, 'Canada', NULL, NULL, TRUE, 30, NOW()
  UNION ALL SELECT 'Bernard Wanyama', 'President, ISACA Kampala', NULL, 'Uganda', NULL, NULL, TRUE, 40, NOW()
  UNION ALL SELECT 'Shruti Kalsi', 'Director at EY-Parthenon', NULL, 'India', NULL, NULL, TRUE, 50, NOW()
  UNION ALL SELECT 'Tomslin Samme-Nlar', 'CEO CyberDefenz, Pentester', NULL, 'Cameroon', NULL, NULL, TRUE, 60, NOW()
  UNION ALL SELECT 'Kevin Monkam', 'Information Security Architect', NULL, 'France', NULL, NULL, TRUE, 70, NOW()
  UNION ALL SELECT 'Honoré Tapoko', 'Sr. Cybersecurity Engineer', NULL, 'United States', NULL, NULL, TRUE, 80, NOW()
  UNION ALL SELECT 'Blay Abu Safian', 'CEO of Inveteck Global', NULL, 'Ghana', NULL, NULL, TRUE, 90, NOW()
  UNION ALL SELECT 'Isaac Noumba', 'Security Product Manager at F5', NULL, 'United States', NULL, NULL, TRUE, 100, NOW()
  UNION ALL SELECT 'Sagar Tiwari', 'Independent OSINT Researcher', NULL, 'Australia', NULL, NULL, TRUE, 110, NOW()
  UNION ALL SELECT 'Stephen Pullum', 'Founder Africurity', NULL, 'United States', NULL, NULL, TRUE, 120, NOW()
) AS data(n, r, co, ct, ed, pu, iv, so, ca)
WHERE NOT EXISTS (SELECT 1 FROM `past_speakers` LIMIT 1);
