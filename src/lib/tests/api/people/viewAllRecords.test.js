/**
 * People API - view_all_records Feature Flag Tests
 *
 * RED Phase: Write failing tests that verify:
 * 1. When view_all_records = false: User sees only their own people
 * 2. When view_all_records = true: User sees ALL people from all users
 * 3. Default behavior (false) maintains data isolation
 *
 * These tests will fail until we modify the GET /api/people endpoint.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import { people, users, sessions } from '$lib/db/schema.js'
import { GET } from '../../../../routes/api/people/+server.js'

describe('People API - view_all_records Feature Flag', () => {
  let db
  let sqlite
  let user1Id
  let user2Id
  let user1Person1Id
  let user1Person2Id
  let user2Person1Id
  let user2Person2Id

  beforeEach(async () => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // Enable foreign keys
    sqlite.exec('PRAGMA foreign_keys = ON')

    // Create users table with view_all_records column
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
        photo_url TEXT,
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
        provider: 'google',
        viewAllRecords: false  // Default: only see own records
      })
      .returning()
    user1Id = user1Result[0].id

    const user2Result = await db
      .insert(users)
      .values({
        email: 'user2@example.com',
        name: 'User Two',
        provider: 'google',
        viewAllRecords: false  // Default: only see own records
      })
      .returning()
    user2Id = user2Result[0].id

    // Create test sessions
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    await db
      .insert(sessions)
      .values({
        id: 'session-user1-test',
        userId: user1Id,
        expiresAt: futureDate
      })

    await db
      .insert(sessions)
      .values({
        id: 'session-user2-test',
        userId: user2Id,
        expiresAt: futureDate
      })

    // Create people for user1
    const user1Person1Result = await db
      .insert(people)
      .values({
        firstName: 'Alice',
        lastName: 'Smith',
        userId: user1Id
      })
      .returning()
    user1Person1Id = user1Person1Result[0].id

    const user1Person2Result = await db
      .insert(people)
      .values({
        firstName: 'Bob',
        lastName: 'Smith',
        userId: user1Id
      })
      .returning()
    user1Person2Id = user1Person2Result[0].id

    // Create people for user2
    const user2Person1Result = await db
      .insert(people)
      .values({
        firstName: 'Charlie',
        lastName: 'Jones',
        userId: user2Id
      })
      .returning()
    user2Person1Id = user2Person1Result[0].id

    const user2Person2Result = await db
      .insert(people)
      .values({
        firstName: 'Diana',
        lastName: 'Jones',
        userId: user2Id
      })
      .returning()
    user2Person2Id = user2Person2Result[0].id
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
  function createMockEvent(session = null, database = null) {
    return {
      locals: {
        db: database,
        getSession: async () => session
      }
    }
  }

  describe('Default Behavior (view_all_records = false)', () => {
    it('should return only user1 people when user1 is authenticated', async () => {
      const request = new Request('http://localhost/api/people', {
        method: 'GET'
      })

      const session = createMockSession(user1Id, 'user1@example.com', 'User One')
      const event = {
        request,
        ...createMockEvent(session, db)
      }

      const response = await GET(event)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveLength(2)

      // Should only see Alice and Bob (user1's people)
      const names = data.map((p) => p.firstName).sort()
      expect(names).toEqual(['Alice', 'Bob'])

      // Verify all returned people belong to user1
      data.forEach((person) => {
        expect(person.userId).toBe(user1Id)
      })
    })

    it('should return only user2 people when user2 is authenticated', async () => {
      const request = new Request('http://localhost/api/people', {
        method: 'GET'
      })

      const session = createMockSession(user2Id, 'user2@example.com', 'User Two')
      const event = {
        request,
        ...createMockEvent(session, db)
      }

      const response = await GET(event)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveLength(2)

      // Should only see Charlie and Diana (user2's people)
      const names = data.map((p) => p.firstName).sort()
      expect(names).toEqual(['Charlie', 'Diana'])

      // Verify all returned people belong to user2
      data.forEach((person) => {
        expect(person.userId).toBe(user2Id)
      })
    })

    it('should not see other users people by default', async () => {
      const request = new Request('http://localhost/api/people', {
        method: 'GET'
      })

      const session = createMockSession(user1Id, 'user1@example.com', 'User One')
      const event = {
        request,
        ...createMockEvent(session, db)
      }

      const response = await GET(event)

      expect(response.status).toBe(200)

      const data = await response.json()

      // Should NOT see Charlie or Diana (user2's people)
      const names = data.map((p) => p.firstName)
      expect(names).not.toContain('Charlie')
      expect(names).not.toContain('Diana')
    })
  })

  describe('Feature Flag Enabled (view_all_records = true)', () => {
    it('should return ALL people when view_all_records is enabled for user1', async () => {
      // Enable view_all_records flag for user1
      await db
        .update(users)
        .set({ viewAllRecords: true })
        .where(eq(users.id, user1Id))

      const request = new Request('http://localhost/api/people', {
        method: 'GET'
      })

      const session = createMockSession(user1Id, 'user1@example.com', 'User One')
      const event = {
        request,
        ...createMockEvent(session, db)
      }

      const response = await GET(event)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveLength(4)

      // Should see ALL people (Alice, Bob, Charlie, Diana)
      const names = data.map((p) => p.firstName).sort()
      expect(names).toEqual(['Alice', 'Bob', 'Charlie', 'Diana'])

      // Should include people from both users
      const userIds = [...new Set(data.map((p) => p.userId))].sort()
      expect(userIds).toEqual([user1Id, user2Id].sort())
    })

    it('should return ALL people when view_all_records is enabled for user2', async () => {
      // Enable view_all_records flag for user2
      await db
        .update(users)
        .set({ viewAllRecords: true })
        .where(eq(users.id, user2Id))

      const request = new Request('http://localhost/api/people', {
        method: 'GET'
      })

      const session = createMockSession(user2Id, 'user2@example.com', 'User Two')
      const event = {
        request,
        ...createMockEvent(session, db)
      }

      const response = await GET(event)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveLength(4)

      // Should see ALL people (Alice, Bob, Charlie, Diana)
      const names = data.map((p) => p.firstName).sort()
      expect(names).toEqual(['Alice', 'Bob', 'Charlie', 'Diana'])
    })

    it('should respect flag per-user (user1 enabled, user2 disabled)', async () => {
      // Enable flag for user1 only
      await db
        .update(users)
        .set({ viewAllRecords: true })
        .where(eq(users.id, user1Id))

      // User1 should see all people
      const request1 = new Request('http://localhost/api/people', {
        method: 'GET'
      })

      const session1 = createMockSession(user1Id, 'user1@example.com', 'User One')
      const event1 = {
        request: request1,
        ...createMockEvent(session1, db)
      }

      const response1 = await GET(event1)
      const data1 = await response1.json()
      expect(data1).toHaveLength(4)  // Sees all

      // User2 should only see their own people
      const request2 = new Request('http://localhost/api/people', {
        method: 'GET'
      })

      const session2 = createMockSession(user2Id, 'user2@example.com', 'User Two')
      const event2 = {
        request: request2,
        ...createMockEvent(session2, db)
      }

      const response2 = await GET(event2)
      const data2 = await response2.json()
      expect(data2).toHaveLength(2)  // Only sees own

      const names2 = data2.map((p) => p.firstName).sort()
      expect(names2).toEqual(['Charlie', 'Diana'])
    })
  })

  describe('Edge Cases', () => {
    it('should return empty array when user has no people and flag is false', async () => {
      // Create a user with no people
      const user3Result = await db
        .insert(users)
        .values({
          email: 'user3@example.com',
          name: 'User Three',
          provider: 'google',
          viewAllRecords: false
        })
        .returning()
      const user3Id = user3Result[0].id

      const request = new Request('http://localhost/api/people', {
        method: 'GET'
      })

      const session = createMockSession(user3Id, 'user3@example.com', 'User Three')
      const event = {
        request,
        ...createMockEvent(session, db)
      }

      const response = await GET(event)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveLength(0)
    })

    it('should return all people when user has no people but flag is true', async () => {
      // Create a user with no people but flag enabled
      const user3Result = await db
        .insert(users)
        .values({
          email: 'user3@example.com',
          name: 'User Three',
          provider: 'google',
          viewAllRecords: true
        })
        .returning()
      const user3Id = user3Result[0].id

      const request = new Request('http://localhost/api/people', {
        method: 'GET'
      })

      const session = createMockSession(user3Id, 'user3@example.com', 'User Three')
      const event = {
        request,
        ...createMockEvent(session, db)
      }

      const response = await GET(event)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveLength(4)  // Sees all 4 people from user1 and user2

      const names = data.map((p) => p.firstName).sort()
      expect(names).toEqual(['Alice', 'Bob', 'Charlie', 'Diana'])
    })
  })
})
