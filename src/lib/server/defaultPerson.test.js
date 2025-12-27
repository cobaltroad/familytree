import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import {
  setupTestDatabase,
  CREATE_USERS_TABLE_SQL,
  CREATE_PEOPLE_TABLE_SQL
} from './testHelpers.js'
import {
  createDefaultPersonFromProfile,
  shouldCreateDefaultPerson
} from './defaultPerson.js'

/**
 * Test suite for Default Person Creation
 * Story #81: Auto-Create Default Person from Facebook Profile
 *
 * Tests:
 * - shouldCreateDefaultPerson() - Checks if user needs a default person
 * - createDefaultPersonFromProfile() - Creates Person from Facebook profile
 */

describe('shouldCreateDefaultPerson', () => {
  let db
  let sqlite
  let userId

  beforeEach(async () => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)
    userId = await setupTestDatabase(sqlite, db)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should return true for user without default person', async () => {
    // User exists but has no default_person_id
    const result = await shouldCreateDefaultPerson(userId, db)
    expect(result).toBe(true)
  })

  it('should return false for user with default person', async () => {
    // Create a person
    const personResult = sqlite
      .prepare(
        `INSERT INTO people (first_name, last_name, user_id) VALUES (?, ?, ?) RETURNING id`
      )
      .get('John', 'Doe', userId)

    const personId = personResult.id

    // Link person to user as default
    sqlite.prepare(`UPDATE users SET default_person_id = ? WHERE id = ?`).run(personId, userId)

    const result = await shouldCreateDefaultPerson(userId, db)
    expect(result).toBe(false)
  })

  it('should return true if default person was deleted', async () => {
    // Create a person
    const personResult = sqlite
      .prepare(
        `INSERT INTO people (first_name, last_name, user_id) VALUES (?, ?, ?) RETURNING id`
      )
      .get('John', 'Doe', userId)

    const personId = personResult.id

    // Link person to user as default
    sqlite.prepare(`UPDATE users SET default_person_id = ? WHERE id = ?`).run(personId, userId)

    // Delete the person (should set default_person_id to NULL via ON DELETE SET NULL)
    sqlite.prepare(`DELETE FROM people WHERE id = ?`).run(personId)

    const result = await shouldCreateDefaultPerson(userId, db)
    expect(result).toBe(true)
  })

  it('should throw error for non-existent user', async () => {
    await expect(shouldCreateDefaultPerson(99999, db)).rejects.toThrow('User not found')
  })
})

