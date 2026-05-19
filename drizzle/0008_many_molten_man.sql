CREATE TABLE `sports_day_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` varchar(50) NOT NULL,
	`earlyPrice` int DEFAULT 2500,
	`futurePrice` int DEFAULT 3500,
	`priceIncreaseAt` timestamp,
	`isPriceIncreaseActive` boolean DEFAULT false,
	`currentProductCheckoutUrl` text,
	`futureProductCheckoutUrl` text,
	`publicTeamRevealAt` timestamp,
	`topProductionCutoffAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sports_day_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `sports_day_settings_eventId_unique` UNIQUE(`eventId`)
);
--> statement-breakpoint
CREATE TABLE `unmatched_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` varchar(50) NOT NULL,
	`stripeCheckoutSessionId` varchar(100) NOT NULL,
	`stripePaymentIntentId` varchar(100),
	`paymentEmail` varchar(255) NOT NULL,
	`amountPaid` int NOT NULL,
	`currency` varchar(3) DEFAULT 'GBP',
	`metadata` json,
	`resolvedAt` timestamp,
	`resolvedBy` varchar(64),
	`resolvedRegistrationId` varchar(36),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `unmatched_payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `unmatched_payments_stripeCheckoutSessionId_unique` UNIQUE(`stripeCheckoutSessionId`)
);
--> statement-breakpoint
ALTER TABLE `group_codes` MODIFY COLUMN `code` varchar(15) NOT NULL;--> statement-breakpoint
ALTER TABLE `group_codes` MODIFY COLUMN `createdBy` varchar(50);--> statement-breakpoint
ALTER TABLE `sports_day_registrations` MODIFY COLUMN `groupCode` varchar(15);--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `unlockToken` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `stripeCheckoutSessionId` varchar(100);--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `stripePaymentIntentId` varchar(100);--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `paymentEmail` varchar(255);--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `paymentMatchStatus` enum('matched_by_token','matched_by_id','matched_by_email','unmatched','none') DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `manualUnlock` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `manuallyUnlockedBy` varchar(64);--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `manualUnlockReason` text;--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `manuallyUnlockedAt` timestamp;--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD CONSTRAINT `sports_day_registrations_unlockToken_unique` UNIQUE(`unlockToken`);