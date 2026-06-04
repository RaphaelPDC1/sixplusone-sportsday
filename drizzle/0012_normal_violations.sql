ALTER TABLE `sports_day_registrations` ADD `operationalConsent` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `operationalConsentReason` text;--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `operationalConsentSource` varchar(100);--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `operationalConsentCapturedAt` timestamp;--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `marketingConsent` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `sports_day_registrations` ADD `marketingConsentCapturedAt` timestamp;