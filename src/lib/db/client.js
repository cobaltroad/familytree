import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Path to the SQLite database
// Points to familytree.db in project root from src/lib/db/
const dbPath = join(__dirname, '../../../familytree.db')

// Create SQLite connection
let sqlite = new Database(dbPath)

// Enable foreign key constraints
sqlite.exec('PRAGMA foreign_keys = ON')

// Create Drizzle ORM instance
let db = drizzle(sqlite)

/**
 * Reconnects to the database by closing the existing connection and opening a new one.
 * This is necessary after database file replacement (e.g., during recovery from backup).
 *
 * @returns {void}
 */
export function reconnectDatabase() {
  try {
    // Close existing connection
    sqlite.close()
  } catch (error) {
    // Connection might already be closed, ignore error
  }

  // Create new connection
  sqlite = new Database(dbPath)

  // Enable foreign key constraints
  sqlite.exec('PRAGMA foreign_keys = ON')

  db = drizzle(sqlite)
}

// Export the db instance and sqlite connection
export { db, sqlite }
