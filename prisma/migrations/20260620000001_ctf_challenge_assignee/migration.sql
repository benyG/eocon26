-- Add assignee fields to CTF challenges so each can be owned by a team member.
ALTER TABLE `ctf_challenges`
  ADD COLUMN `assigneeName` VARCHAR(191) NULL,
  ADD COLUMN `assigneeEmail` VARCHAR(191) NULL;
