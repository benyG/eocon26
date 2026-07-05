-- SteeringMeeting: convener fields + recurrence support
ALTER TABLE `steering_meetings`
  ADD COLUMN IF NOT EXISTS `convenerEmail` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `convenerName`  VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `recurrence`    VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `recurrenceEnd` DATETIME(3)  NULL;
