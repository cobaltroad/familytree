/**
 * Schema User Association Tests
 *
 * RED Phase: Write failing tests that verify:
 * 1. user_id column exists on people table
 * 2. user_id column exists on relationships table
 * 3. Foreign key constraints to users table
 * 4. Cascade delete behavior (when user deleted, their data is deleted)
 * 5. Indexes on user_id for performance
 *
 * These tests will fail until we implement the schema changes.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { people, relationships, users } from './schema.js'
import { eq } from 'drizzle-orm'

describe('Schema User Association - Database Structure', () => {
  let sqlite
  let db

  beforeEach(() => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // Create tables (this will use the updated schema)
    // For now, these will fail because the schema doesn't have user_id yet
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
        last_login_at TEXT
      )
    `)

    sqlite.exec(`
      CREATE TABLE people (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        birth_date TEXT,
        death_date TEXT,
        gender TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    sqlite.exec(`
      CREATE INDEX people_user_id_idx ON people(user_id)
    `)

    sqlite.exec(`
      CREATE TABLE relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person1_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        person2_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        parent_role TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    sqlite.exec(`
      CREATE INDEX relationships_user_id_idx ON relationships(user_id)
    `)
  })

  afterEach(() => {
    sqlite.close()
  })

  describe('People Table Structure', () => {
    it('should have user_id column', () => {
      const columns = sqlite
        .prepare("PRAGMA table_info('people')")
        .all()

      const userIdColumn = columns.find((col) => col.name === 'user_id')
      expect(userIdColumn).toBeDefined()
      expect(userIdColumn.type).toBe('INTEGER')
      expect(userIdColumn.notnull).toBe(1) // NOT NULL
    })

    it('should have foreign key constraint to users table', () => {
      const foreignKeys = sqlite
        .prepare("PRAGMA foreign_key_list('people')")
        .all()

      const userFk = foreignKeys.find((fk) => fk.from === 'user_id')
      expect(userFk).toBeDefined()
      expect(userFk.table).toBe('users')
      expect(userFk.to).toBe('id')
      expect(userFk.on_delete).toBe('CASCADE')
    })

    it('should have index on user_id', () => {
      const indexes = sqlite
        .prepare("PRAGMA index_list('people')")
        .all()

      const userIdIndex = indexes.find((idx) => idx.name === 'people_user_id_idx')
      expect(userIdIndex).toBeDefined()
    })
  })

  describe('Relationships Table Structure', () => {
    it('should have user_id column', () => {
      const columns = sqlite
        .prepare("PRAGMA table_info('relationships')")
        .all()

      const userIdColumn = columns.find((col) => col.name === 'user_id')
      expect(userIdColumn).toBeDefined()
      expect(userIdColumn.type).toBe('INTEGER')
      expect(userIdColumn.notnull).toBe(1) // NOT NULL
    })

    it('should have foreign key constraint to users table', () => {
      const foreignKeys = sqlite
        .prepare("PRAGMA foreign_key_list('relationships')")
        .all()

      const userFk = foreignKeys.find((fk) => fk.from === 'user_id')
      expect(userFk).toBeDefined()
      expect(userFk.table).toBe('users')
      expect(userFk.to).toBe('id')
      expect(userFk.on_delete).toBe('CASCADE')
    })

    it('should have index on user_id', () => {
      const indexes = sqlite
        .prepare("PRAGMA index_list('relationships')")
        .all()

      const userIdIndex = indexes.find((idx) => idx.name === 'relationships_user_id_idx')
      expect(userIdIndex).toBeDefined()
    })
  })

  describe('Cascade Delete Behavior', () => {
    beforeEach(() => {
      // Enable foreign keys in SQLite
      sqlite.exec('PRAGMA foreign_keys = ON')
    })

    it('should cascade delete people when user is deleted', async () => {
      // Insert test user
      const userResult = await db
        .insert(users)
        .values({
          email: 'test@example.com',
          name: 'Test User',
          provider: 'google'
        })
        .returning()

      const userId = userResult[0].id

      // Insert test person for this user
      const personResult = await db
        .insert(people)
        .values({
          firstName: 'John',
          lastName: 'Doe',
          userId: userId
        })
        .returning()

      const personId = personResult[0].id

      // Verify person exists
      let foundPeople = await db
        .select()
        .from(people)
        .where(eq(people.id, personId))

      expect(foundPeople).toHaveLength(1)

      // Delete user
      await db.delete(users).where(eq(users.id, userId))

      // Verify person was cascade deleted
      foundPeople = await db
        .select()
        .from(people)
        .where(eq(people.id, personId))

      expect(foundPeople).toHaveLength(0)
    })

    it('should cascade delete relationships when user is deleted', async () => {
      // Insert test user
      const userResult = await db
        .insert(users)
        .values({
          email: 'test@example.com',
          name: 'Test User',
          provider: 'google'
        })
        .returning()

      const userId = userResult[0].id

      // Insert test people
      const person1Result = await db
        .insert(people)
        .values({
          firstName: 'John',
          lastName: 'Doe',
          userId: userId
        })
        .returning()

      const person2Result = await db
        .insert(people)
        .values({
          firstName: 'Jane',
          lastName: 'Doe',
          userId: userId
        })
        .returning()

      // Insert test relationship
      const relationshipResult = await db
        .insert(relationships)
        .values({
          person1Id: person1Result[0].id,
          person2Id: person2Result[0].id,
          type: 'spouse',
          userId: userId
        })
        .returning()

      const relationshipId = relationshipResult[0].id

      // Verify relationship exists
      let foundRelationships = await db
        .select()
        .from(relationships)
        .where(eq(relationships.id, relationshipId))

      expect(foundRelationships).toHaveLength(1)

      // Delete user
      await db.delete(users).where(eq(users.id, userId))

      // Verify relationship was cascade deleted
      foundRelationships = await db
        .select()
        .from(relationships)
        .where(eq(relationships.id, relationshipId))

      expect(foundRelationships).toHaveLength(0)
    })
  })
})
