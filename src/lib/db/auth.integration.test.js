import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { users, sessions } from './schema.js'
import { setupTestDatabase } from '$lib/server/testHelpers.js'
import { eq, and } from 'drizzle-orm'

/**
 * Integration tests for Users and Sessions tables
 * Tests CRUD operations with Drizzle ORM
 *
 * Following TDD methodology:
 * - These tests verify the database schema works correctly
 * - Tests run against in-memory SQLite database
 * - Tests validate constraints, indexes, and relationships
 *
 * Issue #114: Uses setupTestDatabase() for single source of truth schema
 */

describe('Users Table Integration Tests', () => {
  let db
  let sqlite

  beforeEach(async () => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // Use setupTestDatabase helper for consistent schema (Issue #114)
    await setupTestDatabase(sqlite, db)
  })

  afterEach(() => {
    sqlite.close()
  })

  describe('CREATE operations', () => {
    it('should create a new user with minimal required fields', async () => {
      // Arrange
      const newUser = {
        email: 'newuser@example.com', // Changed to avoid conflict with default test user
        provider: 'google'
      }

      // Act
      const result = await db.insert(users).values(newUser).returning()

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        email: 'newuser@example.com',
        provider: 'google',
        name: null,
        avatarUrl: null,
        providerUserId: null,
        emailVerified: true,
        lastLoginAt: null
      })
      expect(result[0].createdAt).toBeDefined()
      // Note: id is not necessarily 1 because setupTestDatabase creates a default user
      expect(result[0].id).toBeGreaterThan(0)
    })

    it('should create a user with all fields populated', async () => {
      // Arrange
      const newUser = {
        email: 'john.doe@example.com',
        name: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        provider: 'google',
        providerUserId: 'google-123456',
        emailVerified: true,
        lastLoginAt: new Date().toISOString()
      }

      // Act
      const result = await db.insert(users).values(newUser).returning()

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        email: 'john.doe@example.com',
        name: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        provider: 'google',
        providerUserId: 'google-123456',
        emailVerified: true
      })
      expect(result[0].lastLoginAt).toBeDefined()
    })

    it('should enforce unique email constraint', async () => {
      // Arrange
      const user1 = { email: 'duplicate@example.com', provider: 'google' }
      const user2 = { email: 'duplicate@example.com', provider: 'google' }

      // Act & Assert
      await db.insert(users).values(user1)

      expect(() => {
        db.insert(users).values(user2).run()
      }).toThrow(/UNIQUE constraint failed: users.email/)
    })

    it('should enforce NOT NULL constraint on email', async () => {
      // Arrange
      const invalidUser = { provider: 'google' }

      // Act & Assert
      expect(() => {
        db.insert(users).values(invalidUser).run()
      }).toThrow(/NOT NULL constraint failed: users.email/)
    })

    it('should enforce NOT NULL constraint on provider', async () => {
      // Arrange
      const invalidUser = { email: 'test@example.com' }

      // Act & Assert
      expect(() => {
        db.insert(users).values(invalidUser).run()
      }).toThrow(/NOT NULL constraint failed: users.provider/)
    })

    it('should set emailVerified to true by default', async () => {
      // Arrange
      const newUser = {
        email: 'verified@example.com', // Changed to avoid conflict with default test user
        provider: 'google'
      }

      // Act
      const result = await db.insert(users).values(newUser).returning()

      // Assert
      expect(result[0].emailVerified).toBe(true)
    })
  })

  describe('READ operations', () => {
    it('should retrieve user by id', async () => {
      // Arrange
      const newUser = {
        email: 'retrieve@example.com', // Changed to avoid conflict with default test user
        name: 'Test User',
        provider: 'google'
      }
      const inserted = await db.insert(users).values(newUser).returning()

      // Act
      const result = await db.select().from(users).where(eq(users.id, inserted[0].id))

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        email: 'retrieve@example.com',
        name: 'Test User'
      })
    })

    it('should retrieve user by email (indexed)', async () => {
      // Arrange
      await db.insert(users).values({
        email: 'indexed@example.com',
        name: 'Indexed User',
        provider: 'google'
      })

      // Act
      const result = await db.select().from(users).where(eq(users.email, 'indexed@example.com'))

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Indexed User')
    })

    it('should retrieve user by providerUserId (indexed)', async () => {
      // Arrange
      await db.insert(users).values({
        email: 'google-user@example.com',
        provider: 'google',
        providerUserId: 'google-987654'
      })

      // Act
      const result = await db.select().from(users)
        .where(eq(users.providerUserId, 'google-987654'))

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0].email).toBe('google-user@example.com')
    })

    it('should return empty array when no users match criteria', async () => {
      // Act
      const result = await db.select().from(users)
        .where(eq(users.email, 'nonexistent@example.com'))

      // Assert
      expect(result).toHaveLength(0)
    })

    it('should retrieve all users', async () => {
      // Arrange
      await db.insert(users).values([
        { email: 'user1@example.com', provider: 'google' },
        { email: 'user2@example.com', provider: 'google' },
        { email: 'user3@example.com', provider: 'google' }
      ])

      // Act
      const result = await db.select().from(users)

      // Assert
      // Note: setupTestDatabase creates 1 default user, so we expect 4 total
      expect(result).toHaveLength(4)
    })
  })

  describe('UPDATE operations', () => {
    it('should update user name', async () => {
      // Arrange
      const inserted = await db.insert(users).values({
        email: 'update@example.com',
        provider: 'google',
        name: 'Old Name'
      }).returning()

      // Act
      await db.update(users)
        .set({ name: 'New Name' })
        .where(eq(users.id, inserted[0].id))

      const result = await db.select().from(users).where(eq(users.id, inserted[0].id))

      // Assert
      expect(result[0].name).toBe('New Name')
    })

    it('should update lastLoginAt timestamp', async () => {
      // Arrange
      const inserted = await db.insert(users).values({
        email: 'login@example.com',
        provider: 'google'
      }).returning()

      const loginTime = new Date().toISOString()

      // Act
      await db.update(users)
        .set({ lastLoginAt: loginTime })
        .where(eq(users.id, inserted[0].id))

      const result = await db.select().from(users).where(eq(users.id, inserted[0].id))

      // Assert
      expect(result[0].lastLoginAt).toBe(loginTime)
    })

    it('should update multiple fields at once', async () => {
      // Arrange
      const inserted = await db.insert(users).values({
        email: 'multi@example.com',
        provider: 'google'
      }).returning()

      // Act
      await db.update(users)
        .set({
          name: 'Updated Name',
          avatarUrl: 'https://example.com/new-avatar.jpg',
          lastLoginAt: new Date().toISOString()
        })
        .where(eq(users.id, inserted[0].id))

      const result = await db.select().from(users).where(eq(users.id, inserted[0].id))

      // Assert
      expect(result[0]).toMatchObject({
        name: 'Updated Name',
        avatarUrl: 'https://example.com/new-avatar.jpg'
      })
      expect(result[0].lastLoginAt).toBeDefined()
    })

    it('should enforce unique email constraint on update', async () => {
      // Arrange
      await db.insert(users).values([
        { email: 'user1@example.com', provider: 'google' },
        { email: 'user2@example.com', provider: 'google' }
      ])

      // Act & Assert
      expect(() => {
        db.update(users)
          .set({ email: 'user1@example.com' })
          .where(eq(users.email, 'user2@example.com'))
          .run()
      }).toThrow(/UNIQUE constraint failed: users.email/)
    })
  })

  describe('DELETE operations', () => {
    it('should delete user by id', async () => {
      // Arrange
      const inserted = await db.insert(users).values({
        email: 'delete@example.com',
        provider: 'google'
      }).returning()

      // Act
      await db.delete(users).where(eq(users.id, inserted[0].id))

      const result = await db.select().from(users).where(eq(users.id, inserted[0].id))

      // Assert
      expect(result).toHaveLength(0)
    })

    it('should delete user by email', async () => {
      // Arrange
      await db.insert(users).values({
        email: 'delete-by-email@example.com',
        provider: 'google'
      })

      // Act
      await db.delete(users).where(eq(users.email, 'delete-by-email@example.com'))

      const result = await db.select().from(users)
        .where(eq(users.email, 'delete-by-email@example.com'))

      // Assert
      expect(result).toHaveLength(0)
    })
  })
})

