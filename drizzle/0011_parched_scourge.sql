ALTER TABLE `sports_day_registrations` ADD `popupCopyFirstVisit` text;--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `popupCopyReturnVisit` text;--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `popupCopyGeneratedAt` timestamp;--> statement-breakpoint
ALTER TABLE `sports_day_settings` ADD `popupsEnabled` boolean DEFAULT false;