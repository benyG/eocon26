-- Cache generated AI content so it is not regenerated on every click.
ALTER TABLE `prospect_leads` ADD COLUMN IF NOT EXISTS `pitchJson` TEXT NULL;
ALTER TABLE `prospect_leads` ADD COLUMN IF NOT EXISTS `emailJson` TEXT NULL;
ALTER TABLE `sponsor_prospects` ADD COLUMN IF NOT EXISTS `emailJson` TEXT NULL;
