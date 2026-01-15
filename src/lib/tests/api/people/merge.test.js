/**
 * Integration Tests for POST /api/people/merge
 * Story #110: Execute Person Merge with Relationship Transfer
 *
 * Tests the merge API endpoint with full database integration
 */

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { setupTestDatabase, createMockAuthenticatedEvent } from '../../../server/testHelpers.js'
import { POST } from '../../../../routes/api/people/merge/+server.js'
import { people, relationships } from '../../../db/schema.js'
import { eq, or } from 'drizzle-orm'

describe('POST /api/people/merge', () => {
  let sqlite
  let db
  let userId

  beforeEach(async () => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)
    userId = await setupTestDatabase(sqlite, db)
  })

  describe('authentication', () => {
    it('should return 401 when not authenticated', async () => {
      const event = {
        locals: {
          db,
          getSession: async () => null
        },
        request: new Request('http://localhost/api/people/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId: 1, targetId: 2 })
        })
      }

      const response = await POST(event)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('validation', () => {
    it('should return 400 when sourceId is missing', async () => {
      const event = createMockAuthenticatedEvent(db)
      event.request = new Request('http://localhost/api/people/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: 2 })
      })

      const response = await POST(event)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('sourceId')
    })

    it('should return 400 when targetId is missing', async () => {
      const event = createMockAuthenticatedEvent(db)
      event.request = new Request('http://localhost/api/people/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: 1 })
      })

      const response = await POST(event)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('targetId')
    })

    it('should return 400 when sourceId equals targetId', async () => {
      const event = createMockAuthenticatedEvent(db)
      event.request = new Request('http://localhost/api/people/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: 1, targetId: 1 })
      })

      const response = await POST(event)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Cannot merge person into themselves')
    })

    it('should return 404 when source person does not exist', async () => {
      const target = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Doe',
        userId
      }).returning().get()

      const event = createMockAuthenticatedEvent(db)
      event.request = new Request('http://localhost/api/people/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: 999, targetId: target.id })
      })

      const response = await POST(event)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toContain('Source person not found')
    })

    it('should return 404 when target person does not exist', async () => {
      const source = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Doe',
        userId
      }).returning().get()

      const event = createMockAuthenticatedEvent(db)
      event.request = new Request('http://localhost/api/people/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: source.id, targetId: 999 })
      })

      const response = await POST(event)

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toContain('Target person not found')
    })

    it('should return 403 when trying to merge into default person', async () => {
      const source = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Smith',
        userId
      }).returning().get()

      const target = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Doe',
        userId
      }).returning().get()

      // Set target as default person
      sqlite.prepare(`UPDATE users SET default_person_id = ? WHERE id = ?`).run(target.id, userId)

      const event = createMockAuthenticatedEvent(db)
      event.request = new Request('http://localhost/api/people/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: source.id, targetId: target.id })
      })

      const response = await POST(event)

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toContain('Cannot merge into your profile person')
    })
  })

  describe('successful merge', () => {
    it('should merge two people without relationships', async () => {
      const source = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Smith',
        birthDate: '1950',
        userId
      }).returning().get()

      const target = await db.insert(people).values({
        firstName: 'John',
        lastName: 'A. Smith',
        birthDate: '1950-03-15',
        userId
      }).returning().get()

      const event = createMockAuthenticatedEvent(db)
      event.request = new Request('http://localhost/api/people/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: source.id, targetId: target.id })
      })

      const response = await POST(event)

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.targetId).toBe(target.id)
      expect(data.relationshipsTransferred).toBe(0)

      // Verify source is deleted
      const sourceExists = await db.select().from(people).where(eq(people.id, source.id)).get()
      expect(sourceExists).toBeUndefined()

      // Verify target exists
      const targetExists = await db.select().from(people).where(eq(people.id, target.id)).get()
      expect(targetExists).toBeDefined()
    })

    it('should transfer relationships during merge', async () => {
      const source = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Smith',
        userId
      }).returning().get()

      const target = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Smith',
        userId
      }).returning().get()

      const mother = await db.insert(people).values({
        firstName: 'Mary',
        lastName: 'Smith',
        gender: 'female',
        userId
      }).returning().get()

      const child = await db.insert(people).values({
        firstName: 'Jane',
        lastName: 'Smith',
        userId
      }).returning().get()

      // Create relationships for source
      await db.insert(relationships).values([
        { person1Id: mother.id, person2Id: source.id, type: 'parentOf', parentRole: 'mother', userId },
        { person1Id: source.id, person2Id: child.id, type: 'parentOf', parentRole: 'father', userId }
      ])

      const event = createMockAuthenticatedEvent(db)
      event.request = new Request('http://localhost/api/people/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: source.id, targetId: target.id })
      })

      const response = await POST(event)

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.relationshipsTransferred).toBe(2)

      // Verify relationships are transferred
      const targetRelationships = await db.select()
        .from(relationships)
        .where(or(
          eq(relationships.person1Id, target.id),
          eq(relationships.person2Id, target.id)
        ))
        .all()

      expect(targetRelationships).toHaveLength(2)
    })

    it('should return merged person data', async () => {
      const source = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Smith',
        birthDate: '1950',
        userId
      }).returning().get()

      const target = await db.insert(people).values({
        firstName: 'John',
        lastName: 'A. Smith',
        birthDate: '1950-03-15',
        userId
      }).returning().get()

      const event = createMockAuthenticatedEvent(db)
      event.request = new Request('http://localhost/api/people/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: source.id, targetId: target.id })
      })

      const response = await POST(event)

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.mergedData).toBeDefined()
      expect(data.mergedData.firstName).toBe('John')
      expect(data.mergedData.lastName).toBe('A. Smith')
      expect(data.mergedData.birthDate).toBe('1950-03-15')
    })
  })

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Close the database to force an error
      sqlite.close()

      const event = createMockAuthenticatedEvent(db)
      event.request = new Request('http://localhost/api/people/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: 1, targetId: 2 })
      })

      const response = await POST(event)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })
  })
})
