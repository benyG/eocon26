-- Bilingual email templates + campaign template reference

-- EmailTemplate: add EN versions (existing subject/htmlBody = FR primary)
ALTER TABLE `email_templates`
  ADD COLUMN `subjectEn` VARCHAR(191) NULL,
  ADD COLUMN `htmlBodyEn` LONGTEXT NULL;

-- Campaign: link to source template + snapshot EN content for history integrity
ALTER TABLE `campaigns`
  ADD COLUMN `templateId` INT NULL,
  ADD COLUMN `subjectEn` VARCHAR(191) NULL,
  ADD COLUMN `htmlBodyEn` LONGTEXT NULL;

CREATE INDEX `campaigns_templateId_idx` ON `campaigns`(`templateId`);
