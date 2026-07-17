-- Special CTF publish capability (see prisma/schema.prisma AdminUser.canPublishCtf).
-- Holders are the only admins who may see/edit a challenge FLAG and
-- publish/unpublish/delete a challenge, independent of ctf-* read/write tabs.
ALTER TABLE `admin_users` ADD COLUMN `canPublishCtf` BOOLEAN NOT NULL DEFAULT false;
