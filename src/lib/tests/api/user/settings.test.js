/**
 * User Settings API Tests
 *
 * RED Phase: Write failing tests that verify:
 * 1. PATCH /api/user/settings updates view_all_records flag
 * 2. Unauthenticated requests return 401
 * 3. Only current user can update their own settings
 * 4. Invalid input returns 400
 * 5. Returns updated user settings
 *
 * These tests will fail until we implement the endpoint.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import { users, sessions } from '$lib/db/schema.js'
import { setupTestDatabase } from '$lib/server/testHelpers.js'
import { PATCH } from '../../../../routes/api/user/settings/+server.js'

describe('User Settings API - PATCH /api/user/settings', () => {
  let db
  let sqlite
  let userId
  let sessionId

  beforeEach(async () => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // Use setupTestDatabase for consistent schema (Issue #114)
    const defaultUserId = await setupTestDatabase(sqlite, db)

    // Create test user with view_all_records = false
    const userResult = await db
      .insert(users)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
        viewAllRecords: false
      })
      .returning()
    userId = userResult[0].id

    // Create valid session
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    const sessionResult = await db
      .insert(sessions)
      .values({
        id: 'test-session-id',
        userId: userId,
        expiresAt: expiresAt
      })
      .returning()
    sessionId = sessionResult[0].id
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

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      const request = new Request('http://localhost/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewAllRecords: true })
      })

      const event = {
        request,
        ...createMockEvent(null, db)
      }

      const response = await PATCH(event)

      expect(response.status).toBe(401)
    })

    it('should return 401 when session is expired', async () => {
      // For expired sessions, getSession should return null
      // This simulates session middleware rejecting expired sessions
      const request = new Request('http://localhost/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewAllRecords: true })
      })

      const event = {
        request,
        ...createMockEvent(null, db)
      }

      const response = await PATCH(event)

      expect(response.status).toBe(401)
    })
  })

  describe('Input Validation', () => {
    it('should return 400 when viewAllRecords is missing', async () => {
      const request = new Request('http://localhost/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const session = createMockSession(userId, 'test@example.com', 'Test User')
      const event = {
        request,
        ...createMockEvent(session, db)
      }

      const response = await PATCH(event)

      expect(response.status).toBe(400)
      const text = await response.text()
      expect(text).toContain('viewAllRecords')
    })

    it('should return 400 when viewAllRecords is not a boolean', async () => {
      const request = new Request('http://localhost/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewAllRecords: 'not-a-boolean' })
      })

      const session = createMockSession(userId, 'test@example.com', 'Test User')
      const event = {
        request,
        ...createMockEvent(session, db)
      }

      const response = await PATCH(event)

      expect(response.status).toBe(400)
      const text = await response.text()
      expect(text).toContain('boolean')
    })

    it('should return 400 when request body is invalid JSON', async () => {
      const request = new Request('http://localhost/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json'
      })

      const session = createMockSession(userId, 'test@example.com', 'Test User')
      const event = {
        request,
        ...createMockEvent(session, db)
      }

      const response = await PATCH(event)

      expect(response.status).toBe(400)
    })
  })

  describe('Update Functionality', () => {
    it('should update view_all_records from false to true', async () => {
      const request = new Request('http://localhost/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewAllRecords: true })
      })

      const session = createMockSession(userId, 'test@example.com', 'Test User')
      const event = {
        request,
        ...createMockEvent(session, db)
      }

      const response = await PATCH(event)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.viewAllRecords).toBe(true)

      // Verify database was updated
      const updatedUser = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
      expect(updatedUser[0].viewAllRecords).toBe(true)
    })

    it('should update view_all_records from true to false', async () => {
      // First set to true
      await db
        .update(users)
        .set({ viewAllRecords: true })
        .where(eq(users.id, userId))

      const request = new Request('http://localhost/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewAllRecords: false })
      })

      const session = createMockSession(userId, 'test@example.com', 'Test User')
      const event = {
        request,
        ...createMockEvent(session, db)
      }

      const response = await PATCH(event)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.viewAllRecords).toBe(false)

      // Verify database was updated
      const updatedUser = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
      expect(updatedUser[0].viewAllRecords).toBe(false)
    })

    it('should return updated settings in response', async () => {
      const request = new Request('http://localhost/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewAllRecords: true })
      })

      const session = createMockSession(userId, 'test@example.com', 'Test User')
      const event = {
        request,
        ...createMockEvent(session, db)
      }

      const response = await PATCH(event)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('viewAllRecords')
      expect(typeof data.viewAllRecords).toBe('boolean')
    })

    it('should only update current user settings', async () => {
      // Create another user
      const otherUserResult = await db
        .insert(users)
        .values({
          email: 'other@example.com',
          name: 'Other User',
          provider: 'google',
          viewAllRecords: false
        })
        .returning()
      const otherUserId = otherUserResult[0].id

      // Try to update with current user session
      const request = new Request('http://localhost/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewAllRecords: true })
      })

      const session = createMockSession(userId, 'test@example.com', 'Test User')
      const event = {
        request,
        ...createMockEvent(session, db)
      }

      await PATCH(event)

      // Verify other user's settings were NOT changed
      const otherUser = await db
        .select()
        .from(users)
        .where(eq(users.id, otherUserId))
      expect(otherUser[0].viewAllRecords).toBe(false)
    })
  })
})
