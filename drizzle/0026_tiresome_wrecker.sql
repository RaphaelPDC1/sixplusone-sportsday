CREATE TABLE `sd_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`uploaderName` varchar(255) NOT NULL,
	`uploaderTeam` enum('red','blue','pink','orange') NOT NULL,
	`caption` varchar(280),
	`hidden` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sd_photos_id` PRIMARY KEY(`id`)
);
