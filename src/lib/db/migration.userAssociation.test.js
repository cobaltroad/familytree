/**
 * Migration User Association Tests
 *
 * RED Phase: Write failing tests that verify:
 * 1. Existing data is assigned to a default user during migration
 * 2. No data is lost during migration
 * 3. Migration is idempotent (can be run multiple times safely)
 *
 * These tests will fail until we implement the migration script.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { people, relationships, users } from './schema.js'
import { eq } from 'drizzle-orm'
import { migrateExistingData } from './migrations/addUserAssociation.js'

describe('Migration User Association - Data Migration', () => {
  let sqlite
  let db

  beforeEach(() => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // Create OLD schema (without user_id)
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
      CREATE TABLE people_old (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        birth_date TEXT,
        death_date TEXT,
        gender TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)

    sqlite.exec(`
      CREATE TABLE relationships_old (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person1_id INTEGER NOT NULL,
        person2_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        parent_role TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create NEW schema (with user_id)
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

    // Enable foreign keys
    sqlite.exec('PRAGMA foreign_keys = ON')
  })

  afterEach(() => {
    sqlite.close()
  })

  describe('Default User Creation', () => {
    it('should create a default user if no users exist', async () => {
      // Verify no users exist initially
      const usersBefore = await db.select().from(users)
      expect(usersBefore).toHaveLength(0)

      // Run migration
      await migrateExistingData(db, sqlite)

      // Verify default user was created
      const usersAfter = await db.select().from(users)
      expect(usersAfter).toHaveLength(1)
      expect(usersAfter[0].email).toBe('default@familytree.local')
      expect(usersAfter[0].name).toBe('Default User')
      expect(usersAfter[0].provider).toBe('system')
    })

    it('should not create duplicate default user if already exists', async () => {
      // Create default user manually
      await db
        .insert(users)
        .values({
          email: 'default@familytree.local',
          name: 'Default User',
          provider: 'system'
        })

      // Run migration
      await migrateExistingData(db, sqlite)

      // Verify only one default user exists
      const usersAfter = await db.select().from(users)
      expect(usersAfter).toHaveLength(1)
    })
  })

  describe('People Data Migration', () => {
    it('should migrate all existing people to default user', async () => {
      // Insert test data into old table
      sqlite.exec(`
        INSERT INTO people_old (first_name, last_name, birth_date, gender)
        VALUES
          ('John', 'Doe', '1980-01-01', 'male'),
          ('Jane', 'Smith', '1985-05-15', 'female'),
          ('Bob', 'Johnson', '1990-12-25', 'male')
      `)

      // Verify old data exists
      const oldPeople = sqlite.prepare('SELECT * FROM people_old').all()
      expect(oldPeople).toHaveLength(3)

      // Run migration
      await migrateExistingData(db, sqlite)

      // Verify all people were migrated to new table
      const newPeople = await db.select().from(people)
      expect(newPeople).toHaveLength(3)

      // Verify all people have the default user_id
      const defaultUser = await db
        .select()
        .from(users)
        .where(eq(users.email, 'default@familytree.local'))
      const defaultUserId = defaultUser[0].id

      newPeople.forEach((person) => {
        expect(person.userId).toBe(defaultUserId)
      })

      // Verify data integrity (first names match)
      const firstNames = newPeople.map((p) => p.firstName).sort()
      expect(firstNames).toEqual(['Bob', 'Jane', 'John'])
    })

    it('should preserve all person attributes during migration', async () => {
      // Insert test person with all fields
      sqlite.exec(`
        INSERT INTO people_old (first_name, last_name, birth_date, death_date, gender, created_at)
        VALUES ('John', 'Doe', '1980-01-01', '2050-12-31', 'male', '2024-01-01 12:00:00')
      `)

      // Run migration
      await migrateExistingData(db, sqlite)

      // Verify person was migrated with all attributes
      const newPeople = await db.select().from(people)
      expect(newPeople).toHaveLength(1)

      const person = newPeople[0]
      expect(person.firstName).toBe('John')
      expect(person.lastName).toBe('Doe')
      expect(person.birthDate).toBe('1980-01-01')
      expect(person.deathDate).toBe('2050-12-31')
      expect(person.gender).toBe('male')
      expect(person.createdAt).toBe('2024-01-01 12:00:00')
    })
  })

  describe('Relationships Data Migration', () => {
    it('should migrate all existing relationships to default user', async () => {
      // Insert test people into old table
      sqlite.exec(`
        INSERT INTO people_old (id, first_name, last_name)
        VALUES (1, 'John', 'Doe'), (2, 'Jane', 'Doe'), (3, 'Bob', 'Smith')
      `)

      // Insert test relationships into old table
      sqlite.exec(`
        INSERT INTO relationships_old (person1_id, person2_id, type, parent_role)
        VALUES
          (1, 3, 'parentOf', 'father'),
          (2, 3, 'parentOf', 'mother'),
          (1, 2, 'spouse', NULL)
      `)

      // Verify old data exists
      const oldRelationships = sqlite.prepare('SELECT * FROM relationships_old').all()
      expect(oldRelationships).toHaveLength(3)

      // Run migration (this will migrate people first, then relationships)
      await migrateExistingData(db, sqlite)

      // Verify all relationships were migrated to new table
      const newRelationships = await db.select().from(relationships)
      expect(newRelationships).toHaveLength(3)

      // Verify all relationships have the default user_id
      const defaultUser = await db
        .select()
        .from(users)
        .where(eq(users.email, 'default@familytree.local'))
      const defaultUserId = defaultUser[0].id

      newRelationships.forEach((rel) => {
        expect(rel.userId).toBe(defaultUserId)
      })
    })

    it('should preserve all relationship attributes during migration', async () => {
      // Insert test people
      sqlite.exec(`
        INSERT INTO people_old (id, first_name, last_name)
        VALUES (1, 'John', 'Doe'), (2, 'Jane', 'Doe')
      `)

      // Insert test relationship with all fields
      sqlite.exec(`
        INSERT INTO relationships_old (person1_id, person2_id, type, parent_role, created_at)
        VALUES (1, 2, 'parentOf', 'father', '2024-01-01 12:00:00')
      `)

      // Run migration
      await migrateExistingData(db, sqlite)

      // Verify relationship was migrated with all attributes
      const newRelationships = await db.select().from(relationships)
      expect(newRelationships).toHaveLength(1)

      const rel = newRelationships[0]
      // Note: person IDs might be different due to auto-increment, but should still reference the migrated people
      expect(rel.type).toBe('parentOf')
      expect(rel.parentRole).toBe('father')
      expect(rel.createdAt).toBe('2024-01-01 12:00:00')
    })
  })

  describe('Migration Idempotency', () => {
    it('should not duplicate data if run multiple times', async () => {
      // Insert test data
      sqlite.exec(`
        INSERT INTO people_old (first_name, last_name)
        VALUES ('John', 'Doe'), ('Jane', 'Smith')
      `)

      // Run migration first time
      await migrateExistingData(db, sqlite)

      const peopleAfterFirst = await db.select().from(people)
      expect(peopleAfterFirst).toHaveLength(2)

      // Run migration second time (should be idempotent)
      await migrateExistingData(db, sqlite)

      const peopleAfterSecond = await db.select().from(people)
      expect(peopleAfterSecond).toHaveLength(2) // Should not duplicate
    })
  })

  describe('Empty Database Migration', () => {
    it('should handle migration when no existing data exists', async () => {
      // Run migration on empty database
      await migrateExistingData(db, sqlite)

      // Verify default user was created
      const usersData = await db.select().from(users)
      expect(usersData).toHaveLength(1)

      // Verify no people or relationships were created
      const peopleData = await db.select().from(people)
      const relationshipsData = await db.select().from(relationships)

      expect(peopleData).toHaveLength(0)
      expect(relationshipsData).toHaveLength(0)
    })
  })
})
