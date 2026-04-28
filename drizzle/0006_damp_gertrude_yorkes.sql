CREATE TABLE `event_schedule` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventName` varchar(100) NOT NULL,
	`startTime` varchar(10),
	`endTime` varchar(10),
	`location` varchar(200),
	`description` text,
	`sortOrder` int DEFAULT 0,
	`isLive` boolean DEFAULT false,
	`isCompleted` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `event_schedule_id` PRIMARY KEY(`id`)
);