describe('createDefaultPersonFromProfile', () => {
  let db
  let sqlite
  let userId

  beforeEach(async () => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)
    userId = await setupTestDatabase(sqlite, db)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should create person from complete Facebook profile', async () => {
    const facebookProfile = {
      id: '123456789',
      first_name: 'John',
      last_name: 'Doe',
      birthday: '03/14/1990',
      gender: 'male',
      picture: {
        data: {
          url: 'https://graph.facebook.com/v12.0/123456789/picture'
        }
      }
    }

    const person = await createDefaultPersonFromProfile(userId, facebookProfile, db)

    expect(person).toMatchObject({
      firstName: 'John',
      lastName: 'Doe',
      birthDate: '1990-03-14',
      gender: 'male',
      photoUrl: 'https://graph.facebook.com/v12.0/123456789/picture',
      userId: userId
    })
    expect(person.id).toBeDefined()

    // Verify person was saved to database
    const savedPerson = sqlite.prepare('SELECT * FROM people WHERE id = ?').get(person.id)
    expect(savedPerson.first_name).toBe('John')
    expect(savedPerson.last_name).toBe('Doe')
    expect(savedPerson.birth_date).toBe('1990-03-14')
    expect(savedPerson.gender).toBe('male')
    expect(savedPerson.photo_url).toBe('https://graph.facebook.com/v12.0/123456789/picture')
    expect(savedPerson.user_id).toBe(userId)

    // Verify user's default_person_id was updated
    const user = sqlite.prepare('SELECT * FROM users WHERE id = ?').get(userId)
    expect(user.default_person_id).toBe(person.id)
  })

  it('should create person with minimal profile (only name)', async () => {
    const facebookProfile = {
      id: '123456789',
      first_name: 'Jane',
      last_name: 'Smith'
      // No birthday, gender, or photo
    }

    const person = await createDefaultPersonFromProfile(userId, facebookProfile, db)

    expect(person).toMatchObject({
      firstName: 'Jane',
      lastName: 'Smith',
      birthDate: null,
      gender: null,
      photoUrl: null,
      userId: userId
    })

    // Verify user's default_person_id was updated
    const user = sqlite.prepare('SELECT * FROM users WHERE id = ?').get(userId)
    expect(user.default_person_id).toBe(person.id)
  })

  it('should handle single-name user (no last name)', async () => {
    const facebookProfile = {
      id: '123456789',
      name: 'Madonna',
      first_name: 'Madonna'
      // No last_name
    }

    const person = await createDefaultPersonFromProfile(userId, facebookProfile, db)

    expect(person.firstName).toBe('Madonna')
    expect(person.lastName).toBe('User') // Placeholder
  })

  it('should handle partial birthday (MM/DD only)', async () => {
    const facebookProfile = {
      id: '123456789',
      first_name: 'John',
      last_name: 'Doe',
      birthday: '03/14' // Year hidden by user
    }

    const person = await createDefaultPersonFromProfile(userId, facebookProfile, db)

    expect(person.birthDate).toBe(null) // Can't use partial date
  })

  it('should normalize Facebook gender values', async () => {
    const testCases = [
      { input: 'male', expected: 'male' },
      { input: 'female', expected: 'female' },
      { input: 'custom', expected: 'other' }
    ]

    for (const { input, expected } of testCases) {
      // Create new in-memory DB for each iteration
      const testSqlite = new Database(':memory:')
      const testDb = drizzle(testSqlite)
      const testUserId = await setupTestDatabase(testSqlite, testDb)

      const facebookProfile = {
        id: '123456789',
        first_name: 'Test',
        last_name: 'User',
        gender: input
      }

      const person = await createDefaultPersonFromProfile(testUserId, facebookProfile, testDb)
      expect(person.gender).toBe(expected)

      testSqlite.close()
    }
  })

  it('should throw error for non-existent user', async () => {
    const facebookProfile = {
      id: '123456789',
      first_name: 'John',
      last_name: 'Doe'
    }

    await expect(createDefaultPersonFromProfile(99999, facebookProfile, db)).rejects.toThrow(
      'User not found'
    )
  })

  it('should not create duplicate if user already has default person', async () => {
    const facebookProfile = {
      id: '123456789',
      first_name: 'John',
      last_name: 'Doe'
    }

    // Create first default person
    const person1 = await createDefaultPersonFromProfile(userId, facebookProfile, db)

    // Try to create again (should throw or skip)
    await expect(createDefaultPersonFromProfile(userId, facebookProfile, db)).rejects.toThrow(
      'User already has a default person'
    )

    // Verify only one person was created
    const people = sqlite.prepare('SELECT * FROM people WHERE user_id = ?').all(userId)
    expect(people).toHaveLength(1)
  })

  it('should work within a transaction (atomic create + link)', async () => {
    const facebookProfile = {
      id: '123456789',
      first_name: 'John',
      last_name: 'Doe'
    }

    const person = await createDefaultPersonFromProfile(userId, facebookProfile, db)

    // Verify both person and user link were created
    const savedPerson = sqlite.prepare('SELECT * FROM people WHERE id = ?').get(person.id)
    const user = sqlite.prepare('SELECT * FROM users WHERE id = ?').get(userId)

    expect(savedPerson).toBeDefined()
    expect(user.default_person_id).toBe(person.id)
  })
})
