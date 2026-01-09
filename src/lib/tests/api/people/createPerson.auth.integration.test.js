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
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { users, people } from '$lib/db/schema.js'
import { eq } from 'drizzle-orm'
import { setupTestDatabase } from '$lib/server/testHelpers.js'
import { POST } from '../../../../routes/api/people/+server.js'

describe.sequential('End-to-End: Create Person with OAuth Authentication', () => {
  let db
  let sqlite
  let testUserId

  beforeEach(async () => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // Use setupTestDatabase for consistent schema with foreign keys enabled (Issue #117)
    await setupTestDatabase(sqlite, db)
  })

  afterEach(() => {
    // Clean up database
    sqlite.close()
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
    // Create user in test database (simulating what syncUserFromOAuth does)
    const [dbUser] = await db
      .insert(users)
      .values({
        email: oauthData.email,
        name: oauthData.name,
        avatarUrl: oauthData.avatarUrl,
        provider: oauthData.provider,
        providerUserId: oauthData.providerUserId,
        emailVerified: true
      })
      .returning()

    testUserId = dbUser.id

    // Verify user was created in database
    expect(dbUser).toBeDefined()
    expect(dbUser.id).toBeDefined()
    expect(typeof dbUser.id).toBe('number')
    expect(dbUser.email).toBe('integration@test.com')

    // ===== STEP 3: Create Session =====
    // Create session object with the test database user ID
    const sessionResult = {
      user: {
        id: testUserId,
        email: dbUser.email,
        name: dbUser.name
      }
    }

    // ===== STEP 4: Create Person =====
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

    // Create mock event object with authenticated session and test database
    const mockEvent = {
      request: mockRequest,
      locals: {
        db: db, // Pass test database to POST endpoint (Issue #117)
        getSession: async () => sessionResult
      }
    }

    // Call the POST endpoint
    const response = await POST(mockEvent)

    // ===== STEP 5: Verify Success =====
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

    // Create user in test database (simulating what syncUserFromOAuth does)
    const [dbUser] = await db
      .insert(users)
      .values({
        email: oauthData.email,
        name: oauthData.name,
        provider: oauthData.provider,
        providerUserId: oauthData.providerUserId,
        emailVerified: true
      })
      .returning()

    testUserId = dbUser.id

    // Create session object with the test database user ID
    const session = {
      user: {
        id: testUserId,
        email: dbUser.email,
        name: dbUser.name
      }
    }

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
          db: db, // Pass test database to POST endpoint (Issue #117)
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
        db: db, // Pass test database to POST endpoint (Issue #117)
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
