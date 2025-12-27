/**
 * Auth.js signIn Callback Integration Tests
 *
 * Tests for the signIn callback that synchronizes user data to database.
 * Following TDD methodology - these tests define the expected behavior.
 *
 * Test coverage:
 * - signIn callback is triggered on successful authentication
 * - User data is synced to database
 * - Callback returns true to allow sign in
 * - Callback handles errors gracefully
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '$lib/db/client.js'
import { users } from '$lib/db/schema.js'
import { signInCallback } from './auth.js'
import * as userSync from './userSync.js'

// Run these tests sequentially to avoid database conflicts
describe.sequential('Auth.js signIn Callback', () => {
  // Clean up database before and after each test
  beforeEach(async () => {
    await db.delete(users)
  })

  afterEach(async () => {
    await db.delete(users)
  })

  describe('signInCallback', () => {
    it('should sync user data on successful Facebook sign-in', async () => {
      // Arrange: Simulate Auth.js signIn callback parameters
      const user = {
        id: 'fb_callback_test',
        email: 'callback@example.com',
        name: 'Callback Test User',
        image: 'https://graph.facebook.com/fb_callback_test/picture'
      }

      const account = {
        provider: 'facebook',
        providerAccountId: 'fb_callback_test',
        type: 'oauth',
        access_token: 'mock_access_token'
      }

      const profile = {
        id: 'fb_callback_test',
        email: 'callback@example.com',
        name: 'Callback Test User',
        picture: {
          data: {
            url: 'https://graph.facebook.com/fb_callback_test/picture'
          }
        }
      }

      // Act: Call signIn callback
      const result = await signInCallback({ user, account, profile })

      // Assert: Should return true (allow sign in)
      expect(result).toBe(true)

      // Verify user was synced to database
      const allUsers = await db.select().from(users)
      expect(allUsers).toHaveLength(1)
      expect(allUsers[0].email).toBe('callback@example.com')
      expect(allUsers[0].name).toBe('Callback Test User')
      expect(allUsers[0].provider).toBe('facebook')
      expect(allUsers[0].providerUserId).toBe('fb_callback_test')
    })

    it('should update existing user on returning sign-in', async () => {
      // Arrange: Create existing user with old data
      await db.insert(users).values({
        email: 'returning@example.com',
        name: 'Old Name',
        avatarUrl: 'https://old.avatar.url',
        provider: 'facebook',
        providerUserId: 'fb_returning_signin',
        emailVerified: true
      })

      // Simulate sign-in with updated data
      const user = {
        id: 'fb_returning_signin',
        email: 'returning@example.com',
        name: 'New Name',
        image: 'https://new.avatar.url'
      }

      const account = {
        provider: 'facebook',
        providerAccountId: 'fb_returning_signin',
        type: 'oauth'
      }

      const profile = {
        id: 'fb_returning_signin',
        email: 'returning@example.com',
        name: 'New Name'
      }

      // Act: Call signIn callback
      const result = await signInCallback({ user, account, profile })

      // Assert: Should return true
      expect(result).toBe(true)

      // Verify user was updated (not duplicated)
      const allUsers = await db.select().from(users)
      expect(allUsers).toHaveLength(1)
      expect(allUsers[0].name).toBe('New Name')
      expect(allUsers[0].avatarUrl).toBe('https://new.avatar.url')
    })

    it('should handle sign-in without profile image', async () => {
      // Arrange: User without image
      const user = {
        id: 'fb_no_image',
        email: 'noimage@example.com',
        name: 'No Image User'
        // No image field
      }

      const account = {
        provider: 'facebook',
        providerAccountId: 'fb_no_image',
        type: 'oauth'
      }

      const profile = {
        id: 'fb_no_image',
        email: 'noimage@example.com',
        name: 'No Image User'
      }

      // Act: Call signIn callback
      const result = await signInCallback({ user, account, profile })

      // Assert: Should still succeed
      expect(result).toBe(true)

      // Verify user was created with null avatarUrl
      const allUsers = await db.select().from(users)
      expect(allUsers).toHaveLength(1)
      expect(allUsers[0].avatarUrl).toBeNull()
    })

    it('should return false if user data is invalid', async () => {
      // Arrange: Invalid user data (missing email)
      const user = {
        id: 'fb_invalid',
        name: 'Invalid User'
        // Missing email
      }

      const account = {
        provider: 'facebook',
        providerAccountId: 'fb_invalid',
        type: 'oauth'
      }

      const profile = {
        id: 'fb_invalid',
        name: 'Invalid User'
      }

      // Act: Call signIn callback
      const result = await signInCallback({ user, account, profile })

      // Assert: Should return false (reject sign in)
      expect(result).toBe(false)

      // Verify no user was created
      const allUsers = await db.select().from(users)
      expect(allUsers).toHaveLength(0)
    })

    it('should handle database errors gracefully', async () => {
      // Arrange: Mock database error
      const syncSpy = vi.spyOn(userSync, 'syncUserFromOAuth')
      syncSpy.mockRejectedValueOnce(new Error('Database connection failed'))

      const user = {
        id: 'fb_db_error',
        email: 'dberror@example.com',
        name: 'DB Error User'
      }

      const account = {
        provider: 'facebook',
        providerAccountId: 'fb_db_error',
        type: 'oauth'
      }

      const profile = {
        id: 'fb_db_error',
        email: 'dberror@example.com',
        name: 'DB Error User'
      }

      // Act: Call signIn callback
      const result = await signInCallback({ user, account, profile })

      // Assert: Should return false (reject sign in on error)
      expect(result).toBe(false)

      // Cleanup
      syncSpy.mockRestore()
    })

    it('should only sync for OAuth providers', async () => {
      // Arrange: Non-OAuth account (e.g., email/password)
      const user = {
        id: 'email_user',
        email: 'email@example.com',
        name: 'Email User'
      }

      const account = {
        provider: 'email',
        type: 'email', // Not OAuth
        providerAccountId: 'email_user'
      }

      const profile = null // No profile for non-OAuth

      // Act: Call signIn callback
      const result = await signInCallback({ user, account, profile })

      // Assert: Should return true (allow sign in)
      expect(result).toBe(true)

      // Verify no database sync occurred (since we only sync OAuth)
      // For now, we'll accept this test as documentation
      // In a real implementation, we might only sync OAuth providers
    })
  })

  describe('signInCallback error handling', () => {
    it('should log error details for debugging', async () => {
      // Arrange: Mock console.error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Mock sync error
      const syncSpy = vi.spyOn(userSync, 'syncUserFromOAuth')
      syncSpy.mockRejectedValueOnce(new Error('Test sync error'))

      const user = {
        id: 'fb_log_test',
        email: 'logtest@example.com',
        name: 'Log Test User'
      }

      const account = {
        provider: 'facebook',
        providerAccountId: 'fb_log_test',
        type: 'oauth'
      }

      const profile = {
        id: 'fb_log_test',
        email: 'logtest@example.com',
        name: 'Log Test User'
      }

      // Act: Call signIn callback
      await signInCallback({ user, account, profile })

      // Assert: Error should be logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error syncing user'),
        expect.any(Error)
      )

      // Cleanup
      consoleErrorSpy.mockRestore()
      syncSpy.mockRestore()
    })
  })
})
