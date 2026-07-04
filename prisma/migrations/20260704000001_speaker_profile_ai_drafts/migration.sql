-- AlterTable
ALTER TABLE `speaker_profiles`
  ADD COLUMN `ai_draft_email` LONGTEXT NULL,
  ADD COLUMN `ai_draft_brief` LONGTEXT NULL;
