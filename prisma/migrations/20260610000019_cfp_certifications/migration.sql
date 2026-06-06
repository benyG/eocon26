ALTER TABLE `cfp_submissions`
  ADD COLUMN IF NOT EXISTS `certifications` TEXT NULL;
