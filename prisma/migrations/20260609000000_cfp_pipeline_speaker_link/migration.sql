-- CFPSubmission: add pipelineStage + link to Speaker
ALTER TABLE `cfp_submissions` ADD COLUMN `pipelineStage` VARCHAR(191) NOT NULL DEFAULT 'submitted';
ALTER TABLE `cfp_submissions` ADD COLUMN `speakerId` INTEGER NULL;
ALTER TABLE `cfp_submissions` ADD CONSTRAINT `cfp_submissions_speakerId_key` UNIQUE (`speakerId`);
ALTER TABLE `cfp_submissions` ADD CONSTRAINT `cfp_submissions_speaker_fk` FOREIGN KEY (`speakerId`) REFERENCES `speakers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Speaker: add onboardingStatus
ALTER TABLE `speakers` ADD COLUMN `onboardingStatus` VARCHAR(191) NULL DEFAULT 'pending';

-- ConferenceSession: add speakerId FK
ALTER TABLE `sessions` ADD COLUMN `speakerId` INTEGER NULL;
