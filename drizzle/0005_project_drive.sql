CREATE TABLE `drive_locks` (
	`lock_key` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `drive_participants` (
	`folder_id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`country_id` text NOT NULL,
	`country` text NOT NULL,
	`name` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Needs privacy setup' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `drive_participant_identity` ON `drive_participants` (`project_id`,`country_id`,`email`) WHERE "drive_participants"."email" <> '';--> statement-breakpoint
CREATE TABLE `drive_projects` (
	`project_id` text PRIMARY KEY NOT NULL,
	`countries_folder_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `drive_projects_countries_folder_id_unique` ON `drive_projects` (`countries_folder_id`);
