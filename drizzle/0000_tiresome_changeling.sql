CREATE TABLE `people` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`birth_date` text,
	`death_date` text,
	`gender` text,
	`photo_url` text,
	`birth_surname` text,
	`nickname` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `relationships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`person1_id` integer NOT NULL,
	`person2_id` integer NOT NULL,
	`type` text NOT NULL,
	`parent_role` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`person1_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person2_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
