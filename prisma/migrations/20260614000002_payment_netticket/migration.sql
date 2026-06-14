-- TicketType: external payment provider mappings
ALTER TABLE `ticket_types`
  ADD COLUMN IF NOT EXISTS `netticketTicketId` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `stripeProductId` VARCHAR(191) NULL;

-- Registration: payment tracking
ALTER TABLE `registrations`
  ADD COLUMN IF NOT EXISTS `paymentProvider` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `paymentRef` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `paidAt` DATETIME(3) NULL;
