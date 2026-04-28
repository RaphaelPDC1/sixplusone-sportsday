ALTER TABLE `awards_votes` ADD CONSTRAINT `voter_category_idx` UNIQUE(`voterId`,`category`);--> statement-breakpoint
ALTER TABLE `leaderboard` ADD CONSTRAINT `event_team_idx` UNIQUE(`eventName`,`team`);--> statement-breakpoint
ALTER TABLE `wildcard_votes` ADD CONSTRAINT `voter_wildcard_idx` UNIQUE(`voterId`,`wildcardId`);