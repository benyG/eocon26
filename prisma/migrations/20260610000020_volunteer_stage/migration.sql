ALTER TABLE `volunteer_applications`
  ADD COLUMN IF NOT EXISTS `volunteerStage` VARCHAR(191) NOT NULL DEFAULT 'submitted';
