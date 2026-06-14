-- TicketType: external payment provider mappings
ALTER TABLE `ticket_types` ADD COLUMN `netticketTicketId` VARCHAR(191) NULL;
ALTER TABLE `ticket_types` ADD COLUMN `stripeProductId` VARCHAR(191) NULL;

-- Registration: payment tracking
ALTER TABLE `registrations` ADD COLUMN `paymentProvider` VARCHAR(191) NULL;
ALTER TABLE `registrations` ADD COLUMN `paymentRef` VARCHAR(191) NULL;
ALTER TABLE `registrations` ADD COLUMN `paidAt` DATETIME(3) NULL;
