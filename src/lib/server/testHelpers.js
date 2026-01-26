/**
 * Test Helper Utilities
 *
 * Provides reusable functions for testing API routes.
 * These helpers simplify test setup by providing database schema setup.
 */

/**
 * Creates a mock event object for testing API routes
 *
 * @param {Object} db - Database instance
 * @param {Object} additionalProps - Additional properties to add to the event
 * @returns {Object} Mock event object
 *
 * @example
 * const event = createMockEvent(db)
 * const response = await GET(event)
 */
export function createMockEvent(db, additionalProps = {}) {
  return {
    locals: {
      db: db
    },
    ...additionalProps
  }
}

/**
 * Sets up a test database with all required tables
 *
 * CRITICAL (Issue #122): This function uses Drizzle's official migrate()
 * function to apply migrations from the drizzle/ directory. This ensures
 * the test database schema EXACTLY matches production schema.
 *
 * Single Source of Truth: Production migrations in drizzle/ directory
 *
 * @param {Database} sqlite - Better-SQLite3 database instance
 * @param {DrizzleDatabase} db - Drizzle database instance
 * @returns {Promise<void>}
 *
 * @example
 * const sqlite = new Database(':memory:')
 * const db = drizzle(sqlite)
 * await setupTestDatabase(sqlite, db)
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
}
