-- Programming details captured when a session is scheduled in the calendar.
ALTER TABLE `sessions`
  ADD COLUMN `mode` VARCHAR(191) NULL,
  ADD COLUMN `zoomLink` VARCHAR(191) NULL,
  ADD COLUMN `slidesDeadline` VARCHAR(191) NULL;
