PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
				id SERIAL PRIMARY KEY,
				hash text NOT NULL,
				created_at numeric
			);
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`avatar_url` text,
	`provider` text NOT NULL,
	`provider_user_id` text,
	`email_verified` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_login_at` text
, default_person_id INTEGER REFERENCES people(id) ON DELETE SET NULL, view_all_records INTEGER NOT NULL DEFAULT 0);
INSERT INTO users VALUES(994,'rdollete@gmail.com','Ron Dollete','https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=10163941699994078&height=50&width=50&ext=1769718730&hash=AT_z_ZnsHr0Sse97ZaL3Fhtw','facebook','10163941699994078',1,'2025-12-30T20:30:05.139Z','2025-12-30T20:32:10.747Z',277,0);
CREATE TABLE IF NOT EXISTS "people" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "first_name" TEXT NOT NULL,
        "last_name" TEXT NOT NULL,
        "birth_date" TEXT,
        "death_date" TEXT,
        "gender" TEXT,
        "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
        "user_id" INTEGER NOT NULL, photo_url TEXT, facebook_url TEXT,
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
INSERT INTO people VALUES(277,'Ron','Dollete','1979-01-29',NULL,'male','2025-12-30 20:30:05',994,'https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=10163941699994078&height=50&width=50&ext=1769718605&hash=AT8eMLUxJ8_dI5IFqBxfIWXf',NULL);
INSERT INTO people VALUES(280,'Winona','Cabaltica','1960-08-24',NULL,'female','2025-12-30 20:33:14',994,NULL,NULL);
INSERT INTO people VALUES(281,'Rudy','Dollete','1961-01-15',NULL,'male','2025-12-30 20:33:27',994,NULL,NULL);
INSERT INTO people VALUES(282,'Oscar','Dollete','2018-09-28',NULL,'male','2025-12-30 20:33:50',994,NULL,NULL);
INSERT INTO people VALUES(283,'Kenna','Dollete','1987-11-30',NULL,'female','2025-12-30 20:34:29',994,NULL,NULL);
INSERT INTO people VALUES(284,'Ray','Dollete','1982-02-05',NULL,'male','2025-12-30 20:37:37',994,NULL,NULL);
INSERT INTO people VALUES(285,'Aquilino','Dollete',NULL,NULL,'male','2025-12-30 20:44:06',994,NULL,NULL);
INSERT INTO people VALUES(286,'Dominga','Giron',NULL,NULL,'female','2025-12-30 20:44:30',994,NULL,NULL);
INSERT INTO people VALUES(287,'Segunda','Torres',NULL,NULL,'female','2025-12-30 20:47:31',994,NULL,NULL);
INSERT INTO people VALUES(288,'Bernardo','Dollete',NULL,NULL,'male','2025-12-30 20:47:42',994,NULL,NULL);
INSERT INTO people VALUES(289,'Tirso','Dollete',NULL,NULL,'male','2025-12-30 20:49:12',994,NULL,NULL);
INSERT INTO people VALUES(293,'Maria','Darusin',NULL,NULL,'female','2025-12-30 20:52:51',994,NULL,NULL);
CREATE TABLE IF NOT EXISTS "relationships" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "person1_id" INTEGER NOT NULL,
        "person2_id" INTEGER NOT NULL,
        "type" TEXT NOT NULL,
        "parent_role" TEXT,
        "created_at" TEXT DEFAULT CURRENT_TIMESTAMP,
        "user_id" INTEGER NOT NULL,
        FOREIGN KEY ("person1_id") REFERENCES "people"("id") ON DELETE CASCADE,
        FOREIGN KEY ("person2_id") REFERENCES "people"("id") ON DELETE CASCADE,
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
INSERT INTO relationships VALUES(10,280,277,'parentOf','mother','2025-12-30 20:33:14',994);
INSERT INTO relationships VALUES(11,281,277,'parentOf','father','2025-12-30 20:33:27',994);
INSERT INTO relationships VALUES(12,277,282,'parentOf','father','2025-12-30 20:33:50',994);
INSERT INTO relationships VALUES(13,277,283,'spouse',NULL,'2025-12-30 20:34:48',994);
INSERT INTO relationships VALUES(14,283,282,'parentOf','mother','2025-12-30 20:36:09',994);
INSERT INTO relationships VALUES(15,280,284,'parentOf','mother','2025-12-30 20:37:37',994);
INSERT INTO relationships VALUES(16,281,284,'parentOf','father','2025-12-30 20:37:48',994);
INSERT INTO relationships VALUES(17,280,281,'spouse',NULL,'2025-12-30 20:38:11',994);
INSERT INTO relationships VALUES(18,285,281,'parentOf','father','2025-12-30 20:44:06',994);
INSERT INTO relationships VALUES(19,286,281,'parentOf','mother','2025-12-30 20:44:30',994);
INSERT INTO relationships VALUES(20,287,285,'parentOf','mother','2025-12-30 20:47:31',994);
INSERT INTO relationships VALUES(21,288,285,'parentOf','father','2025-12-30 20:47:42',994);
INSERT INTO relationships VALUES(22,288,287,'spouse',NULL,'2025-12-30 20:48:47',994);
INSERT INTO relationships VALUES(23,288,289,'parentOf','father','2025-12-30 20:49:12',994);
INSERT INTO relationships VALUES(24,285,286,'spouse',NULL,'2025-12-30 20:50:13',994);
INSERT INTO relationships VALUES(25,287,289,'parentOf','mother','2025-12-30 20:51:23',994);
INSERT INTO relationships VALUES(29,289,293,'spouse',NULL,'2025-12-30 20:53:15',994);
CREATE TABLE IF NOT EXISTS "sessions" (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_accessed_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('users',994);
INSERT INTO sqlite_sequence VALUES('people',293);
INSERT INTO sqlite_sequence VALUES('relationships',29);
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);
CREATE INDEX `users_provider_user_id_idx` ON `users` (`provider_user_id`);
CREATE INDEX "people_user_id_idx" ON "people"("user_id");
CREATE INDEX "relationships_user_id_idx" ON "relationships"("user_id");
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);
COMMIT;
