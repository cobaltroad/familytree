/**
 * Relationships API Authentication Integration Tests
 *
 * RED Phase: Write failing tests that verify:
 * 1. Unauthenticated requests return 401
 * 2. Authenticated users only see their own relationships
 * 3. Authenticated users cannot access other users' relationships (403)
 * 4. Creating relationships assigns current user_id
 * 5. Creating relationships only allowed between user's own people
 * 6. Updating relationships verifies ownership
 * 7. Deleting relationships verifies ownership
 *
 * These tests will fail until we implement authentication in the API routes.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { people, relationships, users, sessions } from '$lib/db/schema.js'
import { GET, POST } from './+server.js'
import { GET as GET_BY_ID, PUT, DELETE } from './[id]/+server.js'

describe('Relationships API - Authentication Integration', () => {
  let db
  let sqlite
  let user1Id
  let user2Id
  let user1Person1Id
  let user1Person2Id
  let user2Person1Id

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

    // Create relationships table with user_id
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

    sqlite.exec(`
      CREATE INDEX people_user_id_idx ON people(user_id)
    `)

    sqlite.exec(`
      CREATE INDEX relationships_user_id_idx ON relationships(user_id)
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

    // Create test people for user1
    const user1Person1 = await db
      .insert(people)
      .values({
        firstName: 'John',
        lastName: 'Doe',
        userId: user1Id
      })
      .returning()
    user1Person1Id = user1Person1[0].id

    const user1Person2 = await db
      .insert(people)
      .values({
        firstName: 'Jane',
        lastName: 'Doe',
        userId: user1Id
      })
      .returning()
    user1Person2Id = user1Person2[0].id

    // Create test person for user2
    const user2Person1 = await db
      .insert(people)
      .values({
        firstName: 'Bob',
        lastName: 'Smith',
        userId: user2Id
      })
      .returning()
    user2Person1Id = user2Person1[0].id
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

  describe('GET /api/relationships - Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      const event = createMockEvent(null, db)

      const response = await GET(event)

      expect(response.status).toBe(401)
      const text = await response.text()
      expect(text).toContain('Authentication required')
    })

    it('should return only current user\'s relationships when authenticated', async () => {
      // Insert relationships for user1
      await db.insert(relationships).values([
        {
          person1Id: user1Person1Id,
          person2Id: user1Person2Id,
          type: 'spouse',
          userId: user1Id
        }
      ])

      // Insert relationships for user2
      await db.insert(relationships).values([
        {
          person1Id: user2Person1Id,
          person2Id: user2Person1Id,
          type: 'spouse',
          userId: user2Id
        }
      ])

      // Request as user1
      const session1 = createMockSession(user1Id, 'user1@example.com', 'User One')
      const event1 = createMockEvent(session1, db)

      const response1 = await GET(event1)
      const data1 = await response1.json()

      expect(response1.status).toBe(200)
      expect(data1).toHaveLength(1)
      expect(data1[0].userId).toBe(user1Id)

      // Request as user2
      const session2 = createMockSession(user2Id, 'user2@example.com', 'User Two')
      const event2 = createMockEvent(session2, db)

      const response2 = await GET(event2)
      const data2 = await response2.json()

      expect(response2.status).toBe(200)
      expect(data2).toHaveLength(1)
      expect(data2[0].userId).toBe(user2Id)
    })
  })

  describe('POST /api/relationships - Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      const event = createMockEvent(null, db)
      event.request = new Request('http://localhost/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person1Id: user1Person1Id,
          person2Id: user1Person2Id,
          type: 'spouse'
        })
      })

      const response = await POST(event)

      expect(response.status).toBe(401)
      const text = await response.text()
      expect(text).toContain('Authentication required')
    })

    it('should create relationship with current user_id when authenticated', async () => {
      const session = createMockSession(user1Id, 'user1@example.com', 'User One')
      const event = createMockEvent(session, db)
      event.request = new Request('http://localhost/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person1Id: user1Person1Id,
          person2Id: user1Person2Id,
          type: 'spouse'
        })
      })

      const response = await POST(event)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.userId).toBe(user1Id)
      expect(data.person1Id).toBe(user1Person1Id)
      expect(data.person2Id).toBe(user1Person2Id)

      // Verify in database
      const dbRelationships = await db.select().from(relationships)
      expect(dbRelationships).toHaveLength(1)
      expect(dbRelationships[0].userId).toBe(user1Id)
    })

    it('should return 403 when trying to create relationship with another user\'s people', async () => {
      // User1 tries to create relationship involving user2's person
      const session = createMockSession(user1Id, 'user1@example.com', 'User One')
      const event = createMockEvent(session, db)
      event.request = new Request('http://localhost/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person1Id: user1Person1Id,
          person2Id: user2Person1Id, // This person belongs to user2
          type: 'spouse'
        })
      })

      const response = await POST(event)

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toContain('do not belong to you')

      // Verify relationship was NOT created
      const dbRelationships = await db.select().from(relationships)
      expect(dbRelationships).toHaveLength(0)
    })
  })

  describe('GET /api/relationships/[id] - Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      // Insert test relationship
      const relResult = await db
        .insert(relationships)
        .values({
          person1Id: user1Person1Id,
          person2Id: user1Person2Id,
          type: 'spouse',
          userId: user1Id
        })
        .returning()

      const event = createMockEvent(null, db)
      event.params = { id: relResult[0].id.toString() }

      const response = await GET_BY_ID(event)

      expect(response.status).toBe(401)
      const text = await response.text()
      expect(text).toContain('Authentication required')
    })

    it('should return relationship when authenticated and user owns it', async () => {
      // Insert test relationship for user1
      const relResult = await db
        .insert(relationships)
        .values({
          person1Id: user1Person1Id,
          person2Id: user1Person2Id,
          type: 'spouse',
          userId: user1Id
        })
        .returning()

      const session = createMockSession(user1Id, 'user1@example.com', 'User One')
      const event = createMockEvent(session, db)
      event.params = { id: relResult[0].id.toString() }

      const response = await GET_BY_ID(event)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(relResult[0].id)
      expect(data.userId).toBe(user1Id)
    })

    it('should return 403 when authenticated but user does not own the relationship', async () => {
      // Insert test relationship for user1
      const relResult = await db
        .insert(relationships)
        .values({
          person1Id: user1Person1Id,
          person2Id: user1Person2Id,
          type: 'spouse',
          userId: user1Id
        })
        .returning()

      // Try to access as user2
      const session = createMockSession(user2Id, 'user2@example.com', 'User Two')
      const event = createMockEvent(session, db)
      event.params = { id: relResult[0].id.toString() }

      const response = await GET_BY_ID(event)

      expect(response.status).toBe(403)
      const text = await response.text()
      expect(text).toContain('Forbidden')
    })
  })

  describe('PUT /api/relationships/[id] - Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      // Insert test relationship
      const relResult = await db
        .insert(relationships)
        .values({
          person1Id: user1Person1Id,
          person2Id: user1Person2Id,
          type: 'spouse',
          userId: user1Id
        })
        .returning()

      const event = createMockEvent(null, db)
      event.params = { id: relResult[0].id.toString() }
      event.request = new Request('http://localhost/api/relationships/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person1Id: user1Person1Id,
          person2Id: user1Person2Id,
          type: 'mother'
        })
      })

      const response = await PUT(event)

      expect(response.status).toBe(401)
      const text = await response.text()
      expect(text).toContain('Authentication required')
    })

    it('should update relationship when authenticated and user owns it', async () => {
      // Insert test relationship for user1
      const relResult = await db
        .insert(relationships)
        .values({
          person1Id: user1Person1Id,
          person2Id: user1Person2Id,
          type: 'spouse',
          userId: user1Id
        })
        .returning()

      const session = createMockSession(user1Id, 'user1@example.com', 'User One')
      const event = createMockEvent(session, db)
      event.params = { id: relResult[0].id.toString() }
      event.request = new Request('http://localhost/api/relationships/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person1Id: user1Person1Id,
          person2Id: user1Person2Id,
          type: 'mother'
        })
      })

      const response = await PUT(event)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.type).toBe('mother')
      expect(data.userId).toBe(user1Id)
    })

    it('should return 403 when authenticated but user does not own the relationship', async () => {
      // Insert test relationship for user1
      const relResult = await db
        .insert(relationships)
        .values({
          person1Id: user1Person1Id,
          person2Id: user1Person2Id,
          type: 'spouse',
          userId: user1Id
        })
        .returning()

      // Try to update as user2
      const session = createMockSession(user2Id, 'user2@example.com', 'User Two')
      const event = createMockEvent(session, db)
      event.params = { id: relResult[0].id.toString() }
      event.request = new Request('http://localhost/api/relationships/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person1Id: user1Person1Id,
          person2Id: user1Person2Id,
          type: 'mother'
        })
      })

      const response = await PUT(event)

      expect(response.status).toBe(403)
      const text = await response.text()
      expect(text).toContain('Forbidden')
    })
  })

  describe('DELETE /api/relationships/[id] - Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      // Insert test relationship
      const relResult = await db
        .insert(relationships)
        .values({
          person1Id: user1Person1Id,
          person2Id: user1Person2Id,
          type: 'spouse',
          userId: user1Id
        })
        .returning()

      const event = createMockEvent(null, db)
      event.params = { id: relResult[0].id.toString() }

      const response = await DELETE(event)

      expect(response.status).toBe(401)
      const text = await response.text()
      expect(text).toContain('Authentication required')
    })

    it('should delete relationship when authenticated and user owns it', async () => {
      // Insert test relationship for user1
      const relResult = await db
        .insert(relationships)
        .values({
          person1Id: user1Person1Id,
          person2Id: user1Person2Id,
          type: 'spouse',
          userId: user1Id
        })
        .returning()

      const session = createMockSession(user1Id, 'user1@example.com', 'User One')
      const event = createMockEvent(session, db)
      event.params = { id: relResult[0].id.toString() }

      const response = await DELETE(event)

      expect(response.status).toBe(204)

      // Verify relationship was deleted
      const dbRelationships = await db.select().from(relationships)
      expect(dbRelationships).toHaveLength(0)
    })

    it('should return 403 when authenticated but user does not own the relationship', async () => {
      // Insert test relationship for user1
      const relResult = await db
        .insert(relationships)
        .values({
          person1Id: user1Person1Id,
          person2Id: user1Person2Id,
          type: 'spouse',
          userId: user1Id
        })
        .returning()

      // Try to delete as user2
      const session = createMockSession(user2Id, 'user2@example.com', 'User Two')
      const event = createMockEvent(session, db)
      event.params = { id: relResult[0].id.toString() }

      const response = await DELETE(event)

      expect(response.status).toBe(403)
      const text = await response.text()
      expect(text).toContain('Forbidden')

      // Verify relationship was NOT deleted
      const dbRelationships = await db.select().from(relationships)
      expect(dbRelationships).toHaveLength(1)
    })
  })
})