describe('Sessions Table Integration Tests', () => {
  let db
  let sqlite
  let testUserId

  beforeEach(async () => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // Use setupTestDatabase helper for consistent schema (Issue #114)
    // This creates all tables including users and sessions
    testUserId = await setupTestDatabase(sqlite, db)
  })

  afterEach(() => {
    sqlite.close()
  })

  describe('CREATE operations', () => {
    it('should create a new session with all required fields', async () => {
      // Arrange
      const sessionId = 'session-uuid-123'
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days

      const newSession = {
        id: sessionId,
        userId: testUserId,
        expiresAt: expiresAt
      }

      // Act
      const result = await db.insert(sessions).values(newSession).returning()

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: sessionId,
        userId: testUserId,
        expiresAt: expiresAt,
        lastAccessedAt: null
      })
      expect(result[0].createdAt).toBeDefined()
    })

    it('should create session with lastAccessedAt timestamp', async () => {
      // Arrange
      const sessionId = 'session-uuid-456'
      const now = new Date().toISOString()
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      const newSession = {
        id: sessionId,
        userId: testUserId,
        expiresAt: expiresAt,
        lastAccessedAt: now
      }

      // Act
      const result = await db.insert(sessions).values(newSession).returning()

      // Assert
      expect(result[0].lastAccessedAt).toBe(now)
    })

    it('should enforce NOT NULL constraint on userId', async () => {
      // Arrange
      const invalidSession = {
        id: 'invalid-session',
        expiresAt: new Date().toISOString()
      }

      // Act & Assert
      expect(() => {
        db.insert(sessions).values(invalidSession).run()
      }).toThrow(/NOT NULL constraint failed: sessions.user_id/)
    })

    it('should enforce NOT NULL constraint on expiresAt', async () => {
      // Arrange
      const invalidSession = {
        id: 'invalid-session',
        userId: testUserId
      }

      // Act & Assert
      expect(() => {
        db.insert(sessions).values(invalidSession).run()
      }).toThrow(/NOT NULL constraint failed: sessions.expires_at/)
    })

    it('should enforce foreign key constraint (cascade delete)', async () => {
      // Arrange
      const sessionId = 'cascade-test-session'
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      await db.insert(sessions).values({
        id: sessionId,
        userId: testUserId,
        expiresAt: expiresAt
      })

      // Act - Delete the user
      await db.delete(users).where(eq(users.id, testUserId))

      // Assert - Session should be deleted automatically
      const result = await db.select().from(sessions).where(eq(sessions.id, sessionId))
      expect(result).toHaveLength(0)
    })
  })

  describe('READ operations', () => {
    it('should retrieve session by id', async () => {
      // Arrange
      const sessionId = 'test-session-id'
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      await db.insert(sessions).values({
        id: sessionId,
        userId: testUserId,
        expiresAt: expiresAt
      })

      // Act
      const result = await db.select().from(sessions).where(eq(sessions.id, sessionId))

      // Assert
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(sessionId)
    })

    it('should retrieve sessions by userId (indexed)', async () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      await db.insert(sessions).values([
        { id: 'session-1', userId: testUserId, expiresAt },
        { id: 'session-2', userId: testUserId, expiresAt },
        { id: 'session-3', userId: testUserId, expiresAt }
      ])

      // Act
      const result = await db.select().from(sessions).where(eq(sessions.userId, testUserId))

      // Assert
      expect(result).toHaveLength(3)
    })

    it('should retrieve sessions by expiresAt (indexed for cleanup)', async () => {
      // Arrange
      const past = new Date(Date.now() - 1000).toISOString() // Expired
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      await db.insert(sessions).values([
        { id: 'expired-session', userId: testUserId, expiresAt: past },
        { id: 'valid-session', userId: testUserId, expiresAt: future }
      ])

      // Act - Find expired sessions
      const expiredSessions = sqlite.prepare(`
        SELECT * FROM sessions WHERE expires_at < ?
      `).all(new Date().toISOString())

      // Assert
      expect(expiredSessions).toHaveLength(1)
      expect(expiredSessions[0].id).toBe('expired-session')
    })
  })

  describe('UPDATE operations', () => {
    it('should update lastAccessedAt timestamp', async () => {
      // Arrange
      const sessionId = 'update-session'
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      await db.insert(sessions).values({
        id: sessionId,
        userId: testUserId,
        expiresAt
      })

      const accessTime = new Date().toISOString()

      // Act
      await db.update(sessions)
        .set({ lastAccessedAt: accessTime })
        .where(eq(sessions.id, sessionId))

      const result = await db.select().from(sessions).where(eq(sessions.id, sessionId))

      // Assert
      expect(result[0].lastAccessedAt).toBe(accessTime)
    })

    it('should update expiresAt to extend session', async () => {
      // Arrange
      const sessionId = 'extend-session'
      const originalExpiry = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
      const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      await db.insert(sessions).values({
        id: sessionId,
        userId: testUserId,
        expiresAt: originalExpiry
      })

      // Act
      await db.update(sessions)
        .set({ expiresAt: newExpiry })
        .where(eq(sessions.id, sessionId))

      const result = await db.select().from(sessions).where(eq(sessions.id, sessionId))

      // Assert
      expect(result[0].expiresAt).toBe(newExpiry)
    })
  })

  describe('DELETE operations', () => {
    it('should delete session by id', async () => {
      // Arrange
      const sessionId = 'delete-session'
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      await db.insert(sessions).values({
        id: sessionId,
        userId: testUserId,
        expiresAt
      })

      // Act
      await db.delete(sessions).where(eq(sessions.id, sessionId))

      const result = await db.select().from(sessions).where(eq(sessions.id, sessionId))

      // Assert
      expect(result).toHaveLength(0)
    })

    it('should delete all sessions for a user', async () => {
      // Arrange
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      await db.insert(sessions).values([
        { id: 'session-1', userId: testUserId, expiresAt },
        { id: 'session-2', userId: testUserId, expiresAt },
        { id: 'session-3', userId: testUserId, expiresAt }
      ])

      // Act
      await db.delete(sessions).where(eq(sessions.userId, testUserId))

      const result = await db.select().from(sessions).where(eq(sessions.userId, testUserId))

      // Assert
      expect(result).toHaveLength(0)
    })

    it('should delete expired sessions (cleanup operation)', async () => {
      // Arrange
      const past = new Date(Date.now() - 1000).toISOString()
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      await db.insert(sessions).values([
        { id: 'expired-1', userId: testUserId, expiresAt: past },
        { id: 'expired-2', userId: testUserId, expiresAt: past },
        { id: 'valid-1', userId: testUserId, expiresAt: future }
      ])

      // Act - Delete expired sessions
      const now = new Date().toISOString()
      sqlite.prepare(`
        DELETE FROM sessions WHERE expires_at < ?
      `).run(now)

      const remaining = await db.select().from(sessions)

      // Assert
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe('valid-1')
    })
  })

  describe('Relationship with Users table', () => {
    it('should join sessions with user data', async () => {
      // Arrange
      const sessionId = 'join-test-session'
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      await db.insert(sessions).values({
        id: sessionId,
        userId: testUserId,
        expiresAt
      })

      // Act - Manual join (Drizzle ORM join syntax)
      const result = sqlite.prepare(`
        SELECT s.*, u.email, u.name
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ?
      `).get(sessionId)

      // Assert
      expect(result).toBeDefined()
      expect(result.email).toBe('test@example.com')
    })

    it('should cascade delete sessions when user is deleted', async () => {
      // Arrange
      const sessionId = 'cascade-delete-session'
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      await db.insert(sessions).values({
        id: sessionId,
        userId: testUserId,
        expiresAt
      })

      // Verify session exists
      const beforeDelete = await db.select().from(sessions).where(eq(sessions.id, sessionId))
      expect(beforeDelete).toHaveLength(1)

      // Act - Delete user
      await db.delete(users).where(eq(users.id, testUserId))

      // Assert - Session should be automatically deleted
      const afterDelete = await db.select().from(sessions).where(eq(sessions.id, sessionId))
      expect(afterDelete).toHaveLength(0)
    })
  })
})
