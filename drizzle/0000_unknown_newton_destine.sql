CREATE TABLE `project_settings` (
	`project_id` text PRIMARY KEY NOT NULL,
	`project_code` text NOT NULL,
	`countries` text NOT NULL,
	`access_hash` text,
	`enabled` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`rate` real NOT NULL,
	`rate_date` text NOT NULL,
	`source` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`project_id` text,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_project` ON `sessions` (`project_id`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`request_id` text NOT NULL,
	`session_hash` text NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`name` text NOT NULL,
	`team` text NOT NULL,
	`email` text NOT NULL,
	`total_cents` integer NOT NULL,
	`data` text NOT NULL,
	`pdf_key` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_submissions_project_created` ON `submissions` (`project_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_submissions_request` ON `submissions` (`project_id`,`request_id`);