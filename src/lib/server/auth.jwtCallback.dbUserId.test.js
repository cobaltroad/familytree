/**
 * Integration Tests for JWT Callback Database User ID
 *
 * Tests to ensure the JWT callback uses the database user ID, not the OAuth provider's user ID.
 * This is critical for foreign key relationships (e.g., people.userId -> users.id).
 *
 * Bug: Issue #72 - Foreign key constraint violation when creating people
 * Root Cause: JWT callback was using OAuth provider's user.id instead of database user.id
 *
 * Following TDD methodology: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '$lib/db/client.js'
import { users } from '$lib/db/schema.js'
import { jwtCallback } from './auth.js'
import { syncUserFromOAuth } from './userSync.js'

describe.sequential('JWT Callback - Database User ID Integration', () => {
  // Clean up database before and after each test
  beforeEach(async () => {
    await db.delete(users)
  })

  afterEach(async () => {
    await db.delete(users)
  })

  it('should use database user ID in JWT token, not OAuth provider user ID', async () => {
    // Arrange: Simulate the full auth flow
    // 1. User signs in with Facebook
    const oauthUserId = 'fb_123456789' // Facebook's user ID
    const oauthData = {
      provider: 'facebook',
      providerUserId: oauthUserId,
      email: 'testuser@example.com',
      name: 'Test User',
      avatarUrl: 'https://graph.facebook.com/123456789/picture'
    }

    // 2. signInCallback syncs user to database
    const dbUser = await syncUserFromOAuth(oauthData)
    const databaseUserId = dbUser.id // Database auto-incremented ID (e.g., 259)

    // Verify the database user has a different ID than the OAuth ID
    expect(databaseUserId).not.toBe(oauthUserId)
    expect(typeof databaseUserId).toBe('number')
    expect(typeof oauthUserId).toBe('string')

    // 3. Auth.js calls jwtCallback with OAuth user data
    const token = {}
    const user = {
      id: oauthUserId, // This is Facebook's user ID, NOT the database ID
      email: oauthData.email,
      name: oauthData.name,
      image: oauthData.avatarUrl
    }
    const account = {
      provider: 'facebook',
      providerAccountId: oauthUserId
    }

    // Act: Call JWT callback
    const resultToken = await jwtCallback({ token, user, account })

    // Assert: Token should contain database user ID, not OAuth ID
    expect(resultToken.userId).toBe(databaseUserId)
    expect(resultToken.userId).not.toBe(oauthUserId)
    expect(resultToken.email).toBe(oauthData.email)
    expect(resultToken.name).toBe(oauthData.name)
    expect(resultToken.picture).toBe(oauthData.avatarUrl)
    expect(resultToken.provider).toBe('facebook')
  })

  it('should handle users that exist in database but were created earlier', async () => {
    // Arrange: Create user in database first
    const [dbUser] = await db
      .insert(users)
      .values({
        email: 'existing@example.com',
        name: 'Existing User',
        avatarUrl: 'https://example.com/avatar.jpg',
        provider: 'facebook',
        providerUserId: 'fb_existing_user',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      })
      .returning()

    const databaseUserId = dbUser.id

    // Simulate returning user login (user already in DB)
    const token = {}
    const user = {
      id: 'fb_existing_user', // OAuth provider ID
      email: 'existing@example.com',
      name: 'Existing User',
      image: 'https://example.com/avatar.jpg'
    }
    const account = {
      provider: 'facebook',
      providerAccountId: 'fb_existing_user'
    }

    // Act: Call JWT callback
    const resultToken = await jwtCallback({ token, user, account })

    // Assert: Should use database user ID
    expect(resultToken.userId).toBe(databaseUserId)
    expect(resultToken.userId).not.toBe('fb_existing_user')
  })

  it('should preserve token data on subsequent calls without database lookup', async () => {
    // Arrange: Token from a previous JWT callback (already has database user ID)
    const token = {
      userId: 259, // Database user ID from initial sign in
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
      provider: 'facebook'
    }

    // Subsequent calls to jwtCallback (no user/account = token refresh)
    const resultToken = await jwtCallback({ token })

    // Assert: Should preserve existing token data
    expect(resultToken.userId).toBe(259)
    expect(resultToken.email).toBe('test@example.com')
    expect(resultToken).toEqual(token)
  })

  it('should return null userId if user not found in database', async () => {
    // Arrange: OAuth user that doesn't exist in database
    // This is an edge case that shouldn't happen if signInCallback works correctly
    const token = {}
    const user = {
      id: 'fb_nonexistent',
      email: 'nonexistent@example.com',
      name: 'Nonexistent User'
    }
    const account = {
      provider: 'facebook',
      providerAccountId: 'fb_nonexistent'
    }

    // Act: Call JWT callback
    const resultToken = await jwtCallback({ token, user, account })

    // Assert: Should handle gracefully by setting userId to null or undefined
    // This indicates a problem (user should have been synced in signInCallback)
    expect(resultToken.userId).toBeUndefined()
    expect(resultToken.email).toBe('nonexistent@example.com')
  })
})
