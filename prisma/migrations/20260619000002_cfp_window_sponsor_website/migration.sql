-- CFP submission window: defer out-of-window submissions to a later edition
ALTER TABLE `cfp_submissions` ADD COLUMN `deferred` BOOLEAN NOT NULL DEFAULT false;

-- Sponsor prospect: website field
ALTER TABLE `sponsor_prospects` ADD COLUMN `website` VARCHAR(191) NULL;
