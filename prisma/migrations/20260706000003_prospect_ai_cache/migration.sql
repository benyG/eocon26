ALTER TABLE `sponsor_prospects`
  ADD COLUMN `email_status` VARCHAR(191) NULL,
  ADD COLUMN `pitchJson` LONGTEXT NULL,
  ADD COLUMN `teaserJson` LONGTEXT NULL;
