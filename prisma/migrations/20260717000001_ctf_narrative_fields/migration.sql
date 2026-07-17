-- Narrative layer for CTF challenges (The Convergence): fragment codes, revelation
-- arc tags, Prime Seal / synthesis markers, synthesis prerequisites, success message
-- and the CTFd static flag. All editable from the admin CTF panel.
ALTER TABLE `ctf_challenges`
  ADD COLUMN IF NOT EXISTS `fragmentCode` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `revelation` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `isPrimeSeal` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS `isSynthesis` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS `prerequisites` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `successMessage` TEXT NULL,
  ADD COLUMN IF NOT EXISTS `flag` VARCHAR(191) NULL;
