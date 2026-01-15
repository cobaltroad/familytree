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
 * CRITICAL (Issue #122): This function uses Drizzle's official migrate()
 * function to apply migrations from the drizzle/ directory. This ensures
 * the test database schema EXACTLY matches production schema.
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
  // Import applyMigrations dynamically to avoid circular dependency
  const { applyMigrations } = await import('../db/migrations.js')

  // Apply all migrations using Drizzle's official migration system
  // This automatically:
  // - Creates __drizzle_migrations table
  // - Applies all migrations from drizzle/ directory
  // - Enables foreign keys
  // - Tracks applied migrations
  await applyMigrations(sqlite, db)

  // Create default test user
  const result = sqlite.prepare(`
    INSERT INTO users (email, name, provider)
    VALUES (?, ?, ?)
  `).run('test@example.com', 'Test User', 'test')

  return result.lastInsertRowid
}
