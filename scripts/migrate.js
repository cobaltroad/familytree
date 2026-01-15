#!/usr/bin/env node

/**
 * Migration Runner Script
 *
 * Applies all pending Drizzle migrations to the production database.
 *
 * Usage:
 *   npm run db:migrate
 *
 * This script:
 * 1. Connects to the familytree.db database
 * 2. Applies any pending migrations from the drizzle/ directory
 * 3. Updates the __drizzle_migrations table
 * 4. Reports the status of applied migrations
 *
 * The script is idempotent - it's safe to run multiple times.
 * Already-applied migrations will be skipped automatically.
 */

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { applyMigrations, getMigrationStatus } from '../src/lib/db/migrations.js'

// Get project root directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

// Path to the production database
const dbPath = join(projectRoot, 'familytree.db')

async function main() {
  console.log('🚀 Starting database migration...\n')
  console.log(`Database: ${dbPath}\n`)

  // Connect to database
  let sqlite
  let db
  try {
    sqlite = new Database(dbPath)
    db = drizzle(sqlite)
    console.log('✓ Connected to database\n')
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message)
    process.exit(1)
  }

  // Get current migration status before applying
  try {
    const beforeStatus = await getMigrationStatus(sqlite)
    console.log(`Current status: ${beforeStatus.length} migrations applied\n`)
  } catch (error) {
    console.log('No previous migrations found\n')
  }

  // Apply migrations
  try {
    await applyMigrations(sqlite, db)
    console.log('✓ Migrations applied successfully\n')
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    sqlite.close()
    process.exit(1)
  }

  // Get updated migration status
  try {
    const afterStatus = await getMigrationStatus(sqlite)
    console.log(`Final status: ${afterStatus.length} migrations applied\n`)

    if (afterStatus.length > 0) {
      console.log('Applied migrations:')
      afterStatus.forEach((migration, index) => {
        const date = new Date(migration.created_at)
        console.log(`  ${index + 1}. ${migration.hash} (${date.toISOString()})`)
      })
    }
  } catch (error) {
    console.error('❌ Failed to get migration status:', error.message)
  }

  // Close database connection
  sqlite.close()
  console.log('\n✅ Migration completed successfully')
}

// Run the migration
main().catch((error) => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
