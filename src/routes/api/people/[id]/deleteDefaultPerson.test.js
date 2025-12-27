import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { DELETE } from './+server.js'
import { setupTestDatabase, createMockAuthenticatedEvent } from '$lib/server/testHelpers.js'

/**
 * Test suite for Default Person Deletion Prevention
 * Story #83: Prevent Deletion of User's Default Person
 *
 * Tests that:
 * - User CANNOT delete their own default person (403 Forbidden)
 * - User CAN delete other people they own
 * - User CAN delete people even if another user has them as default
 */
describe('Story #83: Prevent Deletion of Default Person', () => {
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

  it('should return 403 when trying to delete own default person', async () => {
    // Create person
    const personResult = sqlite
      .prepare(
        `INSERT INTO people (first_name, last_name, user_id) VALUES (?, ?, ?) RETURNING id`
      )
      .get('John', 'Doe', userId)

    const personId = personResult.id

    // Set as default person
    sqlite.prepare(`UPDATE users SET default_person_id = ? WHERE id = ?`).run(personId, userId)

    // Try to delete
    const event = createMockAuthenticatedEvent(db, null, { params: { id: String(personId) } })
    const response = await DELETE(event)

    // Assert
    expect(response.status).toBe(403)
    const errorText = await response.text()
    expect(errorText).toContain('Cannot delete your own profile')

    // Verify person was NOT deleted
    const person = sqlite.prepare('SELECT * FROM people WHERE id = ?').get(personId)
    expect(person).toBeDefined()
  })

  it('should allow deleting non-default person', async () => {
    // Create default person
    const defaultPersonResult = sqlite
      .prepare(
        `INSERT INTO people (first_name, last_name, user_id) VALUES (?, ?, ?) RETURNING id`
      )
      .get('John', 'Doe', userId)

    const defaultPersonId = defaultPersonResult.id

    // Set as default person
    sqlite.prepare(`UPDATE users SET default_person_id = ? WHERE id = ?`).run(defaultPersonId, userId)

    // Create another person (not default)
    const otherPersonResult = sqlite
      .prepare(
        `INSERT INTO people (first_name, last_name, user_id) VALUES (?, ?, ?) RETURNING id`
      )
      .get('Jane', 'Smith', userId)

    const otherPersonId = otherPersonResult.id

    // Try to delete the non-default person
    const event = createMockAuthenticatedEvent(db, null, {
      params: { id: String(otherPersonId) }
    })
    const response = await DELETE(event)

    // Assert
    expect(response.status).toBe(204)

    // Verify non-default person was deleted
    const deletedPerson = sqlite.prepare('SELECT * FROM people WHERE id = ?').get(otherPersonId)
    expect(deletedPerson).toBeUndefined()

    // Verify default person still exists
    const defaultPerson = sqlite.prepare('SELECT * FROM people WHERE id = ?').get(defaultPersonId)
    expect(defaultPerson).toBeDefined()
  })

  it('should allow deleting person without default person set', async () => {
    // User has no default person (default_person_id is NULL)

    // Create person
    const personResult = sqlite
      .prepare(
        `INSERT INTO people (first_name, last_name, user_id) VALUES (?, ?, ?) RETURNING id`
      )
      .get('John', 'Doe', userId)

    const personId = personResult.id

    // Try to delete
    const event = createMockAuthenticatedEvent(db, null, { params: { id: String(personId) } })
    const response = await DELETE(event)

    // Assert
    expect(response.status).toBe(204)

    // Verify person was deleted
    const person = sqlite.prepare('SELECT * FROM people WHERE id = ?').get(personId)
    expect(person).toBeUndefined()
  })

  it('should allow deleting person that is another user\'s default', async () => {
    // Create second user
    const secondUserResult = sqlite
      .prepare(
        `INSERT INTO users (email, name, provider) VALUES (?, ?, ?) RETURNING id`
      )
      .run('user2@example.com', 'User 2', 'test')

    const secondUserId = secondUserResult.lastInsertRowid

    // Create person owned by FIRST user
    const personResult = sqlite
      .prepare(
        `INSERT INTO people (first_name, last_name, user_id) VALUES (?, ?, ?) RETURNING id`
      )
      .get('Jane', 'Smith', userId)

    const personId = personResult.id

    // Set as SECOND user's default person (edge case - shouldn't happen normally)
    sqlite.prepare(`UPDATE users SET default_person_id = ? WHERE id = ?`).run(personId, secondUserId)

    // First user tries to delete the person (they own it, even though it's second user's default)
    const event = createMockAuthenticatedEvent(db, null, { params: { id: String(personId) } })
    const response = await DELETE(event)

    // Assert - should succeed (we only block deletion of OWN default person)
    expect(response.status).toBe(204)

    // Verify person was deleted
    const person = sqlite.prepare('SELECT * FROM people WHERE id = ?').get(personId)
    expect(person).toBeUndefined()

    // Verify second user's default_person_id was set to NULL (via ON DELETE SET NULL)
    const secondUser = sqlite.prepare('SELECT * FROM users WHERE id = ?').get(secondUserId)
    expect(secondUser.default_person_id).toBe(null)
  })

  it('should return 404 when deleting non-existent person', async () => {
    // Try to delete person that doesn't exist
    const event = createMockAuthenticatedEvent(db, null, { params: { id: '99999' } })
    const response = await DELETE(event)

    expect(response.status).toBe(404)
  })

  it('should return 403 when trying to delete another user\'s person', async () => {
    // Create second user
    const secondUserResult = sqlite
      .prepare(
        `INSERT INTO users (email, name, provider) VALUES (?, ?, ?) RETURNING id`
      )
      .run('user2@example.com', 'User 2', 'test')

    const secondUserId = secondUserResult.lastInsertRowid

    // Create person owned by SECOND user
    const personResult = sqlite
      .prepare(
        `INSERT INTO people (first_name, last_name, user_id) VALUES (?, ?, ?) RETURNING id`
      )
      .get('Jane', 'Smith', secondUserId)

    const personId = personResult.id

    // First user tries to delete second user's person
    const event = createMockAuthenticatedEvent(db, null, { params: { id: String(personId) } })
    const response = await DELETE(event)

    // Assert - should fail with 403 (ownership check)
    expect(response.status).toBe(403)
    const errorText = await response.text()
    expect(errorText).toContain('Forbidden')
  })
})
