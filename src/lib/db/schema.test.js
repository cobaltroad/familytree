import { describe, test, expect } from 'vitest'
import { people, relationships, users, sessions } from './schema.js'

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
      // Relationships table has 3 FKs: person1_id, person2_id (both to people), and user_id (to users)
      expect(foreignKeys.length).toBe(3)

      // Verify all foreign keys have proper references
      foreignKeys.forEach(fk => {
        expect(fk.reference).toBeDefined()
        expect(typeof fk.reference).toBe('function')
      })
    })
  })

  describe('Users Table Schema', () => {
    test('should define users table with correct structure', () => {
      // Test that users table exists
      expect(users).toBeDefined()

      // Test table name
      expect(users[Symbol.for('drizzle:Name')]).toBe('users')
    })

    test('should have all required columns', () => {
      const columns = users[Symbol.for('drizzle:Columns')]

      expect(columns).toHaveProperty('id')
      expect(columns).toHaveProperty('email')
      expect(columns).toHaveProperty('name')
      expect(columns).toHaveProperty('avatarUrl')
      expect(columns).toHaveProperty('provider')
      expect(columns).toHaveProperty('providerUserId')
      expect(columns).toHaveProperty('emailVerified')
      expect(columns).toHaveProperty('createdAt')
      expect(columns).toHaveProperty('lastLoginAt')
    })

    test('should have correct column types', () => {
      const columns = users[Symbol.for('drizzle:Columns')]

      // ID should be integer primary key
      expect(columns.id.dataType).toBe('number')
      expect(columns.id.primary).toBe(true)

      // Text columns
      expect(columns.email.dataType).toBe('string')
      expect(columns.name.dataType).toBe('string')
      expect(columns.avatarUrl.dataType).toBe('string')
      expect(columns.provider.dataType).toBe('string')
      expect(columns.providerUserId.dataType).toBe('string')

      // Boolean column (stored as integer in SQLite, but Drizzle reports as boolean)
      expect(columns.emailVerified.dataType).toBe('boolean')

      // Timestamp columns
      expect(columns.createdAt.dataType).toBe('string')
      expect(columns.lastLoginAt.dataType).toBe('string')
    })

    test('should have correct NOT NULL constraints', () => {
      const columns = users[Symbol.for('drizzle:Columns')]

      // Required fields
      expect(columns.email.notNull).toBe(true)
      expect(columns.provider.notNull).toBe(true)

      // Optional fields
      expect(columns.name.notNull).toBe(false)
      expect(columns.avatarUrl.notNull).toBe(false)
      expect(columns.providerUserId.notNull).toBe(false)
      expect(columns.lastLoginAt.notNull).toBe(false)
    })

    test('should have unique constraint on email', () => {
      const columns = users[Symbol.for('drizzle:Columns')]

      // Email should be unique
      expect(columns.email.isUnique).toBe(true)
    })

    test('should have default value for emailVerified', () => {
      const columns = users[Symbol.for('drizzle:Columns')]

      // emailVerified should default to true (1 in SQLite)
      expect(columns.emailVerified.hasDefault).toBe(true)
    })

    test('should have index on email column', () => {
      const builder = users[Symbol.for('drizzle:ExtraConfigBuilder')]
      expect(builder).toBeDefined()
      expect(typeof builder).toBe('function')

      const config = builder(users[Symbol.for('drizzle:Columns')])
      expect(config).toHaveProperty('emailIdx')
      expect(config.emailIdx).toBeDefined()
    })

    test('should have index on providerUserId column', () => {
      const builder = users[Symbol.for('drizzle:ExtraConfigBuilder')]
      expect(builder).toBeDefined()

      const config = builder(users[Symbol.for('drizzle:Columns')])
      expect(config).toHaveProperty('providerUserIdIdx')
      expect(config.providerUserIdIdx).toBeDefined()
    })
  })

  describe('Sessions Table Schema', () => {
    test('should define sessions table with correct structure', () => {
      // Test that sessions table exists
      expect(sessions).toBeDefined()

      // Test table name
      expect(sessions[Symbol.for('drizzle:Name')]).toBe('sessions')
    })

    test('should have all required columns', () => {
      const columns = sessions[Symbol.for('drizzle:Columns')]

      expect(columns).toHaveProperty('id')
      expect(columns).toHaveProperty('userId')
      expect(columns).toHaveProperty('expiresAt')
      expect(columns).toHaveProperty('createdAt')
      expect(columns).toHaveProperty('lastAccessedAt')
    })

    test('should have correct column types', () => {
      const columns = sessions[Symbol.for('drizzle:Columns')]

      // ID should be text primary key (UUID)
      expect(columns.id.dataType).toBe('string')
      expect(columns.id.primary).toBe(true)

      // Foreign key column
      expect(columns.userId.dataType).toBe('number')

      // Timestamp columns
      expect(columns.expiresAt.dataType).toBe('string')
      expect(columns.createdAt.dataType).toBe('string')
      expect(columns.lastAccessedAt.dataType).toBe('string')
    })

    test('should have correct NOT NULL constraints', () => {
      const columns = sessions[Symbol.for('drizzle:Columns')]

      // Required fields
      expect(columns.id.notNull).toBe(true)
      expect(columns.userId.notNull).toBe(true)
      expect(columns.expiresAt.notNull).toBe(true)

      // Optional field
      expect(columns.lastAccessedAt.notNull).toBe(false)
    })

    test('should have foreign key reference to users table', () => {
      const foreignKeys = sessions[Symbol.for('drizzle:SQLiteInlineForeignKeys')]

      expect(foreignKeys).toBeDefined()
      expect(Array.isArray(foreignKeys)).toBe(true)
      expect(foreignKeys.length).toBe(1)

      // Verify foreign key references the users table
      const userFk = foreignKeys[0]
      expect(userFk.reference).toBeDefined()
      expect(typeof userFk.reference).toBe('function')
    })

    test('should have cascade delete on userId foreign key', () => {
      const foreignKeys = sessions[Symbol.for('drizzle:SQLiteInlineForeignKeys')]

      const userFk = foreignKeys[0]
      expect(userFk.onDelete).toBe('cascade')
    })

    test('should have index on userId column', () => {
      const builder = sessions[Symbol.for('drizzle:ExtraConfigBuilder')]
      expect(builder).toBeDefined()
      expect(typeof builder).toBe('function')

      const config = builder(sessions[Symbol.for('drizzle:Columns')])
      expect(config).toHaveProperty('userIdIdx')
      expect(config.userIdIdx).toBeDefined()
    })

    test('should have index on expiresAt column', () => {
      const builder = sessions[Symbol.for('drizzle:ExtraConfigBuilder')]
      expect(builder).toBeDefined()

      const config = builder(sessions[Symbol.for('drizzle:Columns')])
      expect(config).toHaveProperty('expiresAtIdx')
      expect(config.expiresAtIdx).toBeDefined()
    })
  })
})
