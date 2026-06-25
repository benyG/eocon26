-- Add Mailchimp-compatible fields to newsletter_subscribers
ALTER TABLE `newsletter_subscribers`
  ADD COLUMN IF NOT EXISTS `firstName`  VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `lastName`   VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `phone`      VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS `profession` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `company`    VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `twitter`    VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `linkedin`   VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS `source`     VARCHAR(50)  NULL DEFAULT 'form';
