CREATE TABLE `partnership_agreements` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`partner_country` text NOT NULL,
	`partner_name` text NOT NULL,
	`legal_representative_name` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_partnership_agreements_project_country` ON `partnership_agreements` (`project_id`,`partner_country`);
