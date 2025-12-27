/**
 * End-to-End Integration Test: Create Person with Authentication
 *
 * Tests the complete flow from OAuth sign-in to creating a person.
 * This test verifies that the foreign key constraint bug (Issue #72) is fixed.
 *
 * Flow:
 * 1. User authenticates via OAuth (Facebook)
 * 2. signInCallback syncs user to database
 * 3. jwtCallback creates JWT token with database user ID
 * 4. sessionCallback provides session with database user ID
 * 5. POST /api/people creates person with user_id from session
 * 6. Person is successfully created (no foreign key constraint error)
 *
 * Following TDD methodology: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '$lib/db/client.js'
import { users, people } from '$lib/db/schema.js'
import { eq } from 'drizzle-orm'
import { syncUserFromOAuth } from '$lib/server/userSync.js'
import { jwtCallback, sessionCallback } from '$lib/server/auth.js'
import { POST } from './+server.js'

describe.sequential('End-to-End: Create Person with OAuth Authentication', () => {
  let testUserId

  beforeEach(async () => {
    // Clean up database
    await db.delete(people)
    await db.delete(users)
  })

  afterEach(async () => {
    // Clean up database
    await db.delete(people)
    await db.delete(users)
  })

  it('should successfully create person after OAuth sign-in (full flow)', async () => {
    // ===== STEP 1: OAuth Sign-In =====
    // Simulate user signing in with Facebook
    const oauthData = {
      provider: 'facebook',
      providerUserId: 'fb_integration_test_123',
      email: 'integration@test.com',
      name: 'Integration Test User',
      avatarUrl: 'https://graph.facebook.com/integration_test_123/picture'
    }

    // ===== STEP 2: User Sync =====
    // signInCallback syncs user to database
    const dbUser = await syncUserFromOAuth(oauthData)
    testUserId = dbUser.id

    // Verify user was created in database
    expect(dbUser).toBeDefined()
    expect(dbUser.id).toBeDefined()
    expect(typeof dbUser.id).toBe('number')
    expect(dbUser.email).toBe('integration@test.com')

    // ===== STEP 3: JWT Token Creation =====
    // jwtCallback creates JWT token (simulating Auth.js behavior)
    const token = {}
    const user = {
      id: oauthData.providerUserId, // OAuth provider's user ID
      email: oauthData.email,
      name: oauthData.name,
      image: oauthData.avatarUrl
    }
    const account = {
      provider: 'facebook',
      providerAccountId: oauthData.providerUserId
    }

    const jwtToken = await jwtCallback({ token, user, account })

    // Verify JWT token contains database user ID, not OAuth ID
    expect(jwtToken.userId).toBe(testUserId)
    expect(jwtToken.userId).not.toBe(oauthData.providerUserId)

    // ===== STEP 4: Session Creation =====
    // sessionCallback creates session object
    const session = {}
    const sessionResult = await sessionCallback({ session, token: jwtToken })

    // Verify session contains database user ID
    expect(sessionResult.user).toBeDefined()
    expect(sessionResult.user.id).toBe(testUserId)

    // ===== STEP 5: Create Person =====
    // Simulate authenticated request to create person
    const personData = {
      firstName: 'Test',
      lastName: 'Person',
      birthDate: '1990-01-01',
      gender: 'male'
    }

    // Create mock request object
    const mockRequest = {
      json: async () => personData
    }

    // Create mock event object with authenticated session
    const mockEvent = {
      request: mockRequest,
      locals: {
        getSession: async () => sessionResult
      }
    }

    // Call the POST endpoint
    const response = await POST(mockEvent)

    // ===== STEP 6: Verify Success =====
    // Should return 201 Created (not 500 Internal Server Error)
    expect(response.status).toBe(201)

    // Parse response body
    const responseBody = await response.json()

    // Verify person was created successfully
    expect(responseBody).toBeDefined()
    expect(responseBody.id).toBeDefined()
    expect(responseBody.firstName).toBe('Test')
    expect(responseBody.lastName).toBe('Person')

    // Verify person exists in database with correct user_id
    const peopleInDb = await db.select().from(people)
    expect(peopleInDb).toHaveLength(1)
    expect(peopleInDb[0].userId).toBe(testUserId)
    expect(peopleInDb[0].firstName).toBe('Test')
    expect(peopleInDb[0].lastName).toBe('Person')

    // Verify the user_id foreign key constraint is satisfied
    const userInDb = await db.select().from(users).where(eq(users.id, peopleInDb[0].userId))
    expect(userInDb).toHaveLength(1)
    expect(userInDb[0].id).toBe(testUserId)
  })

  it('should create multiple people for the same authenticated user', async () => {
    // ===== Setup: Create authenticated user =====
    const oauthData = {
      provider: 'facebook',
      providerUserId: 'fb_multi_person_test',
      email: 'multi@test.com',
      name: 'Multi Person Test User'
    }

    const dbUser = await syncUserFromOAuth(oauthData)
    testUserId = dbUser.id

    // Create JWT token and session
    const jwtToken = await jwtCallback({
      token: {},
      user: { id: oauthData.providerUserId, email: oauthData.email, name: oauthData.name },
      account: { provider: 'facebook', providerAccountId: oauthData.providerUserId }
    })

    const session = await sessionCallback({ session: {}, token: jwtToken })

    // ===== Create multiple people =====
    const peopleToCreate = [
      { firstName: 'Alice', lastName: 'Smith', gender: 'female' },
      { firstName: 'Bob', lastName: 'Smith', gender: 'male' },
      { firstName: 'Charlie', lastName: 'Smith', gender: 'male' }
    ]

    for (const personData of peopleToCreate) {
      const mockRequest = {
        json: async () => personData
      }

      const mockEvent = {
        request: mockRequest,
        locals: {
          getSession: async () => session
        }
      }

      const response = await POST(mockEvent)
      expect(response.status).toBe(201)
    }

    // ===== Verify all people were created =====
    const peopleInDb = await db.select().from(people)
    expect(peopleInDb).toHaveLength(3)

    // Verify all people belong to the same user
    for (const person of peopleInDb) {
      expect(person.userId).toBe(testUserId)
    }
  })

  it('should fail to create person if user does not exist in database (edge case)', async () => {
    // This is an edge case that shouldn't happen if signInCallback works correctly
    // But it tests the defensive behavior of the system

    // Create session with non-existent user ID
    const fakeSession = {
      user: {
        id: 99999, // User ID that doesn't exist in database
        email: 'fake@test.com',
        name: 'Fake User'
      }
    }

    const personData = {
      firstName: 'Test',
      lastName: 'Person',
      gender: 'male'
    }

    const mockRequest = {
      json: async () => personData
    }

    const mockEvent = {
      request: mockRequest,
      locals: {
        getSession: async () => fakeSession
      }
    }

    // Call the POST endpoint
    const response = await POST(mockEvent)

    // Should return 500 Internal Server Error due to foreign key constraint
    expect(response.status).toBe(500)

    // Verify no person was created
    const peopleInDb = await db.select().from(people)
    expect(peopleInDb).toHaveLength(0)
  })
})
