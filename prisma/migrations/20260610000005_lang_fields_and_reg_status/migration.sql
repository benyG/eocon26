-- Add lang fields to forms
ALTER TABLE `cfp_submissions` ADD COLUMN `langPresentation` VARCHAR(10) DEFAULT 'fr';
ALTER TABLE `volunteer_applications` ADD COLUMN `langExpression` VARCHAR(10) DEFAULT 'fr';
ALTER TABLE `registrations` ADD COLUMN `langExpression` VARCHAR(10) DEFAULT 'fr';
