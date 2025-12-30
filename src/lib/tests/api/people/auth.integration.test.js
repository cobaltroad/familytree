/**
 * People API Authentication Integration Tests
 *
 * RED Phase: Write failing tests that verify:
 * 1. Unauthenticated requests return 401
 * 2. Authenticated users only see their own data
 * 3. Authenticated users cannot access other users' data (403)
 * 4. Creating data assigns current user_id
 * 5. Updating data verifies ownership
 * 6. Deleting data verifies ownership
 *
 * These tests will fail until we implement authentication in the API routes.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { people, users, sessions } from '$lib/db/schema.js'
import { GET, POST } from '../../../../routes/api/people/+server.js'
import { GET as GET_BY_ID, PUT, DELETE } from '../../../../routes/api/people/[id]/+server.js'

describe('People API - Authentication Integration', () => {
  let db
  let sqlite
  let user1Id
  let user2Id
  let sessionId1
  let sessionId2

  beforeEach(async () => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // Enable foreign keys
    sqlite.exec('PRAGMA foreign_keys = ON')

    // Create users table
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
        last_login_at TEXT,
        default_person_id INTEGER,
        view_all_records INTEGER NOT NULL DEFAULT 0
      )
    `)

    // Create sessions table
    sqlite.exec(`
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_accessed_at TEXT
      )
    `)

    // Create people table with user_id
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

    // Create test users
    const user1Result = await db
      .insert(users)
      .values({
        email: 'user1@example.com',
        name: 'User One',
        provider: 'google'
      })
      .returning()
    user1Id = user1Result[0].id

    const user2Result = await db
      .insert(users)
      .values({
        email: 'user2@example.com',
        name: 'User Two',
        provider: 'google'
      })
      .returning()
    user2Id = user2Result[0].id

    // Create test sessions
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const session1Result = await db
      .insert(sessions)
      .values({
        id: 'session-user1-test',
        userId: user1Id,
        expiresAt: futureDate
      })
      .returning()
    sessionId1 = session1Result[0].id

    const session2Result = await db
      .insert(sessions)
      .values({
        id: 'session-user2-test',
        userId: user2Id,
        expiresAt: futureDate
      })
      .returning()
    sessionId2 = session2Result[0].id
  })

  afterEach(() => {
    sqlite.close()
  })

  // Helper function to create mock session
  function createMockSession(userId, userEmail, userName) {
    return {
      user: {
        id: userId,
        email: userEmail,
        name: userName
      }
    }
  }

  // Helper function to create mock event with authentication
  function createMockEvent(session = null, db = null) {
    return {
      locals: {
        db: db,
        getSession: async () => session
      }
    }
  }

  describe('GET /api/people - Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      const event = createMockEvent(null, db)

      const response = await GET(event)

      expect(response.status).toBe(401)
      const text = await response.text()
      expect(text).toContain('Authentication required')
    })

    it('should return only current user\'s people when authenticated', async () => {
      // Insert people for user1
      await db.insert(people).values([
        { firstName: 'John', lastName: 'Doe', userId: user1Id },
        { firstName: 'Jane', lastName: 'Doe', userId: user1Id }
      ])

      // Insert people for user2
      await db.insert(people).values([
        { firstName: 'Bob', lastName: 'Smith', userId: user2Id }
      ])

      // Request as user1
      const session1 = createMockSession(user1Id, 'user1@example.com', 'User One')
      const event1 = createMockEvent(session1, db)

      const response1 = await GET(event1)
      const data1 = await response1.json()

      expect(response1.status).toBe(200)
      expect(data1).toHaveLength(2)
      expect(data1.every((p) => p.userId === user1Id)).toBe(true)
      expect(data1.map((p) => p.firstName).sort()).toEqual(['Jane', 'John'])

      // Request as user2
      const session2 = createMockSession(user2Id, 'user2@example.com', 'User Two')
      const event2 = createMockEvent(session2, db)

      const response2 = await GET(event2)
      const data2 = await response2.json()

      expect(response2.status).toBe(200)
      expect(data2).toHaveLength(1)
      expect(data2[0].userId).toBe(user2Id)
      expect(data2[0].firstName).toBe('Bob')
    })
  })

  describe('POST /api/people - Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      const event = createMockEvent(null, db)
      event.request = new Request('http://localhost/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'John',
          lastName: 'Doe'
        })
      })

      const response = await POST(event)

      expect(response.status).toBe(401)
      const text = await response.text()
      expect(text).toContain('Authentication required')
    })

    it('should create person with current user_id when authenticated', async () => {
      const session = createMockSession(user1Id, 'user1@example.com', 'User One')
      const event = createMockEvent(session, db)
      event.request = new Request('http://localhost/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'John',
          lastName: 'Doe',
          birthDate: '1980-01-01',
          gender: 'male'
        })
      })

      const response = await POST(event)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.userId).toBe(user1Id)
      expect(data.firstName).toBe('John')
      expect(data.lastName).toBe('Doe')

      // Verify in database
      const dbPeople = await db.select().from(people)
      expect(dbPeople).toHaveLength(1)
      expect(dbPeople[0].userId).toBe(user1Id)
    })
  })

  describe('GET /api/people/[id] - Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      // Insert test person
      const personResult = await db
        .insert(people)
        .values({
          firstName: 'John',
          lastName: 'Doe',
          userId: user1Id
        })
        .returning()

      const event = createMockEvent(null, db)
      event.params = { id: personResult[0].id.toString() }

      const response = await GET_BY_ID(event)

      expect(response.status).toBe(401)
      const text = await response.text()
      expect(text).toContain('Authentication required')
    })

    it('should return person when authenticated and user owns the person', async () => {
      // Insert test person for user1
      const personResult = await db
        .insert(people)
        .values({
          firstName: 'John',
          lastName: 'Doe',
          userId: user1Id
        })
        .returning()

      const session = createMockSession(user1Id, 'user1@example.com', 'User One')
      const event = createMockEvent(session, db)
      event.params = { id: personResult[0].id.toString() }

      const response = await GET_BY_ID(event)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(personResult[0].id)
      expect(data.firstName).toBe('John')
      expect(data.userId).toBe(user1Id)
    })

    it('should return 403 when authenticated but user does not own the person', async () => {
      // Insert test person for user1
      const personResult = await db
        .insert(people)
        .values({
          firstName: 'John',
          lastName: 'Doe',
          userId: user1Id
        })
        .returning()

      // Try to access as user2
      const session = createMockSession(user2Id, 'user2@example.com', 'User Two')
      const event = createMockEvent(session, db)
      event.params = { id: personResult[0].id.toString() }

      const response = await GET_BY_ID(event)

      expect(response.status).toBe(403)
      const text = await response.text()
      expect(text).toContain('Forbidden')
    })
  })

  describe('PUT /api/people/[id] - Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      // Insert test person
      const personResult = await db
        .insert(people)
        .values({
          firstName: 'John',
          lastName: 'Doe',
          userId: user1Id
        })
        .returning()

      const event = createMockEvent(null, db)
      event.params = { id: personResult[0].id.toString() }
      event.request = new Request('http://localhost/api/people/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Jane',
          lastName: 'Doe'
        })
      })

      const response = await PUT(event)

      expect(response.status).toBe(401)
      const text = await response.text()
      expect(text).toContain('Authentication required')
    })

    it('should update person when authenticated and user owns the person', async () => {
      // Insert test person for user1
      const personResult = await db
        .insert(people)
        .values({
          firstName: 'John',
          lastName: 'Doe',
          userId: user1Id
        })
        .returning()

      const session = createMockSession(user1Id, 'user1@example.com', 'User One')
      const event = createMockEvent(session, db)
      event.params = { id: personResult[0].id.toString() }
      event.request = new Request('http://localhost/api/people/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Jane',
          lastName: 'Smith',
          birthDate: '1985-05-15',
          gender: 'female'
        })
      })

      const response = await PUT(event)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.firstName).toBe('Jane')
      expect(data.lastName).toBe('Smith')
      expect(data.userId).toBe(user1Id)
    })

    it('should return 403 when authenticated but user does not own the person', async () => {
      // Insert test person for user1
      const personResult = await db
        .insert(people)
        .values({
          firstName: 'John',
          lastName: 'Doe',
          userId: user1Id
        })
        .returning()

      // Try to update as user2
      const session = createMockSession(user2Id, 'user2@example.com', 'User Two')
      const event = createMockEvent(session, db)
      event.params = { id: personResult[0].id.toString() }
      event.request = new Request('http://localhost/api/people/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Jane',
          lastName: 'Doe'
        })
      })

      const response = await PUT(event)

      expect(response.status).toBe(403)
      const text = await response.text()
      expect(text).toContain('Forbidden')
    })
  })

  describe('DELETE /api/people/[id] - Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      // Insert test person
      const personResult = await db
        .insert(people)
        .values({
          firstName: 'John',
          lastName: 'Doe',
          userId: user1Id
        })
        .returning()

      const event = createMockEvent(null, db)
      event.params = { id: personResult[0].id.toString() }

      const response = await DELETE(event)

      expect(response.status).toBe(401)
      const text = await response.text()
      expect(text).toContain('Authentication required')
    })

    it('should delete person when authenticated and user owns the person', async () => {
      // Insert test person for user1
      const personResult = await db
        .insert(people)
        .values({
          firstName: 'John',
          lastName: 'Doe',
          userId: user1Id
        })
        .returning()

      const session = createMockSession(user1Id, 'user1@example.com', 'User One')
      const event = createMockEvent(session, db)
      event.params = { id: personResult[0].id.toString() }

      const response = await DELETE(event)

      expect(response.status).toBe(204)

      // Verify person was deleted
      const dbPeople = await db.select().from(people)
      expect(dbPeople).toHaveLength(0)
    })

    it('should return 403 when authenticated but user does not own the person', async () => {
      // Insert test person for user1
      const personResult = await db
        .insert(people)
        .values({
          firstName: 'John',
          lastName: 'Doe',
          userId: user1Id
        })
        .returning()

      // Try to delete as user2
      const session = createMockSession(user2Id, 'user2@example.com', 'User Two')
      const event = createMockEvent(session, db)
      event.params = { id: personResult[0].id.toString() }

      const response = await DELETE(event)

      expect(response.status).toBe(403)
      const text = await response.text()
      expect(text).toContain('Forbidden')

      // Verify person was NOT deleted
      const dbPeople = await db.select().from(people)
      expect(dbPeople).toHaveLength(1)
    })
  })
})
