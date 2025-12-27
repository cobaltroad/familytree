/**
 * User Database Synchronization Module
 *
 * Provides functions for synchronizing OAuth user data to the database.
 * This module is called during the Auth.js authentication flow to ensure
 * user data is properly stored and updated.
 *
 * Features:
 * - Create new users on first-time login
 * - Update existing users on returning login
 * - Maintain lastLoginAt timestamp
 * - Handle Facebook profile data
 * - Validate required fields
 */

import { db } from '$lib/db/client.js'
import { users } from '$lib/db/schema.js'
import { eq, and } from 'drizzle-orm'

/**
 * Finds a user by their database ID
 *
 * @param {number} userId - User's database ID
 * @returns {Promise<Object|null>} User object (with defaultPersonId) or null if not found
 *
 * @example
 * const user = await getUserById(123)
 * if (user && user.defaultPersonId) {
 *   console.log('User default person ID:', user.defaultPersonId)
 * }
 */
export async function getUserById(userId) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  return user || null
}

/**
 * Finds a user by provider and provider user ID
 *
 * @param {string} provider - OAuth provider name (e.g., 'facebook')
 * @param {string} providerUserId - Provider's user ID
 * @returns {Promise<Object|null>} User object or null if not found
 *
 * @example
 * const user = await findUserByProviderAndId('facebook', 'fb_12345')
 */
export async function findUserByProviderAndId(provider, providerUserId) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.provider, provider), eq(users.providerUserId, providerUserId)))
    .limit(1)

  return user || null
}

/**
 * Creates a new user from OAuth profile data
 *
 * @param {Object} oauthProfile - OAuth profile data
 * @param {string} oauthProfile.provider - OAuth provider name
 * @param {string} oauthProfile.providerUserId - Provider's user ID
 * @param {string} oauthProfile.email - User's email address
 * @param {string} [oauthProfile.name] - User's display name
 * @param {string} [oauthProfile.avatarUrl] - User's avatar URL
 * @returns {Promise<Object>} Created user object
 * @throws {Error} If required fields are missing
 *
 * @example
 * const user = await createUserFromOAuth({
 *   provider: 'facebook',
 *   providerUserId: 'fb_12345',
 *   email: 'user@example.com',
 *   name: 'John Doe',
 *   avatarUrl: 'https://graph.facebook.com/fb_12345/picture'
 * })
 */
export async function createUserFromOAuth(oauthProfile) {
  // Validate required fields
  if (!oauthProfile.email) {
    throw new Error('Email is required to create user')
  }

  if (!oauthProfile.provider) {
    throw new Error('Provider is required to create user')
  }

  // Prepare user data
  const now = new Date().toISOString()
  const userData = {
    email: oauthProfile.email,
    name: oauthProfile.name || null,
    avatarUrl: oauthProfile.avatarUrl || null,
    provider: oauthProfile.provider,
    providerUserId: oauthProfile.providerUserId || null,
    emailVerified: true,
    createdAt: now,
    lastLoginAt: now
  }

  // Insert user into database
  const [createdUser] = await db.insert(users).values(userData).returning()

  return createdUser
}

/**
 * Updates the lastLoginAt timestamp for a user
 *
 * @param {number} userId - User's database ID
 * @returns {Promise<Object>} Updated user object
 * @throws {Error} If user not found
 *
 * @example
 * const user = await updateUserLastLogin(123)
 */
export async function updateUserLastLogin(userId) {
  const now = new Date().toISOString()

  const [updatedUser] = await db
    .update(users)
    .set({ lastLoginAt: now })
    .where(eq(users.id, userId))
    .returning()

  if (!updatedUser) {
    throw new Error(`User not found with id: ${userId}`)
  }

  return updatedUser
}

/**
 * Synchronizes user data from OAuth provider to database
 * This is the main function called during authentication flow
 *
 * Flow:
 * 1. Check if user exists (by provider + providerUserId)
 * 2. If exists: update profile data and lastLoginAt
 * 3. If not exists: create new user
 *
 * @param {Object} oauthData - OAuth data from authentication
 * @param {string} oauthData.provider - OAuth provider name
 * @param {string} oauthData.providerUserId - Provider's user ID
 * @param {string} oauthData.email - User's email address
 * @param {string} [oauthData.name] - User's display name
 * @param {string} [oauthData.avatarUrl] - User's avatar URL
 * @returns {Promise<Object>} Synced user object
 * @throws {Error} If required fields are missing or database operation fails
 *
 * @example
 * // Called in Auth.js signIn callback
 * const user = await syncUserFromOAuth({
 *   provider: 'facebook',
 *   providerUserId: 'fb_12345',
 *   email: 'user@example.com',
 *   name: 'John Doe',
 *   avatarUrl: 'https://graph.facebook.com/fb_12345/picture'
 * })
 */
export async function syncUserFromOAuth(oauthData) {
  // Validate required fields
  if (!oauthData.provider) {
    throw new Error('Provider is required for user sync')
  }

  if (!oauthData.providerUserId) {
    throw new Error('Provider user ID is required for user sync')
  }

  if (!oauthData.email) {
    throw new Error('Email is required for user sync')
  }

  try {
    // Check if user already exists
    const existingUser = await findUserByProviderAndId(
      oauthData.provider,
      oauthData.providerUserId
    )

    if (existingUser) {
      // User exists - update profile data and login timestamp
      const now = new Date().toISOString()

      const [updatedUser] = await db
        .update(users)
        .set({
          email: oauthData.email,
          name: oauthData.name || existingUser.name,
          avatarUrl: oauthData.avatarUrl || existingUser.avatarUrl,
          lastLoginAt: now
        })
        .where(eq(users.id, existingUser.id))
        .returning()

      return updatedUser
    } else {
      // User doesn't exist - create new user
      const newUser = await createUserFromOAuth(oauthData)
      return newUser
    }
  } catch (error) {
    // Re-throw with more context for database errors
    if (error.message.includes('SQLITE') || error.message.includes('database')) {
      throw new Error(`Database error during user sync: ${error.message}`)
    }
    throw error
  }
}
