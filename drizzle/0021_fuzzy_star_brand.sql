CREATE TABLE `sd_roster_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`playerId` int NOT NULL,
	`originalTeam` enum('red','blue','pink','orange') NOT NULL,
	`competingTeam` enum('red','blue','pink','orange') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sd_roster_overrides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sd_team_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('captain','vice_captain','member') NOT NULL DEFAULT 'member',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sd_team_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sd_teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` enum('red','blue','pink','orange') NOT NULL,
	`captainUserId` int,
	`viceCaptainUserId` int,
	`cardsRemaining` int NOT NULL DEFAULT 3,
	`pointsTotal` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sd_teams_id` PRIMARY KEY(`id`),
	CONSTRAINT `sd_teams_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `sd_wildcard_votes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wildcardId` int NOT NULL,
	`userId` int NOT NULL,
	`vote` boolean NOT NULL,
	`weight` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sd_wildcard_votes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sd_wildcards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('steal','sabotage','block','double_down','all_in') NOT NULL,
	`ownerTeam` enum('red','blue','pink','orange') NOT NULL,
	`eventId` int NOT NULL,
	`status` enum('pending','active','resolved','blocked','failed') NOT NULL DEFAULT 'pending',
	`targetTeam` enum('red','blue','pink','orange'),
	`targetPlayerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `sd_wildcards_id` PRIMARY KEY(`id`)
);
