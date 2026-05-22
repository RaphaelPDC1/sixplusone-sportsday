ALTER TABLE `group_codes` MODIFY COLUMN `code` varchar(15) NOT NULL;--> statement-breakpoint
ALTER TABLE `group_codes` MODIFY COLUMN `createdBy` varchar(50);--> statement-breakpoint
ALTER TABLE `sports_day_registrations` MODIFY COLUMN `groupCode` varchar(15);--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `topName` varchar(32);--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `topNameLastEditedAt` timestamp;--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `topNameLockedAt` timestamp;--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `shopifyOrderStatus` enum('pending_configuration','created','failed');