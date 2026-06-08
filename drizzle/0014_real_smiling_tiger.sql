ALTER TABLE `sports_day_registrations` ADD `autoUnlockEventFired` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `autoUnlockedAt` timestamp;