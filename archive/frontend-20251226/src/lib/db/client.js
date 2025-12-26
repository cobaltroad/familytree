import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Path to the existing SQLite database
// Points to backend/familytree.db from frontend/src/lib/db/
const dbPath = join(__dirname, '../../../../backend/familytree.db')

// Create SQLite connection
const sqlite = new Database(dbPath)

// Create Drizzle ORM instance
export const db = drizzle(sqlite)

// Export the raw sqlite connection if needed
export { sqlite }
