import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { setupTestDatabase, createMockAuthenticatedEvent, createMockSession } from '$lib/server/testHelpers.js'
import { PATCH } from './+server.js'
import { people } from '$lib/db/schema.js'
import { eq } from 'drizzle-orm'

describe('PATCH /api/user/default-person - Update Default Person (Issue #128)', () => {
  let sqlite
  let db
  let userId

  beforeEach(async () => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)
    userId = await setupTestDatabase(sqlite, db)
  })

  afterEach(() => {
    sqlite.close()
  })

  describe('AC1: Successfully set default person', () => {
    it('should set default_person_id for authenticated user with valid person ID', async () => {
      // Create a test person
      const personResult = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Doe',
        userId: userId
      }).returning()
      const personId = personResult[0].id

      // Update default person
      const mockEvent = createMockAuthenticatedEvent(db, null, {
        request: new Request('http://localhost/api/user/default-person', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId })
        })
      })

      const response = await PATCH(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.personId).toBe(personId)

      // Verify database was updated
      const userResult = sqlite.prepare('SELECT default_person_id FROM users WHERE id = ?').get(userId)
      expect(userResult.default_person_id).toBe(personId)
    })

    it('should return updated personId in response', async () => {
      // Create a test person
      const personResult = await db.insert(people).values({
        firstName: 'Jane',
        lastName: 'Smith',
        userId: userId
      }).returning()
      const personId = personResult[0].id

      const mockEvent = createMockAuthenticatedEvent(db, null, {
        request: new Request('http://localhost/api/user/default-person', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId })
        })
      })

      const response = await PATCH(mockEvent)
      const data = await response.json()

      expect(data).toEqual({
        success: true,
        personId: personId
      })
    })
  })

  describe('AC2: Multi-user support', () => {
    it('should allow multiple users to claim the same person as their default', async () => {
      // Create a shared person
      const personResult = await db.insert(people).values({
        firstName: 'Shared',
        lastName: 'Ancestor',
        userId: userId
      }).returning()
      const sharedPersonId = personResult[0].id

      // Create second user
      const user2Result = sqlite.prepare(`
        INSERT INTO users (email, name, provider)
        VALUES (?, ?, ?)
      `).run('user2@example.com', 'User Two', 'test')
      const user2Id = user2Result.lastInsertRowid

      // First user claims the person
      const mockEvent1 = createMockAuthenticatedEvent(db, null, {
        request: new Request('http://localhost/api/user/default-person', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId: sharedPersonId })
        })
      })

      const response1 = await PATCH(mockEvent1)
      expect(response1.status).toBe(200)

      // Second user claims the same person
      const session2 = createMockSession(user2Id, 'user2@example.com', 'User Two')
      const mockEvent2 = createMockAuthenticatedEvent(db, session2, {
        request: new Request('http://localhost/api/user/default-person', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId: sharedPersonId })
        })
      })

      const response2 = await PATCH(mockEvent2)
      const data2 = await response2.json()

      expect(response2.status).toBe(200)
      expect(data2.success).toBe(true)
      expect(data2.personId).toBe(sharedPersonId)

      // Verify both users have the same default person
      const user1Default = sqlite.prepare('SELECT default_person_id FROM users WHERE id = ?').get(userId)
      const user2Default = sqlite.prepare('SELECT default_person_id FROM users WHERE id = ?').get(user2Id)

      expect(user1Default.default_person_id).toBe(sharedPersonId)
      expect(user2Default.default_person_id).toBe(sharedPersonId)
    })
  })

  describe('AC3: Invalid person ID', () => {
    it('should return 404 if person does not exist', async () => {
      const nonExistentPersonId = 99999

      const mockEvent = createMockAuthenticatedEvent(db, null, {
        request: new Request('http://localhost/api/user/default-person', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId: nonExistentPersonId })
        })
      })

      const response = await PATCH(mockEvent)
      const text = await response.text()

      expect(response.status).toBe(404)
      expect(text).toBe('Person not found')

      // Verify database was NOT updated
      const userResult = sqlite.prepare('SELECT default_person_id FROM users WHERE id = ?').get(userId)
      expect(userResult.default_person_id).toBeNull()
    })

    it('should validate person exists before updating', async () => {
      const mockEvent = createMockAuthenticatedEvent(db, null, {
        request: new Request('http://localhost/api/user/default-person', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId: 12345 })
        })
      })

      const response = await PATCH(mockEvent)

      expect(response.status).toBe(404)
    })
  })

  describe('AC4: Missing person ID', () => {
    it('should return 400 if personId is not provided', async () => {
      const mockEvent = createMockAuthenticatedEvent(db, null, {
        request: new Request('http://localhost/api/user/default-person', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
      })

      const response = await PATCH(mockEvent)
      const text = await response.text()

      expect(response.status).toBe(400)
      expect(text).toBe('personId is required')
    })

    it('should return 400 if personId is null', async () => {
      const mockEvent = createMockAuthenticatedEvent(db, null, {
        request: new Request('http://localhost/api/user/default-person', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId: null })
        })
      })

      const response = await PATCH(mockEvent)

      expect(response.status).toBe(400)
    })

    it('should return 400 if personId is not a number', async () => {
      const mockEvent = createMockAuthenticatedEvent(db, null, {
        request: new Request('http://localhost/api/user/default-person', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId: 'invalid' })
        })
      })

      const response = await PATCH(mockEvent)
      const text = await response.text()

      expect(response.status).toBe(400)
      expect(text).toBe('personId must be a number')
    })

    it('should return 400 for invalid JSON', async () => {
      const mockEvent = createMockAuthenticatedEvent(db, null, {
        request: new Request('http://localhost/api/user/default-person', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json'
        })
      })

      const response = await PATCH(mockEvent)
      const text = await response.text()

      expect(response.status).toBe(400)
      expect(text).toBe('Invalid JSON')
    })
  })

  describe('AC5: Unauthenticated request', () => {
    it('should return 401 if user is not authenticated', async () => {
      // Create event without session
      const mockEvent = {
        locals: {
          db: db,
          getSession: async () => null
        },
        request: new Request('http://localhost/api/user/default-person', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId: 1 })
        })
      }

      const response = await PATCH(mockEvent)
      const text = await response.text()

      expect(response.status).toBe(401)
      expect(text).toBe('Authentication required')
    })

    it('should require valid session with user ID', async () => {
      // Create event with invalid session (no user)
      const mockEvent = {
        locals: {
          db: db,
          getSession: async () => ({ user: null })
        },
        request: new Request('http://localhost/api/user/default-person', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId: 1 })
        })
      }

      const response = await PATCH(mockEvent)

      expect(response.status).toBe(401)
    })
  })

  describe('AC6: Replace existing default person', () => {
    it('should update from one default person to another', async () => {
      // Create first person
      const person1Result = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Doe',
        userId: userId
      }).returning()
      const person1Id = person1Result[0].id

      // Create second person
      const person2Result = await db.insert(people).values({
        firstName: 'Jane',
        lastName: 'Smith',
        userId: userId
      }).returning()
      const person2Id = person2Result[0].id

      // Set first person as default
      const mockEvent1 = createMockAuthenticatedEvent(db, null, {
        request: new Request('http://localhost/api/user/default-person', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId: person1Id })
        })
      })

      const response1 = await PATCH(mockEvent1)
      expect(response1.status).toBe(200)

      // Verify first person is set
      let userResult = sqlite.prepare('SELECT default_person_id FROM users WHERE id = ?').get(userId)
      expect(userResult.default_person_id).toBe(person1Id)

      // Replace with second person
      const mockEvent2 = createMockAuthenticatedEvent(db, null, {
        request: new Request('http://localhost/api/user/default-person', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId: person2Id })
        })
      })

      const response2 = await PATCH(mockEvent2)
      const data2 = await response2.json()

      expect(response2.status).toBe(200)
      expect(data2.success).toBe(true)
      expect(data2.personId).toBe(person2Id)

      // Verify second person is now set
      userResult = sqlite.prepare('SELECT default_person_id FROM users WHERE id = ?').get(userId)
      expect(userResult.default_person_id).toBe(person2Id)
    })

    it('should handle replacing null with a person', async () => {
      // Verify user starts with null default_person_id
      let userResult = sqlite.prepare('SELECT default_person_id FROM users WHERE id = ?').get(userId)
      expect(userResult.default_person_id).toBeNull()

      // Create a person
      const personResult = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Doe',
        userId: userId
      }).returning()
      const personId = personResult[0].id

      // Set default person
      const mockEvent = createMockAuthenticatedEvent(db, null, {
        request: new Request('http://localhost/api/user/default-person', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId })
        })
      })

      const response = await PATCH(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.personId).toBe(personId)

      // Verify person is now set
      userResult = sqlite.prepare('SELECT default_person_id FROM users WHERE id = ?').get(userId)
      expect(userResult.default_person_id).toBe(personId)
    })
  })

  describe('Edge Cases', () => {
    it('should handle setting the same person as default multiple times', async () => {
      // Create a person
      const personResult = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Doe',
        userId: userId
      }).returning()
      const personId = personResult[0].id

      // Set as default twice
      const mockEvent = createMockAuthenticatedEvent(db, null, {
        request: new Request('http://localhost/api/user/default-person', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId })
        })
      })

      const response1 = await PATCH(mockEvent)
      expect(response1.status).toBe(200)

      // Create new event with same data
      const mockEvent2 = createMockAuthenticatedEvent(db, null, {
        request: new Request('http://localhost/api/user/default-person', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId })
        })
      })

      const response2 = await PATCH(mockEvent2)
      const data2 = await response2.json()

      expect(response2.status).toBe(200)
      expect(data2.personId).toBe(personId)
    })

    it('should handle zero as personId (invalid)', async () => {
      const mockEvent = createMockAuthenticatedEvent(db, null, {
        request: new Request('http://localhost/api/user/default-person', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId: 0 })
        })
      })

      const response = await PATCH(mockEvent)

      expect(response.status).toBe(404)
    })

    it('should handle negative personId (invalid)', async () => {
      const mockEvent = createMockAuthenticatedEvent(db, null, {
        request: new Request('http://localhost/api/user/default-person', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId: -1 })
        })
      })

      const response = await PATCH(mockEvent)

      expect(response.status).toBe(404)
    })
  })
})
