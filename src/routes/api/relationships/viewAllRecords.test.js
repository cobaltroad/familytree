/**
 * Relationships API - view_all_records Feature Flag Tests
 *
 * RED Phase: Tests for view_all_records flag behavior
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import { people, relationships, users, sessions } from '$lib/db/schema.js'
import { GET } from './+server.js'

describe('Relationships API - view_all_records Feature Flag', () => {
  let db
  let sqlite
  let user1Id
  let user2Id

  beforeEach(async () => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    sqlite.exec('PRAGMA foreign_keys = ON')

    // Create tables
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

    sqlite.exec(`
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_accessed_at TEXT
      )
    `)

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

    // Create test users
    const user1Result = await db.insert(users).values({ email: 'user1@example.com', name: 'User One', provider: 'google', viewAllRecords: false }).returning()
    user1Id = user1Result[0].id

    const user2Result = await db.insert(users).values({ email: 'user2@example.com', name: 'User Two', provider: 'google', viewAllRecords: false }).returning()
    user2Id = user2Result[0].id

    // Create sessions
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    await db.insert(sessions).values({ id: 'session-user1-test', userId: user1Id, expiresAt: futureDate })
    await db.insert(sessions).values({ id: 'session-user2-test', userId: user2Id, expiresAt: futureDate })

    // Create people and relationships for user1
    const user1Person1 = await db.insert(people).values({ firstName: 'Alice', lastName: 'Smith', userId: user1Id }).returning()
    const user1Person2 = await db.insert(people).values({ firstName: 'Bob', lastName: 'Smith', userId: user1Id }).returning()
    await db.insert(relationships).values({ person1Id: user1Person1[0].id, person2Id: user1Person2[0].id, type: 'spouse', userId: user1Id })

    // Create people and relationships for user2
    const user2Person1 = await db.insert(people).values({ firstName: 'Charlie', lastName: 'Jones', userId: user2Id }).returning()
    const user2Person2 = await db.insert(people).values({ firstName: 'Diana', lastName: 'Jones', userId: user2Id }).returning()
    await db.insert(relationships).values({ person1Id: user2Person1[0].id, person2Id: user2Person2[0].id, type: 'spouse', userId: user2Id })
  })

  afterEach(() => {
    sqlite.close()
  })

  function createMockSession(userId, userEmail, userName) {
    return { user: { id: userId, email: userEmail, name: userName } }
  }

  function createMockEvent(session = null, database = null) {
    return { locals: { db: database, getSession: async () => session } }
  }

  it('should return only user1 relationships when flag is false', async () => {
    const request = new Request('http://localhost/api/relationships', { method: 'GET' })
    const session = createMockSession(user1Id, 'user1@example.com', 'User One')
    const event = { request, ...createMockEvent(session, db) }

    const response = await GET(event)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveLength(1)
    data.forEach((rel) => expect(rel.userId).toBe(user1Id))
  })

  it('should return ALL relationships when flag is true', async () => {
    // Enable view_all_records for user1
    await db.update(users).set({ viewAllRecords: true }).where(eq(users.id, user1Id))

    const request = new Request('http://localhost/api/relationships', { method: 'GET' })
    const session = createMockSession(user1Id, 'user1@example.com', 'User One')
    const event = { request, ...createMockEvent(session, db) }

    const response = await GET(event)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveLength(2)

    const userIds = [...new Set(data.map((r) => r.userId))].sort()
    expect(userIds).toEqual([user1Id, user2Id].sort())
  })
})
