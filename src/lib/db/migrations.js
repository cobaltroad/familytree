/**
 * Drizzle Migration Utilities
 *
 * Provides functions to apply and manage Drizzle ORM migrations.
 * This module uses Drizzle's built-in migrate() function to apply
 * migrations from the drizzle/ directory.
 *
 * Issue #122: Refactored to use Drizzle's official migration system
 * instead of manual SQL execution.
 */

import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Path to migrations directory
const migrationsFolder = join(__dirname, '../../../drizzle')

/**
 * Applies all pending Drizzle migrations to the database
 *
 * This function:
 * 1. Creates the __drizzle_migrations table if it doesn't exist
 * 2. Reads migration files from the drizzle/ directory
 * 3. Applies any migrations that haven't been applied yet
 * 4. Updates the __drizzle_migrations table to track applied migrations
 * 5. Enables foreign key constraints
 *
 * The function is idempotent - it's safe to run multiple times.
 * Already-applied migrations will be skipped automatically.
 *
 * @param {Database} sqlite - Better-SQLite3 database instance
 * @param {DrizzleDatabase} db - Drizzle database instance
 * @returns {Promise<void>}
 *
 * @example
 * import Database from 'better-sqlite3'
 * import { drizzle } from 'drizzle-orm/better-sqlite3'
 * import { applyMigrations } from './migrations.js'
 *
 * const sqlite = new Database('./familytree.db')
 * const db = drizzle(sqlite)
 * await applyMigrations(sqlite, db)
 */
export async function applyMigrations(sqlite, db) {
  try {
    // Enable foreign keys BEFORE applying migrations
    sqlite.exec('PRAGMA foreign_keys = ON')

    // Use Drizzle's built-in migrate function
    // This automatically:
    // - Creates __drizzle_migrations table if needed
    // - Reads migration files from the specified folder
    // - Applies pending migrations in order
    // - Records applied migrations in __drizzle_migrations table
    // - Skips already-applied migrations
    await migrate(db, { migrationsFolder })
  } catch (error) {
    // Re-throw with more context
    throw new Error(`Failed to apply migrations: ${error.message}`)
  }
}

/**
 * Gets the status of applied migrations
 *
 * Returns a list of all migrations that have been applied to the database,
 * including their hash and timestamp.
 *
 * @param {Database} sqlite - Better-SQLite3 database instance
 * @returns {Promise<Array<{hash: string, created_at: number}>>} Array of applied migrations
 *
 * @example
 * const status = await getMigrationStatus(sqlite)
 * console.log(`Applied ${status.length} migrations`)
 */
export async function getMigrationStatus(sqlite) {
  try {
    // Check if migrations table exists
    const tableExists = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'")
      .get()

    if (!tableExists) {
      return []
    }

    // Get all applied migrations
    const migrations = sqlite
      .prepare('SELECT hash, created_at FROM __drizzle_migrations ORDER BY id')
      .all()

    return migrations
  } catch (error) {
    // If table doesn't exist or query fails, return empty array
    return []
  }
}
