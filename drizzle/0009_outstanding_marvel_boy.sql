CREATE TABLE `sports_day_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`earlyPrice` int NOT NULL DEFAULT 2500,
	`futurePrice` int NOT NULL DEFAULT 3500,
	`priceIncreaseAt` timestamp,
	`publicTeamRevealAt` timestamp,
	`topProductionCutoffAt` timestamp,
	`isPriceIncreaseActive` boolean DEFAULT false,
	`isPublicRevealActive` boolean DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sports_day_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `unmatched_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`stripePaymentIntentId` varchar(100),
	`stripeCheckoutSessionId` varchar(100),
	`stripeEventId` varchar(100),
	`stripeEventType` varchar(100),
	`amountPaid` int,
	`currency` varchar(10),
	`paymentEmail` varchar(255),
	`paymentName` varchar(255),
	`metaUnlockToken` varchar(100),
	`metaRegistrationId` varchar(36),
	`metaRegisteredEmail` varchar(255),
	`metaPlayerName` varchar(255),
	`metaTopName` varchar(32),
	`resolvedAt` timestamp,
	`resolvedBy` varchar(64),
	`resolvedRegistrationId` varchar(36),
	`resolutionNote` text,
	CONSTRAINT `unmatched_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `unlockToken` varchar(36);--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `stripeCheckoutSessionId` varchar(100);--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `stripePaymentIntentId` varchar(100);--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `paymentEmail` varchar(255);--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `paymentMatchStatus` enum('none','matched_by_token','matched_by_id','matched_by_email','unmatched') DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `manualUnlock` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `manuallyUnlockedBy` varchar(64);--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `manualUnlockReason` text;--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `manuallyUnlockedAt` timestamp;--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD CONSTRAINT `sports_day_registrations_unlockToken_unique` UNIQUE(`unlockToken`);