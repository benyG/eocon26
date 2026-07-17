-- Challenge Matrix alignment: replace the ad-hoc revelation/synthesis fields with
-- the bilingual structured brief (Location / Artifact / Context / Objective, EN+FR),
-- the on-solve revelation (EN+FR), the story arc and the linked entity.
ALTER TABLE `ctf_challenges`
  ADD COLUMN IF NOT EXISTS `fragmentName`  VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `storyArc`      VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `linkedEntity`  VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `locationEn`    TEXT NULL,
  ADD COLUMN IF NOT EXISTS `locationFr`    TEXT NULL,
  ADD COLUMN IF NOT EXISTS `artifactEn`    TEXT NULL,
  ADD COLUMN IF NOT EXISTS `artifactFr`    TEXT NULL,
  ADD COLUMN IF NOT EXISTS `contextEn`     TEXT NULL,
  ADD COLUMN IF NOT EXISTS `contextFr`     TEXT NULL,
  ADD COLUMN IF NOT EXISTS `objectiveEn`   TEXT NULL,
  ADD COLUMN IF NOT EXISTS `objectiveFr`   TEXT NULL,
  ADD COLUMN IF NOT EXISTS `revealEn`      TEXT NULL,
  ADD COLUMN IF NOT EXISTS `revealFr`      TEXT NULL,
  ADD COLUMN IF NOT EXISTS `techniqueNote` VARCHAR(191) NULL;

-- Obsolete after Option A (auto-declassification from CTFd solves; no synthesis challenges).
ALTER TABLE `ctf_challenges`
  DROP COLUMN IF EXISTS `revelation`,
  DROP COLUMN IF EXISTS `isSynthesis`,
  DROP COLUMN IF EXISTS `prerequisites`,
  DROP COLUMN IF EXISTS `successMessage`;

DROP TABLE IF EXISTS `revelation_unlocks`;
