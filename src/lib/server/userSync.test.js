/**
 * User Database Synchronization Tests
 *
 * Tests for synchronizing OAuth user data to the database.
 * Following TDD methodology - these tests will initially fail (RED phase).
 *
 * Test coverage:
 * - Create new user on first-time login
 * - Update existing user on returning login
 * - Update lastLoginAt timestamp
 * - Handle Facebook profile data correctly
 * - Handle errors gracefully
 * - Validate required fields
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { users } from '$lib/db/schema.js'
import { eq, and } from 'drizzle-orm'
import { setupTestDatabase } from './testHelpers.js'

// Import the functions we're testing
import {
  syncUserFromOAuth,
  createUserFromOAuth,
  updateUserLastLogin,
  findUserByProviderAndId
} from './userSync.js'

// Run these tests sequentially to avoid database conflicts
describe.sequential('User Database Synchronization', () => {
  let testDb
  let testSqlite

  // Set up in-memory test database before each test
  beforeEach(async () => {
    // Create in-memory database
    testSqlite = new Database(':memory:')
    testDb = drizzle(testSqlite)

    // Set up schema
    await setupTestDatabase(testSqlite, testDb)

    // Mock the db module to use our test database
    // We need to mock the actual module export
    const clientModule = await import('$lib/db/client.js')
    vi.spyOn(clientModule, 'db', 'get').mockReturnValue(testDb)
  })

  afterEach(async () => {
    // Clean up
    testSqlite.close()
    vi.restoreAllMocks()
  })

  describe('findUserByProviderAndId', () => {
    it('should find user by provider and provider user id', async () => {
      // Arrange: Create a test user with unique email
      const [testUser] = await testDb
        .insert(users)
        .values({
          email: 'finduser@example.com',
          name: 'Test User',
          provider: 'facebook',
          providerUserId: 'fb_12345',
          emailVerified: true
        })
        .returning()

      // Act: Find the user
      const foundUser = await findUserByProviderAndId('facebook', 'fb_12345')

      // Assert: User should be found
      expect(foundUser).toBeDefined()
      expect(foundUser.id).toBe(testUser.id)
      expect(foundUser.email).toBe('finduser@example.com')
      expect(foundUser.provider).toBe('facebook')
      expect(foundUser.providerUserId).toBe('fb_12345')
    })

    it('should return null if user not found', async () => {
      // Act: Try to find non-existent user
      const foundUser = await findUserByProviderAndId('facebook', 'nonexistent')

      // Assert: Should return null
      expect(foundUser).toBeNull()
    })

    it('should distinguish between different providers', async () => {
      // Arrange: Create users with same provider ID but different providers
      await testDb.insert(users).values([
        {
          email: 'user1@example.com',
          name: 'User 1',
          provider: 'facebook',
          providerUserId: 'id_12345',
          emailVerified: true
        },
        {
          email: 'user2@example.com',
          name: 'User 2',
          provider: 'google',
          providerUserId: 'id_12345',
          emailVerified: true
        }
      ])

      // Act: Find Facebook user
      const fbUser = await findUserByProviderAndId('facebook', 'id_12345')

      // Assert: Should find only Facebook user
      expect(fbUser).toBeDefined()
      expect(fbUser.email).toBe('user1@example.com')
      expect(fbUser.provider).toBe('facebook')
    })
  })

  describe('createUserFromOAuth', () => {
    it('should create new user with Facebook profile data', async () => {
      // Arrange: Facebook OAuth profile
      const oauthProfile = {
        provider: 'facebook',
        providerUserId: 'fb_67890',
        email: 'newuser@example.com',
        name: 'New User',
        avatarUrl: 'https://graph.facebook.com/fb_67890/picture'
      }

      // Act: Create user
      const createdUser = await createUserFromOAuth(oauthProfile)

      // Assert: User should be created with correct data
      expect(createdUser).toBeDefined()
      expect(createdUser.id).toBeDefined()
      expect(createdUser.email).toBe('newuser@example.com')
      expect(createdUser.name).toBe('New User')
      expect(createdUser.avatarUrl).toBe('https://graph.facebook.com/fb_67890/picture')
      expect(createdUser.provider).toBe('facebook')
      expect(createdUser.providerUserId).toBe('fb_67890')
      expect(createdUser.emailVerified).toBe(true)
      expect(createdUser.createdAt).toBeDefined()
      expect(createdUser.lastLoginAt).toBeDefined()

      // Verify user was actually inserted into database
      const [dbUser] = await testDb.select().from(users).where(eq(users.id, createdUser.id))
      expect(dbUser).toBeDefined()
      expect(dbUser.email).toBe('newuser@example.com')
    })

    it('should throw error if email is missing', async () => {
      // Arrange: Profile without email
      const oauthProfile = {
        provider: 'facebook',
        providerUserId: 'fb_12345',
        name: 'User Without Email'
      }

      // Act & Assert: Should throw validation error
      await expect(createUserFromOAuth(oauthProfile)).rejects.toThrow(/email.*required/i)
    })

    it('should throw error if provider is missing', async () => {
      // Arrange: Profile without provider
      const oauthProfile = {
        providerUserId: 'fb_12345',
        email: 'user@example.com',
        name: 'User'
      }

      // Act & Assert: Should throw validation error
      await expect(createUserFromOAuth(oauthProfile)).rejects.toThrow(/provider.*required/i)
    })

    it('should handle missing optional fields', async () => {
      // Arrange: Minimal profile (only required fields)
      const oauthProfile = {
        provider: 'facebook',
        providerUserId: 'fb_99999',
        email: 'minimal@example.com'
        // name and avatarUrl are optional
      }

      // Act: Create user
      const createdUser = await createUserFromOAuth(oauthProfile)

      // Assert: Should create user with null optional fields
      expect(createdUser).toBeDefined()
      expect(createdUser.email).toBe('minimal@example.com')
      expect(createdUser.name).toBeNull()
      expect(createdUser.avatarUrl).toBeNull()
    })
  })

  describe('updateUserLastLogin', () => {
    it('should update lastLoginAt timestamp', async () => {
      // Arrange: Create a user with null lastLoginAt and unique email
      const [testUser] = await testDb
        .insert(users)
        .values({
          email: 'logintest1@example.com',
          name: 'Test User',
          provider: 'facebook',
          providerUserId: 'fb_12345',
          emailVerified: true,
          lastLoginAt: null
        })
        .returning()

      expect(testUser.lastLoginAt).toBeNull()

      // Wait 10ms to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Act: Update last login
      const updatedUser = await updateUserLastLogin(testUser.id)

      // Assert: lastLoginAt should be set
      expect(updatedUser.lastLoginAt).toBeDefined()
      expect(updatedUser.lastLoginAt).not.toBeNull()
      expect(new Date(updatedUser.lastLoginAt).getTime()).toBeGreaterThan(0)

      // Verify database was updated
      const [dbUser] = await testDb.select().from(users).where(eq(users.id, testUser.id))
      expect(dbUser.lastLoginAt).toBe(updatedUser.lastLoginAt)
    })

    it('should update lastLoginAt on subsequent logins', async () => {
      // Arrange: Create user with existing lastLoginAt and unique email
      const initialLoginTime = new Date('2024-01-01T00:00:00Z').toISOString()
      const [testUser] = await testDb
        .insert(users)
        .values({
          email: 'logintest2@example.com',
          name: 'Test User',
          provider: 'facebook',
          providerUserId: 'fb_67890',
          emailVerified: true,
          lastLoginAt: initialLoginTime
        })
        .returning()

      // Wait 10ms to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Act: Update last login again
      const updatedUser = await updateUserLastLogin(testUser.id)

      // Assert: lastLoginAt should be updated to a new time
      expect(updatedUser.lastLoginAt).toBeDefined()
      expect(updatedUser.lastLoginAt).not.toBe(initialLoginTime)
      expect(new Date(updatedUser.lastLoginAt).getTime()).toBeGreaterThan(
        new Date(initialLoginTime).getTime()
      )
    })

    it('should throw error if user not found', async () => {
      // Act & Assert: Should throw error for non-existent user
      // Use a very large ID that won't exist
      await expect(updateUserLastLogin(999999999)).rejects.toThrow(/user.*not found/i)
    })
  })

  describe('syncUserFromOAuth', () => {
    it('should create new user on first-time login', async () => {
      // Arrange: Facebook OAuth data for new user
      const oauthData = {
        provider: 'facebook',
        providerUserId: 'fb_new_user',
        email: 'firsttime@example.com',
        name: 'First Time User',
        avatarUrl: 'https://graph.facebook.com/fb_new_user/picture'
      }

      // Act: Sync user
      const syncedUser = await syncUserFromOAuth(oauthData)

      // Assert: User should be created
      expect(syncedUser).toBeDefined()
      expect(syncedUser.id).toBeDefined()
      expect(syncedUser.email).toBe('firsttime@example.com')
      expect(syncedUser.name).toBe('First Time User')
      expect(syncedUser.avatarUrl).toBe('https://graph.facebook.com/fb_new_user/picture')
      expect(syncedUser.provider).toBe('facebook')
      expect(syncedUser.providerUserId).toBe('fb_new_user')
      expect(syncedUser.lastLoginAt).toBeDefined()

      // Verify user was created (should be 2 total: default test user + this new user)
      const allUsers = await testDb.select().from(users)
      expect(allUsers).toHaveLength(2)

      // Verify the newly synced user exists with correct data
      const newUser = allUsers.find(u => u.email === 'firsttime@example.com')
      expect(newUser).toBeDefined()
      expect(newUser.provider).toBe('facebook')
    })

    it('should update existing user on returning login', async () => {
      // Arrange: Create existing user
      const [existingUser] = await testDb
        .insert(users)
        .values({
          email: 'returning@example.com',
          name: 'Old Name',
          avatarUrl: 'https://old.avatar.url',
          provider: 'facebook',
          providerUserId: 'fb_returning',
          emailVerified: true,
          lastLoginAt: new Date('2024-01-01T00:00:00Z').toISOString()
        })
        .returning()

      // Wait 10ms to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10))

      // OAuth data with updated profile
      const oauthData = {
        provider: 'facebook',
        providerUserId: 'fb_returning',
        email: 'returning@example.com',
        name: 'New Name',
        avatarUrl: 'https://new.avatar.url'
      }

      // Act: Sync user
      const syncedUser = await syncUserFromOAuth(oauthData)

      // Assert: User should be updated
      expect(syncedUser.id).toBeDefined()
      expect(syncedUser.providerUserId).toBe('fb_returning') // Same provider user ID
      expect(syncedUser.name).toBe('New Name') // Updated name
      expect(syncedUser.avatarUrl).toBe('https://new.avatar.url') // Updated avatar
      expect(syncedUser.lastLoginAt).not.toBe(existingUser.lastLoginAt) // Updated login time

      // Verify still only one user in database with this provider ID
      const allUsers = await testDb
        .select()
        .from(users)
        .where(
          and(eq(users.provider, 'facebook'), eq(users.providerUserId, 'fb_returning'))
        )
      expect(allUsers).toHaveLength(1)
    })

    it('should update profile data on each login', async () => {
      // Arrange: Create existing user with old data
      await testDb.insert(users).values({
        email: 'user@example.com',
        name: 'Old Name',
        avatarUrl: null,
        provider: 'facebook',
        providerUserId: 'fb_update_test',
        emailVerified: true
      })

      // OAuth data with updated profile
      const oauthData = {
        provider: 'facebook',
        providerUserId: 'fb_update_test',
        email: 'user@example.com',
        name: 'Updated Name',
        avatarUrl: 'https://new.avatar.url'
      }

      // Act: Sync user
      const syncedUser = await syncUserFromOAuth(oauthData)

      // Assert: Profile should be updated
      expect(syncedUser.name).toBe('Updated Name')
      expect(syncedUser.avatarUrl).toBe('https://new.avatar.url')

      // Verify in database
      const [dbUser] = await testDb
        .select()
        .from(users)
        .where(
          and(eq(users.provider, 'facebook'), eq(users.providerUserId, 'fb_update_test'))
        )
      expect(dbUser.name).toBe('Updated Name')
      expect(dbUser.avatarUrl).toBe('https://new.avatar.url')
    })

    it('should handle email updates', async () => {
      // Arrange: Create user with old email
      await testDb.insert(users).values({
        email: 'old@example.com',
        name: 'Test User',
        provider: 'facebook',
        providerUserId: 'fb_email_change',
        emailVerified: true
      })

      // OAuth data with new email
      const oauthData = {
        provider: 'facebook',
        providerUserId: 'fb_email_change',
        email: 'new@example.com',
        name: 'Test User'
      }

      // Act: Sync user
      const syncedUser = await syncUserFromOAuth(oauthData)

      // Assert: Email should be updated
      expect(syncedUser.email).toBe('new@example.com')
    })

    it('should validate required fields', async () => {
      // Arrange: OAuth data missing required fields
      const invalidData = {
        provider: 'facebook'
        // Missing providerUserId and email
      }

      // Act & Assert: Should throw validation error
      await expect(syncUserFromOAuth(invalidData)).rejects.toThrow(/required/i)
    })

    it('should handle database errors gracefully', async () => {
      // Arrange: Create a user first
      await testDb.insert(users).values({
        email: 'error@example.com',
        name: 'Existing User',
        provider: 'facebook',
        providerUserId: 'fb_error_test',
        emailVerified: true
      })

      // Try to create another user with the same email (should violate unique constraint)
      const oauthData = {
        provider: 'google', // Different provider
        providerUserId: 'google_12345',
        email: 'error@example.com', // Same email - will violate unique constraint
        name: 'Error Test'
      }

      // Act & Assert: Should propagate database error (unique constraint violation)
      await expect(syncUserFromOAuth(oauthData)).rejects.toThrow()
    })
  })

  describe('Integration with Auth.js', () => {
    it('should sync user when signIn callback is triggered', async () => {
      // This test verifies the integration flow:
      // 1. User signs in with Facebook
      // 2. Auth.js triggers signIn callback
      // 3. Our sync function is called
      // 4. User data is saved to database

      // Arrange: Simulate Auth.js signIn callback data
      const authJsUser = {
        id: 'fb_auth_test',
        email: 'authtest@example.com',
        name: 'Auth Test User',
        image: 'https://graph.facebook.com/fb_auth_test/picture'
      }

      const authJsAccount = {
        provider: 'facebook',
        providerAccountId: 'fb_auth_test',
        type: 'oauth'
      }

      // Transform to our format
      const oauthData = {
        provider: authJsAccount.provider,
        providerUserId: authJsAccount.providerAccountId,
        email: authJsUser.email,
        name: authJsUser.name,
        avatarUrl: authJsUser.image
      }

      // Act: Sync user (as would happen in signIn callback)
      const syncedUser = await syncUserFromOAuth(oauthData)

      // Assert: User should be in database
      expect(syncedUser).toBeDefined()
      expect(syncedUser.email).toBe('authtest@example.com')

      // Verify in database
      const [dbUser] = await testDb
        .select()
        .from(users)
        .where(
          and(eq(users.provider, 'facebook'), eq(users.providerUserId, 'fb_auth_test'))
        )
      expect(dbUser).toBeDefined()
      expect(dbUser.email).toBe('authtest@example.com')
    })
  })
})
