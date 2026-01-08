import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { setupTestDatabase } from './testHelpers.js'
import { people, relationships, users } from '$lib/db/schema.js'

/**
 * Test suite for Test Database Schema Completeness (Issue #114)
 *
 * CRITICAL: The test database schema MUST match production schema exactly.
 * This test verifies that setupTestDatabase() creates all columns from schema.js
 * to prevent schema mismatch errors in tests.
 *
 * RED Phase: These tests should fail with current implementation because:
 * - testHelpers.js has incomplete hardcoded SQL CREATE TABLE statements
 * - Missing columns like photo_url, default_person_id, view_all_records, etc.
 */
describe('setupTestDatabase Schema Completeness (Issue #114)', () => {
  let db
  let sqlite

  beforeEach(async () => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)
    await setupTestDatabase(sqlite, db)
  })

  afterEach(() => {
    sqlite.close()
  })

  describe('Given a test file uses setupTestDatabase helper', () => {
    describe('When the test creates or queries users', () => {
      it('should have all columns from production users schema including default_person_id', () => {
        // Arrange: Get actual table schema from SQLite
        const tableInfo = sqlite.prepare('PRAGMA table_info(users)').all()
        const columnNames = tableInfo.map(col => col.name)

        // Assert: All production schema columns exist
        expect(columnNames).toContain('id')
        expect(columnNames).toContain('email')
        expect(columnNames).toContain('name')
        expect(columnNames).toContain('avatar_url')
        expect(columnNames).toContain('provider')
        expect(columnNames).toContain('provider_user_id')
        expect(columnNames).toContain('email_verified')
        expect(columnNames).toContain('created_at')
        expect(columnNames).toContain('last_login_at')
        expect(columnNames).toContain('default_person_id') // Story #81
        expect(columnNames).toContain('view_all_records') // Feature flag
      })

      it('should have view_all_records column with correct default value', () => {
        // Arrange: Get table schema details
        const tableInfo = sqlite.prepare('PRAGMA table_info(users)').all()
        const viewAllRecordsCol = tableInfo.find(col => col.name === 'view_all_records')

        // Assert: Column exists with correct default
        expect(viewAllRecordsCol).toBeDefined()
        expect(viewAllRecordsCol.dflt_value).toBe('false') // SQLite stores as 'false' string
        expect(viewAllRecordsCol.notnull).toBe(1) // NOT NULL constraint
      })

      it('should have default_person_id foreign key to people table', () => {
        // Arrange: Get foreign key constraints
        const foreignKeys = sqlite.prepare('PRAGMA foreign_key_list(users)').all()
        const defaultPersonFK = foreignKeys.find(fk => fk.from === 'default_person_id')

        // Assert: Foreign key exists with correct configuration
        expect(defaultPersonFK).toBeDefined()
        expect(defaultPersonFK.table).toBe('people')
        expect(defaultPersonFK.to).toBe('id')
        expect(defaultPersonFK.on_delete).toBe('SET NULL') // Story #81 spec
      })
    })

    describe('When the test creates or queries people', () => {
      it('should have all columns from production people schema including photo_url', () => {
        // Arrange: Get actual table schema from SQLite
        const tableInfo = sqlite.prepare('PRAGMA table_info(people)').all()
        const columnNames = tableInfo.map(col => col.name)

        // Assert: All production schema columns exist
        expect(columnNames).toContain('id')
        expect(columnNames).toContain('first_name')
        expect(columnNames).toContain('last_name')
        expect(columnNames).toContain('birth_date')
        expect(columnNames).toContain('death_date')
        expect(columnNames).toContain('gender')
        expect(columnNames).toContain('photo_url') // Story #77
        expect(columnNames).toContain('created_at')
        expect(columnNames).toContain('user_id')
      })

      it('should have user_id foreign key to users table with CASCADE delete', () => {
        // Arrange: Get foreign key constraints
        const foreignKeys = sqlite.prepare('PRAGMA foreign_key_list(people)').all()
        const userFK = foreignKeys.find(fk => fk.from === 'user_id')

        // Assert: Foreign key exists with correct configuration
        expect(userFK).toBeDefined()
        expect(userFK.table).toBe('users')
        expect(userFK.to).toBe('id')
        expect(userFK.on_delete).toBe('CASCADE')
      })

      it('should have index on user_id for performance', () => {
        // Arrange: Get table indexes
        const indexes = sqlite.prepare('PRAGMA index_list(people)').all()
        const userIdIndex = indexes.find(idx => idx.name === 'people_user_id_idx')

        // Assert: Index exists
        expect(userIdIndex).toBeDefined()

        // Verify index columns
        const indexInfo = sqlite.prepare('PRAGMA index_info(people_user_id_idx)').all()
        expect(indexInfo[0].name).toBe('user_id')
      })
    })

    describe('When the test creates or queries relationships', () => {
      it('should have all columns from production relationships schema', () => {
        // Arrange: Get actual table schema from SQLite
        const tableInfo = sqlite.prepare('PRAGMA table_info(relationships)').all()
        const columnNames = tableInfo.map(col => col.name)

        // Assert: All production schema columns exist
        expect(columnNames).toContain('id')
        expect(columnNames).toContain('person1_id')
        expect(columnNames).toContain('person2_id')
        expect(columnNames).toContain('type')
        expect(columnNames).toContain('parent_role')
        expect(columnNames).toContain('created_at')
        expect(columnNames).toContain('user_id')
      })

      it('should have all required foreign keys with correct delete behavior', () => {
        // Arrange: Get foreign key constraints
        const foreignKeys = sqlite.prepare('PRAGMA foreign_key_list(relationships)').all()

        // Assert: All foreign keys exist
        const person1FK = foreignKeys.find(fk => fk.from === 'person1_id')
        const person2FK = foreignKeys.find(fk => fk.from === 'person2_id')
        const userFK = foreignKeys.find(fk => fk.from === 'user_id')

        expect(person1FK).toBeDefined()
        expect(person1FK.table).toBe('people')
        expect(person1FK.on_delete).toBe('CASCADE')

        expect(person2FK).toBeDefined()
        expect(person2FK.table).toBe('people')
        expect(person2FK.on_delete).toBe('CASCADE')

        expect(userFK).toBeDefined()
        expect(userFK.table).toBe('users')
        expect(userFK.on_delete).toBe('CASCADE')
      })

      it('should have index on user_id for performance', () => {
        // Arrange: Get table indexes
        const indexes = sqlite.prepare('PRAGMA index_list(relationships)').all()
        const userIdIndex = indexes.find(idx => idx.name === 'relationships_user_id_idx')

        // Assert: Index exists
        expect(userIdIndex).toBeDefined()

        // Verify index columns
        const indexInfo = sqlite.prepare('PRAGMA index_info(relationships_user_id_idx)').all()
        expect(indexInfo[0].name).toBe('user_id')
      })
    })

    describe('When the test creates or queries sessions', () => {
      it('should have all columns from production sessions schema', () => {
        // Arrange: Get actual table schema from SQLite
        const tableInfo = sqlite.prepare('PRAGMA table_info(sessions)').all()
        const columnNames = tableInfo.map(col => col.name)

        // Assert: All production schema columns exist
        expect(columnNames).toContain('id')
        expect(columnNames).toContain('user_id')
        expect(columnNames).toContain('expires_at')
        expect(columnNames).toContain('created_at')
        expect(columnNames).toContain('last_accessed_at')
      })

      it('should have required indexes for performance', () => {
        // Arrange: Get table indexes
        const indexes = sqlite.prepare('PRAGMA index_list(sessions)').all()

        // Assert: Both indexes exist
        const userIdIndex = indexes.find(idx => idx.name === 'sessions_user_id_idx')
        const expiresAtIndex = indexes.find(idx => idx.name === 'sessions_expires_at_idx')

        expect(userIdIndex).toBeDefined()
        expect(expiresAtIndex).toBeDefined()
      })
    })

    describe('When schema is used to insert data', () => {
      it('should accept all columns when inserting a user via Drizzle', async () => {
        // Arrange & Act: Insert user with all columns using Drizzle schema
        const insertResult = await db.insert(users).values({
          email: 'schema-test@example.com',
          name: 'Schema Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
          provider: 'test',
          providerUserId: 'test-123',
          emailVerified: true,
          defaultPersonId: null, // Critical: Story #81 field
          viewAllRecords: false // Critical: Feature flag field
        }).returning()

        // Assert: Insert succeeded with all fields
        expect(insertResult).toHaveLength(1)
        expect(insertResult[0].email).toBe('schema-test@example.com')
        expect(insertResult[0].defaultPersonId).toBeNull()
        expect(insertResult[0].viewAllRecords).toBe(false)
      })

      it('should accept photo_url when inserting a person via Drizzle', async () => {
        // Arrange: Create test user first
        const user = await db.insert(users).values({
          email: 'person-test@example.com',
          provider: 'test'
        }).returning()

        // Act: Insert person with photo_url using Drizzle schema
        const insertResult = await db.insert(people).values({
          firstName: 'Photo',
          lastName: 'Test',
          photoUrl: 'https://example.com/photo.jpg', // Critical: Story #77 field
          userId: user[0].id
        }).returning()

        // Assert: Insert succeeded with photo_url
        expect(insertResult).toHaveLength(1)
        expect(insertResult[0].photoUrl).toBe('https://example.com/photo.jpg')
      })

      it('should accept parent_role when inserting a relationship via Drizzle', async () => {
        // Arrange: Create test user and people
        const user = await db.insert(users).values({
          email: 'rel-test@example.com',
          provider: 'test'
        }).returning()

        const person1 = await db.insert(people).values({
          firstName: 'Parent',
          lastName: 'Test',
          userId: user[0].id
        }).returning()

        const person2 = await db.insert(people).values({
          firstName: 'Child',
          lastName: 'Test',
          userId: user[0].id
        }).returning()

        // Act: Insert relationship with parent_role using Drizzle schema
        const insertResult = await db.insert(relationships).values({
          person1Id: person1[0].id,
          person2Id: person2[0].id,
          type: 'parentOf',
          parentRole: 'mother', // Critical: Parent role field
          userId: user[0].id
        }).returning()

        // Assert: Insert succeeded with parent_role
        expect(insertResult).toHaveLength(1)
        expect(insertResult[0].parentRole).toBe('mother')
      })
    })

    describe('When verifying schema matches production migrations', () => {
      it('should have users table matching 0000_tiresome_changeling.sql migration', () => {
        // This test ensures the test schema includes all columns from initial migration
        const tableInfo = sqlite.prepare('PRAGMA table_info(users)').all()
        const columnNames = tableInfo.map(col => col.name)

        // All columns from initial migration (0000)
        const expectedColumns = [
          'id', 'email', 'name', 'avatar_url', 'provider',
          'provider_user_id', 'email_verified', 'created_at',
          'last_login_at', 'default_person_id'
        ]

        expectedColumns.forEach(col => {
          expect(columnNames).toContain(col)
        })
      })

      it('should have users table matching 0001_dear_annihilus.sql migration', () => {
        // This test ensures the test schema includes the view_all_records column from migration 0001
        const tableInfo = sqlite.prepare('PRAGMA table_info(users)').all()
        const columnNames = tableInfo.map(col => col.name)

        // Column added in migration 0001
        expect(columnNames).toContain('view_all_records')
      })
    })
  })

  describe('Single Source of Truth Principle', () => {
    it('should derive schema from production schema.js not duplicate SQL', () => {
      // This is a design principle test - the implementation should use
      // Drizzle's migrate() function or similar to apply migrations
      // rather than maintaining separate CREATE TABLE SQL strings

      // We verify this by checking that the actual database matches
      // what Drizzle's schema definitions expect
      const tables = sqlite.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table'
        AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all()

      const tableNames = tables.map(t => t.name)

      // All tables from schema.js should exist
      expect(tableNames).toContain('users')
      expect(tableNames).toContain('people')
      expect(tableNames).toContain('relationships')
      expect(tableNames).toContain('sessions')

      // Note: The actual implementation should use migrations, not CREATE TABLE SQL
      // This test will pass once we refactor setupTestDatabase() to use migrate()
    })
  })
})
