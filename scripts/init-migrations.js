#!/usr/bin/env node

/**
 * Migration Tracking Initialization Script
 *
 * This script initializes the __drizzle_migrations table for an existing database
 * that was created without using Drizzle's migration system.
 *
 * Usage:
 *   npm run db:init-migrations
 *
 * IMPORTANT: This script should only be run ONCE on an existing database.
 * It marks all existing migrations as "applied" without actually running them,
 * since the schema already exists in the database.
 *
 * After running this script, future schema changes should use:
 *   1. npm run db:generate (to create a new migration)
 *   2. npm run db:migrate (to apply the migration)
 */

import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

// Get project root directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

// Path to the production database
const dbPath = join(projectRoot, 'familytree.db')
const migrationsFolder = join(projectRoot, 'drizzle')

async function main() {
  console.log('🔧 Initializing migration tracking for existing database...\n')
  console.log(`Database: ${dbPath}\n`)

  // Connect to database
  let sqlite
  try {
    sqlite = new Database(dbPath)
    console.log('✓ Connected to database\n')
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message)
    process.exit(1)
  }

  // Check if __drizzle_migrations table exists
  const tableExists = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'")
    .get()

  if (tableExists) {
    // Check if there are already migrations recorded
    const existingMigrations = sqlite
      .prepare('SELECT COUNT(*) as count FROM __drizzle_migrations')
      .get()

    if (existingMigrations.count > 0) {
      console.log(`⚠️  Migration tracking already initialized (${existingMigrations.count} migrations recorded)`)
      console.log('\nIf you need to re-initialize, manually delete records from __drizzle_migrations table.')
      sqlite.close()
      return
    }
  } else {
    // Create the migrations table
    console.log('Creating __drizzle_migrations table...')
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash text NOT NULL,
        created_at numeric
      )
    `)
    console.log('✓ Created __drizzle_migrations table\n')
  }

  // Read the migration journal to get all migration hashes
  const journalPath = join(migrationsFolder, 'meta', '_journal.json')
  let journal
  try {
    const journalContent = readFileSync(journalPath, 'utf-8')
    journal = JSON.parse(journalContent)
    console.log(`Found ${journal.entries.length} migrations in journal\n`)
  } catch (error) {
    console.error('❌ Failed to read migration journal:', error.message)
    sqlite.close()
    process.exit(1)
  }

  // Insert all migrations as "applied"
  const insertStmt = sqlite.prepare(`
    INSERT INTO __drizzle_migrations (hash, created_at)
    VALUES (?, ?)
  `)

  const now = Date.now()
  for (const entry of journal.entries) {
    try {
      insertStmt.run(entry.tag, entry.when || now)
      console.log(`✓ Marked migration as applied: ${entry.tag}`)
    } catch (error) {
      console.error(`❌ Failed to mark migration ${entry.tag}:`, error.message)
      sqlite.close()
      process.exit(1)
    }
  }

  console.log('\n✅ Migration tracking initialized successfully')
  console.log('\nNext steps:')
  console.log('  1. To create a new migration: npm run db:generate')
  console.log('  2. To apply new migrations: npm run db:migrate')

  sqlite.close()
}

// Run the initialization
main().catch((error) => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
