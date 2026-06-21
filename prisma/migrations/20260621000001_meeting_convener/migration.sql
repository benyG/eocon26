-- Add convener fields to steering_meetings
ALTER TABLE `steering_meetings`
  ADD COLUMN IF NOT EXISTS `convenerEmail` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `convenerName` VARCHAR(255) NULL;
