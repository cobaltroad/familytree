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
 * SQL script to create users table for testing
 * Updated for Story #81: Added default_person_id field
 */
export const CREATE_USERS_TABLE_SQL = `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    avatar_url TEXT,
    provider TEXT NOT NULL,
    provider_user_id TEXT,
    email_verified INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TEXT,
    default_person_id INTEGER,
    FOREIGN KEY (default_person_id) REFERENCES people(id) ON DELETE SET NULL
  )
`

/**
 * SQL script to create people table with user_id for testing (Issue #72)
 * Updated for Story #77: Added photo_url field
 */
export const CREATE_PEOPLE_TABLE_SQL = `
  CREATE TABLE people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birth_date TEXT,
    death_date TEXT,
    gender TEXT,
    photo_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`

/**
 * SQL script to create relationships table with user_id for testing (Issue #72)
 */
export const CREATE_RELATIONSHIPS_TABLE_SQL = `
  CREATE TABLE relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person1_id INTEGER NOT NULL,
    person2_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    parent_role TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (person1_id) REFERENCES people(id) ON DELETE CASCADE,
    FOREIGN KEY (person2_id) REFERENCES people(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`

/**
 * Sets up a test database with all required tables and a default test user
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

  // Create tables
  sqlite.exec(CREATE_USERS_TABLE_SQL)
  sqlite.exec(CREATE_PEOPLE_TABLE_SQL)
  sqlite.exec(CREATE_RELATIONSHIPS_TABLE_SQL)

  // Create default test user
  const result = sqlite.prepare(`
    INSERT INTO users (email, name, provider)
    VALUES (?, ?, ?)
  `).run('test@example.com', 'Test User', 'test')

  return result.lastInsertRowid
}
