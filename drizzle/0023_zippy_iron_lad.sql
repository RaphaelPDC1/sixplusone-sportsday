ALTER TABLE `sports_day_settings` MODIFY COLUMN `earlyPrice` int NOT NULL DEFAULT 1500;--> statement-breakpoint
ALTER TABLE `sports_day_settings` ADD `globalUnlockCode` varchar(64);
