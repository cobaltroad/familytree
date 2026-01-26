import { describe, test, expect } from 'vitest'
import { people, relationships } from './schema.js'

describe('Database Schema Definition', () => {
  describe('People Table Schema', () => {
    test('should define people table with correct structure', () => {
      // Test that people table exists
      expect(people).toBeDefined()

      // Test table name
      expect(people[Symbol.for('drizzle:Name')]).toBe('people')
    })

    test('should have all required columns', () => {
      // Test that all expected columns are defined in the table
      const columns = people[Symbol.for('drizzle:Columns')]

      expect(columns).toHaveProperty('id')
      expect(columns).toHaveProperty('firstName')
      expect(columns).toHaveProperty('lastName')
      expect(columns).toHaveProperty('birthDate')
      expect(columns).toHaveProperty('deathDate')
      expect(columns).toHaveProperty('gender')
      expect(columns).toHaveProperty('createdAt')
    })

    test('should have birthSurname column for AC1', () => {
      const columns = people[Symbol.for('drizzle:Columns')]
      expect(columns).toHaveProperty('birthSurname')
      expect(columns.birthSurname.dataType).toBe('string')
      expect(columns.birthSurname.notNull).toBe(false)
    })

    test('should have nickname column for AC1', () => {
      const columns = people[Symbol.for('drizzle:Columns')]
      expect(columns).toHaveProperty('nickname')
      expect(columns.nickname.dataType).toBe('string')
      expect(columns.nickname.notNull).toBe(false)
    })

    test('should have correct column types', () => {
      const columns = people[Symbol.for('drizzle:Columns')]

      // ID should be integer primary key
      expect(columns.id.dataType).toBe('number')
      expect(columns.id.primary).toBe(true)

      // Text columns
      expect(columns.firstName.dataType).toBe('string')
      expect(columns.lastName.dataType).toBe('string')
      expect(columns.gender.dataType).toBe('string')

      // Date columns (stored as text in SQLite)
      expect(columns.birthDate.dataType).toBe('string')
      expect(columns.deathDate.dataType).toBe('string')

      // Timestamp column
      expect(columns.createdAt.dataType).toBe('string')
    })

    test('should have correct NOT NULL constraints', () => {
      const columns = people[Symbol.for('drizzle:Columns')]

      // Required fields
      expect(columns.firstName.notNull).toBe(true)
      expect(columns.lastName.notNull).toBe(true)

      // Optional fields
      expect(columns.birthDate.notNull).toBe(false)
      expect(columns.deathDate.notNull).toBe(false)
      expect(columns.gender.notNull).toBe(false)
    })
  })

  describe('Relationships Table Schema', () => {
    test('should define relationships table with correct structure', () => {
      // Test that relationships table exists
      expect(relationships).toBeDefined()

      // Test table name
      expect(relationships[Symbol.for('drizzle:Name')]).toBe('relationships')
    })

    test('should have all required columns', () => {
      const columns = relationships[Symbol.for('drizzle:Columns')]

      expect(columns).toHaveProperty('id')
      expect(columns).toHaveProperty('person1Id')
      expect(columns).toHaveProperty('person2Id')
      expect(columns).toHaveProperty('type')
      expect(columns).toHaveProperty('parentRole')
      expect(columns).toHaveProperty('createdAt')
    })

    test('should have correct column types', () => {
      const columns = relationships[Symbol.for('drizzle:Columns')]

      // ID should be integer primary key
      expect(columns.id.dataType).toBe('number')
      expect(columns.id.primary).toBe(true)

      // Foreign key columns
      expect(columns.person1Id.dataType).toBe('number')
      expect(columns.person2Id.dataType).toBe('number')

      // Text columns
      expect(columns.type.dataType).toBe('string')
      expect(columns.parentRole.dataType).toBe('string')

      // Timestamp column
      expect(columns.createdAt.dataType).toBe('string')
    })

    test('should have correct NOT NULL constraints', () => {
      const columns = relationships[Symbol.for('drizzle:Columns')]

      // Required fields
      expect(columns.person1Id.notNull).toBe(true)
      expect(columns.person2Id.notNull).toBe(true)
      expect(columns.type.notNull).toBe(true)

      // Optional field
      expect(columns.parentRole.notNull).toBe(false)
    })

    test('should have foreign key references to people table', () => {
      // Check that the table has foreign key definitions
      const foreignKeys = relationships[Symbol.for('drizzle:SQLiteInlineForeignKeys')]

      expect(foreignKeys).toBeDefined()
      expect(Array.isArray(foreignKeys)).toBe(true)
      // Relationships table has 2 FKs: person1_id and person2_id (both to people)
      expect(foreignKeys.length).toBe(2)

      // Verify all foreign keys have proper references
      foreignKeys.forEach(fk => {
        expect(fk.reference).toBeDefined()
        expect(typeof fk.reference).toBe('function')
      })
    })
  })
})
