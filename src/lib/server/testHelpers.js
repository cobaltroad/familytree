/**
 * Test Helper Utilities
 *
 * Provides reusable functions for testing authenticated API routes (Issue #72).
 * These helpers simplify test setup by providing mock authentication and database schemas.
 */

/**
 * Creates a mock authenticated session for testing
 *
 * @param {number} userId - User ID for the session
 * @param {string} userEmail - User email
 * @param {string} userName - User name
 * @returns {Object} Mock session object
 *
 * @example
 * const session = createMockSession(1, 'test@example.com', 'Test User')
 * const event = { locals: { db, getSession: async () => session } }
 */
export function createMockSession(userId = 1, userEmail = 'test@example.com', userName = 'Test User') {
  return {
    user: {
      id: userId,
      email: userEmail,
      name: userName
    }
  }
}

/**
 * Creates a mock event object with authentication for testing
 *
 * @param {Object} db - Database instance
 * @param {Object} session - Mock session object (optional, uses default if not provided)
 * @param {Object} additionalProps - Additional properties to add to the event
 * @returns {Object} Mock event object
 *
 * @example
 * const event = createMockAuthenticatedEvent(db)
 * const response = await GET(event)
 */
export function createMockAuthenticatedEvent(db, session = null, additionalProps = {}) {
  const mockSession = session || createMockSession()

  return {
    locals: {
      db: db,
      getSession: async () => mockSession
    },
    ...additionalProps
  }
}

/**
 * Sets up a test database with all required tables and a default test user
 *
 * CRITICAL (Issue #114): This function uses Drizzle migrations to ensure
 * the test database schema EXACTLY matches production schema from schema.js.
 * This eliminates schema duplication and prevents schema mismatch errors.
 *
 * Single Source of Truth: Production migrations in drizzle/ directory
 *
 * @param {Database} sqlite - Better-SQLite3 database instance
 * @param {DrizzleDatabase} db - Drizzle database instance
 * @returns {Promise<number>} The ID of the created test user
 *
 * @example
 * const sqlite = new Database(':memory:')
 * const db = drizzle(sqlite)
 * const userId = await setupTestDatabase(sqlite, db)
 */
export async function setupTestDatabase(sqlite, db) {
  // Enable foreign keys
  sqlite.exec('PRAGMA foreign_keys = ON')

  // Apply production migrations to test database
  // This ensures test schema matches production schema exactly (Issue #114)
  const migrations = [
    // Migration 0000: Initial schema (users, people, relationships, sessions)
    {
      sql: `CREATE TABLE \`people\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`first_name\` text NOT NULL,
	\`last_name\` text NOT NULL,
	\`birth_date\` text,
	\`death_date\` text,
	\`gender\` text,
	\`photo_url\` text,
	\`created_at\` text DEFAULT CURRENT_TIMESTAMP,
	\`user_id\` integer NOT NULL,
	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX \`people_user_id_idx\` ON \`people\` (\`user_id\`);
CREATE TABLE \`relationships\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`person1_id\` integer NOT NULL,
	\`person2_id\` integer NOT NULL,
	\`type\` text NOT NULL,
	\`parent_role\` text,
	\`created_at\` text DEFAULT CURRENT_TIMESTAMP,
	\`user_id\` integer NOT NULL,
	FOREIGN KEY (\`person1_id\`) REFERENCES \`people\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`person2_id\`) REFERENCES \`people\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX \`relationships_user_id_idx\` ON \`relationships\` (\`user_id\`);
CREATE TABLE \`sessions\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`user_id\` integer NOT NULL,
	\`expires_at\` text NOT NULL,
	\`created_at\` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	\`last_accessed_at\` text,
	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX \`sessions_user_id_idx\` ON \`sessions\` (\`user_id\`);
CREATE INDEX \`sessions_expires_at_idx\` ON \`sessions\` (\`expires_at\`);
CREATE TABLE \`users\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`email\` text NOT NULL,
	\`name\` text,
	\`avatar_url\` text,
	\`provider\` text NOT NULL,
	\`provider_user_id\` text,
	\`email_verified\` integer DEFAULT true NOT NULL,
	\`created_at\` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	\`last_login_at\` text,
	\`default_person_id\` integer,
	FOREIGN KEY (\`default_person_id\`) REFERENCES \`people\`(\`id\`) ON UPDATE no action ON DELETE set null
);
CREATE UNIQUE INDEX \`users_email_unique\` ON \`users\` (\`email\`);
CREATE UNIQUE INDEX \`users_email_idx\` ON \`users\` (\`email\`);
CREATE INDEX \`users_provider_user_id_idx\` ON \`users\` (\`provider_user_id\`);`
    },
    // Migration 0001: Add view_all_records column
    {
      sql: `ALTER TABLE \`users\` ADD \`view_all_records\` integer DEFAULT false NOT NULL;`
    },
    // Migration 0002: Add birth_surname and nickname columns (Issue #121)
    {
      sql: `ALTER TABLE \`people\` ADD \`birth_surname\` text;
ALTER TABLE \`people\` ADD \`nickname\` text;`
    }
  ]

  // Execute migrations sequentially
  for (const migration of migrations) {
    sqlite.exec(migration.sql)
  }

  // Create default test user
  const result = sqlite.prepare(`
    INSERT INTO users (email, name, provider)
    VALUES (?, ?, ?)
  `).run('test@example.com', 'Test User', 'test')

  return result.lastInsertRowid
}
