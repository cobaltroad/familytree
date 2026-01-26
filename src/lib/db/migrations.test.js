/**
 * Drizzle Migration System Tests
 *
 * Tests the refactored migration system to ensure:
 * 1. Migrations can be applied cleanly to a fresh database
 * 2. Migration tracking table is properly maintained
 * 3. Already-applied migrations are skipped
 * 4. Schema matches expected structure after migration
 */

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { applyMigrations, getMigrationStatus } from './migrations.js'
import * as schema from './schema.js'

describe('Drizzle Migration System', () => {
  let sqlite
  let db

  beforeEach(() => {
    // Create fresh in-memory database for each test
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)
  })

  describe('applyMigrations', () => {
    it('should create __drizzle_migrations table if it does not exist', async () => {
      await applyMigrations(sqlite, db)

      const tables = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'")
        .all()

      expect(tables).toHaveLength(1)
      expect(tables[0].name).toBe('__drizzle_migrations')
    })

    it('should create all schema tables (people, relationships)', async () => {
      await applyMigrations(sqlite, db)

      const tables = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('people', 'relationships')")
        .all()
        .map(row => row.name)
        .sort()

      expect(tables).toEqual(['people', 'relationships'])
    })

    it('should record all applied migrations in __drizzle_migrations table', async () => {
      await applyMigrations(sqlite, db)

      const migrations = sqlite
        .prepare('SELECT hash FROM __drizzle_migrations ORDER BY id')
        .all()

      // Should have 1 migration (initial schema with people and relationships)
      expect(migrations).toHaveLength(1)
    })

    it('should skip already-applied migrations on subsequent runs', async () => {
      // Apply migrations first time
      await applyMigrations(sqlite, db)

      const firstCount = sqlite
        .prepare('SELECT COUNT(*) as count FROM __drizzle_migrations')
        .get().count

      // Apply migrations second time
      await applyMigrations(sqlite, db)

      const secondCount = sqlite
        .prepare('SELECT COUNT(*) as count FROM __drizzle_migrations')
        .get().count

      // Count should be the same
      expect(secondCount).toBe(firstCount)
    })

    it('should enable foreign keys after migration', async () => {
      await applyMigrations(sqlite, db)

      const foreignKeys = sqlite.prepare('PRAGMA foreign_keys').get()
      expect(foreignKeys.foreign_keys).toBe(1)
    })

    it('should create people table with all expected columns', async () => {
      await applyMigrations(sqlite, db)

      const columns = sqlite
        .prepare('PRAGMA table_info(people)')
        .all()
        .map(col => col.name)
        .sort()

      const expectedColumns = [
        'id',
        'first_name',
        'last_name',
        'birth_date',
        'death_date',
        'gender',
        'photo_url',
        'birth_surname',
        'nickname',
        'created_at'
      ].sort()

      expect(columns).toEqual(expectedColumns)
    })

    it('should create relationships table with all expected columns', async () => {
      await applyMigrations(sqlite, db)

      const columns = sqlite
        .prepare('PRAGMA table_info(relationships)')
        .all()
        .map(col => col.name)
        .sort()

      const expectedColumns = [
        'id',
        'person1_id',
        'person2_id',
        'type',
        'parent_role',
        'created_at'
      ].sort()

      expect(columns).toEqual(expectedColumns)
    })

    it('should allow inserting data after migration', async () => {
      await applyMigrations(sqlite, db)

      // Insert a test person
      const personResult = sqlite
        .prepare('INSERT INTO people (first_name, last_name) VALUES (?, ?)')
        .run('John', 'Doe')

      expect(personResult.lastInsertRowid).toBeGreaterThan(0)

      // Insert another person
      const person2Result = sqlite
        .prepare('INSERT INTO people (first_name, last_name) VALUES (?, ?)')
        .run('Jane', 'Doe')

      // Insert a relationship
      const relResult = sqlite
        .prepare('INSERT INTO relationships (person1_id, person2_id, type) VALUES (?, ?, ?)')
        .run(personResult.lastInsertRowid, person2Result.lastInsertRowid, 'spouse')

      expect(relResult.lastInsertRowid).toBeGreaterThan(0)
    })

    it('should enforce foreign key constraints', async () => {
      await applyMigrations(sqlite, db)

      // Try to insert relationship with non-existent person_id
      expect(() => {
        sqlite
          .prepare('INSERT INTO relationships (person1_id, person2_id, type) VALUES (?, ?, ?)')
          .run(999, 998, 'spouse')
      }).toThrow()
    })
  })

  describe('getMigrationStatus', () => {
    it('should return empty array when no migrations applied', async () => {
      // Create empty migrations table
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hash text NOT NULL,
          created_at numeric
        )
      `)

      const status = await getMigrationStatus(sqlite)
      expect(status).toEqual([])
    })

    it('should return list of applied migrations', async () => {
      await applyMigrations(sqlite, db)

      const status = await getMigrationStatus(sqlite)
      expect(status).toHaveLength(1)
      expect(status[0]).toHaveProperty('hash')
      expect(status[0]).toHaveProperty('created_at')
    })

    it('should handle database without migrations table gracefully', async () => {
      const status = await getMigrationStatus(sqlite)
      expect(status).toEqual([])
    })
  })

  describe('Idempotency', () => {
    it('should be safe to run applyMigrations multiple times', async () => {
      // Run migrations 3 times
      await applyMigrations(sqlite, db)
      await applyMigrations(sqlite, db)
      await applyMigrations(sqlite, db)

      // Should still have exactly 1 migration record
      const count = sqlite
        .prepare('SELECT COUNT(*) as count FROM __drizzle_migrations')
        .get().count

      expect(count).toBe(1)

      // Schema should still be intact
      const tables = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('people', 'relationships')")
        .all()

      expect(tables).toHaveLength(2)
    })
  })
})
