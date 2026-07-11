ALTER TABLE `power_up_votes` ADD `targetTeam` enum('red','blue','pink','orange');--> statement-breakpoint
ALTER TABLE `power_up_votes` ADD `counterBlockOf` int;--> statement-breakpoint
ALTER TABLE `power_up_votes` ADD `isInitiation` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `power_up_votes` ADD `presentCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `power_up_votes` ADD `status` enum('pending','activated','cancelled') DEFAULT 'pending' NOT NULL;