CREATE TABLE `awards_votes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`voterId` varchar(36) NOT NULL,
	`nomineeId` varchar(36) NOT NULL,
	`category` enum('mvp','funniest_moment','most_dramatic','best_dressed','most_competitive','biggest_surprise','team_player') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `awards_votes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leaderboard` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventName` varchar(100) NOT NULL,
	`team` enum('red','blue','pink','orange') NOT NULL,
	`position` int,
	`points` int DEFAULT 0,
	`dnf` boolean DEFAULT false,
	`notes` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` varchar(64),
	CONSTRAINT `leaderboard_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profile_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`registrationId` varchar(36) NOT NULL,
	`storageKey` text NOT NULL,
	`url` text NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `profile_photos_id` PRIMARY KEY(`id`),
	CONSTRAINT `profile_photos_registrationId_unique` UNIQUE(`registrationId`)
);
--> statement-breakpoint
CREATE TABLE `wildcard_votes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`voterId` varchar(36) NOT NULL,
	`team` enum('red','blue','pink','orange') NOT NULL,
	`wildcardId` varchar(50) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wildcard_votes_id` PRIMARY KEY(`id`)
);
