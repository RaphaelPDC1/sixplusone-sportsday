CREATE TABLE `sports_day_sessions` (
	`id` varchar(64) NOT NULL,
	`registrationId` varchar(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `sports_day_sessions_id` PRIMARY KEY(`id`)
);
