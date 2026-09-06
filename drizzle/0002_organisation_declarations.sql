CREATE TABLE `organisation_declarations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`country` text NOT NULL,
	`organisation_name` text NOT NULL,
	`legal_representative_name` text NOT NULL,
	`total_cents` integer NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_organisation_declarations_project_country` ON `organisation_declarations` (`project_id`,`country`);
