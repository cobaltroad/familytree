/**
 * Users Schema - view_all_records Feature Flag Tests
 *
 * RED Phase: Write failing tests that verify:
 * 1. view_all_records column exists in users table
 * 2. view_all_records defaults to false (0) for new users
 * 3. view_all_records can be updated to true (1)
 * 4. view_all_records is a boolean field
 *
 * These tests will fail until we add the view_all_records column to the schema.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import { users } from './schema.js'

describe('Users Schema - view_all_records Feature Flag', () => {
  let db
  let sqlite

  beforeEach(() => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // Create users table with view_all_records column
    sqlite.exec(`
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
        view_all_records INTEGER NOT NULL DEFAULT 0
      )
    `)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should have view_all_records column in users table', async () => {
    // Query table schema
    const columns = sqlite.prepare(`PRAGMA table_info(users)`).all()
    const columnNames = columns.map((col) => col.name)

    expect(columnNames).toContain('view_all_records')
  })

  it('should default view_all_records to false (0) for new users', async () => {
    // Insert user without specifying view_all_records
    const result = await db
      .insert(users)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google'
      })
      .returning()

    const newUser = result[0]

    // Should default to false
    expect(newUser.viewAllRecords).toBe(false)
  })

  it('should allow setting view_all_records to true on creation', async () => {
    // Insert user with view_all_records = true
    const result = await db
      .insert(users)
      .values({
        email: 'admin@example.com',
        name: 'Admin User',
        provider: 'google',
        viewAllRecords: true
      })
      .returning()

    const newUser = result[0]

    expect(newUser.viewAllRecords).toBe(true)
  })

  it('should allow updating view_all_records from false to true', async () => {
    // Create user with default view_all_records (false)
    const createResult = await db
      .insert(users)
      .values({
        email: 'user@example.com',
        name: 'Regular User',
        provider: 'google'
      })
      .returning()

    const userId = createResult[0].id

    // Update view_all_records to true
    const updateResult = await db
      .update(users)
      .set({ viewAllRecords: true })
      .where(eq(users.id, userId))
      .returning()

    const updatedUser = updateResult[0]

    expect(updatedUser.viewAllRecords).toBe(true)
  })

  it('should allow updating view_all_records from true to false', async () => {
    // Create user with view_all_records = true
    const createResult = await db
      .insert(users)
      .values({
        email: 'admin@example.com',
        name: 'Admin User',
        provider: 'google',
        viewAllRecords: true
      })
      .returning()

    const userId = createResult[0].id

    // Update view_all_records to false
    const updateResult = await db
      .update(users)
      .set({ viewAllRecords: false })
      .where(eq(users.id, userId))
      .returning()

    const updatedUser = updateResult[0]

    expect(updatedUser.viewAllRecords).toBe(false)
  })

  it('should store view_all_records as boolean in Drizzle ORM', async () => {
    // Insert user with explicit boolean values
    const trueResult = await db
      .insert(users)
      .values({
        email: 'true@example.com',
        name: 'True User',
        provider: 'google',
        viewAllRecords: true
      })
      .returning()

    const falseResult = await db
      .insert(users)
      .values({
        email: 'false@example.com',
        name: 'False User',
        provider: 'google',
        viewAllRecords: false
      })
      .returning()

    // Should be boolean, not integer
    expect(typeof trueResult[0].viewAllRecords).toBe('boolean')
    expect(typeof falseResult[0].viewAllRecords).toBe('boolean')
    expect(trueResult[0].viewAllRecords).toBe(true)
    expect(falseResult[0].viewAllRecords).toBe(false)
  })
})
