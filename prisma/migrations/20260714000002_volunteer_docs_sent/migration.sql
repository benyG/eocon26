-- Track which onboarding documents were emailed to each volunteer
ALTER TABLE `volunteer_applications` ADD COLUMN `docsSent` TEXT NULL;
