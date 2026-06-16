CREATE TABLE `sd_event_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`team` enum('red','blue','pink','orange') NOT NULL,
	`placement` int,
	`basePoints` int,
	`finalPoints` int,
	`locked` boolean NOT NULL DEFAULT false,
	`lockedAt` timestamp,
	`lockedBy` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sd_event_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sd_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`arena` varchar(50),
	`blockNo` int,
	`startTime` varchar(10),
	`endTime` varchar(10),
	`status` enum('upcoming','armed','live','complete') NOT NULL DEFAULT 'upcoming',
	`wildcardsEnabled` boolean NOT NULL DEFAULT false,
	`pointsMultiplier` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sd_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sd_points_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`team` enum('red','blue','pink','orange') NOT NULL,
	`delta` int NOT NULL,
	`reason` enum('event_result','double_down','all_in','sabotage','admin_override') NOT NULL,
	`eventId` int,
	`actor` varchar(64) NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sd_points_log_id` PRIMARY KEY(`id`)
);
