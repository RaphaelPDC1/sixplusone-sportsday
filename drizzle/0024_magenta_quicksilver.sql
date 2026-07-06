CREATE TABLE `power_up_votes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`voterId` varchar(36) NOT NULL,
	`team` enum('red','blue','pink','orange') NOT NULL,
	`powerUpId` varchar(50) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `power_up_votes_id` PRIMARY KEY(`id`),
	CONSTRAINT `voter_power_up_idx` UNIQUE(`voterId`,`powerUpId`)
);
--> statement-breakpoint
CREATE TABLE `sd_attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`registrationId` varchar(36) NOT NULL,
	`team` enum('red','blue','pink','orange') NOT NULL,
	`present` boolean NOT NULL DEFAULT false,
	`markedAt` timestamp,
	`markedBy` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sd_attendance_id` PRIMARY KEY(`id`),
	CONSTRAINT `sd_attendance_registrationId_unique` UNIQUE(`registrationId`)
);
--> statement-breakpoint
CREATE TABLE `sd_invite_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(16) NOT NULL,
	`createdBy` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	`usedAt` timestamp,
	`usedByRegistrationId` varchar(36),
	`note` text,
	`maxUses` int NOT NULL DEFAULT 1,
	`useCount` int NOT NULL DEFAULT 0,
	CONSTRAINT `sd_invite_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `sd_invite_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `sd_power_up_votes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`powerUpId` int NOT NULL,
	`userId` int NOT NULL,
	`vote` boolean NOT NULL,
	`weight` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sd_power_up_votes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sd_power_ups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('boost','sabotage','block','double_down','all_in') NOT NULL,
	`ownerTeam` enum('red','blue','pink','orange') NOT NULL,
	`eventId` int NOT NULL,
	`status` enum('pending','active','resolved','blocked','failed') NOT NULL DEFAULT 'pending',
	`targetTeam` enum('red','blue','pink','orange'),
	`targetPlayerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `sd_power_ups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
DROP TABLE `event_schedule`;--> statement-breakpoint
DROP TABLE `leaderboard`;--> statement-breakpoint
DROP TABLE `sd_wildcard_votes`;--> statement-breakpoint
DROP TABLE `sd_wildcards`;--> statement-breakpoint
DROP TABLE `wildcard_votes`;--> statement-breakpoint
ALTER TABLE `sd_events` MODIFY COLUMN `status` enum('upcoming','armed','briefing','live','delayed','complete') NOT NULL DEFAULT 'upcoming';--> statement-breakpoint
ALTER TABLE `sports_day_settings` MODIFY COLUMN `earlyPrice` int NOT NULL DEFAULT 1500;--> statement-breakpoint
ALTER TABLE `sd_events` ADD `eventType` enum('male','female','mixed','team','finale');--> statement-breakpoint
ALTER TABLE `sd_events` ADD `format` enum('all-teams','head-to-head','bracket','relay','pairs');--> statement-breakpoint
ALTER TABLE `sd_events` ADD `competingTeams` varchar(100);--> statement-breakpoint
ALTER TABLE `sd_events` ADD `matchupLabel` varchar(100);--> statement-breakpoint
ALTER TABLE `sd_events` ADD `setupBufferMinutes` int DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `sports_day_registrations` DROP COLUMN `shopifyOrderId`;--> statement-breakpoint
ALTER TABLE `sports_day_registrations` DROP COLUMN `shopifyCustomerId`;--> statement-breakpoint
ALTER TABLE `sports_day_registrations` DROP COLUMN `shopifyOrderStatus`;