-- Merge ctfAccess into includesCTF, drop ctfAccess, add session/workshop access flags
UPDATE `ticket_types` SET `includesCTF` = (`includesCTF` = 1 OR `ctfAccess` = 1);
ALTER TABLE `ticket_types` DROP COLUMN IF EXISTS `ctfAccess`;
ALTER TABLE `ticket_types`
  ADD COLUMN IF NOT EXISTS `includesSessions`  TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `includesWorkshops` TINYINT(1) NOT NULL DEFAULT 0;
