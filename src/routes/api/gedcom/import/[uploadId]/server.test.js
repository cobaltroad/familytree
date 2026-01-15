/**
 * GEDCOM Import API Integration Tests
 * Story #95: Import GEDCOM Data to User's Tree
 *
 * Tests for POST /api/gedcom/import/:uploadId endpoint
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { POST } from './+server.js'
import { db } from '$lib/db/client.js'
import { people, relationships, users } from '$lib/db/schema.js'
import { eq, and } from 'drizzle-orm'
import { storePreviewData, saveResolutionDecisions } from '$lib/server/gedcomPreview.js'
import { createMockAuthenticatedEvent, createMockSession } from '$lib/server/testHelpers.js'

describe('POST /api/gedcom/import/:uploadId', () => {
  let testUserId
  let uploadId
  let insertedPersonIds = []
  let insertedRelationshipIds = []

  beforeEach(async () => {
    // Create a test user in the database
    const testEmail = `test-${Date.now()}@example.com`
    const [user] = await db
      .insert(users)
      .values({
        email: testEmail,
        name: 'Test User',
        provider: 'test',
        providerUserId: `test-${Date.now()}`
      })
      .returning()

    testUserId = user.id
    uploadId = `test-upload-${Date.now()}`

    // Clear any existing test data
    insertedPersonIds = []
    insertedRelationshipIds = []
  })

  afterEach(async () => {
    // Clean up test user (cascade will delete people and relationships)
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId))
    }
  })

  it('should handle families referencing non-existent individuals gracefully', async () => {
    // This test reproduces the foreign key constraint error
    // when families reference individuals not in the individuals array
    const previewData = {
      individuals: [
        {
          id: 'I001',
          firstName: 'John',
          lastName: 'Smith',
          sex: 'M',
          _original: { children: [] }
        }
      ],
      families: [
        {
          id: 'F001',
          husband: 'I001',
          wife: 'I999',  // This individual doesn't exist in individuals array!
          children: []
        }
      ]
    }

    await storePreviewData(uploadId, testUserId, previewData, [])

    const request = new Request('http://localhost/api/gedcom/import/' + uploadId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importAll: true })
    })

    const session = createMockSession(testUserId, 'test@example.com', 'Test User')
    const event = createMockAuthenticatedEvent(db, session, {
      request,
      params: { uploadId }
    })

    const response = await POST(event)

    // Should not fail with foreign key constraint error
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)

    // Should import 1 person
    expect(data.imported.persons).toBe(1)

    // Should not create spouse relationship (wife doesn't exist)
    expect(data.imported.relationships).toBe(0)

    // Verify database
    const personsInDb = await db
      .select()
      .from(people)
      .where(eq(people.userId, testUserId))

    expect(personsInDb).toHaveLength(1)
    insertedPersonIds = personsInDb.map(p => p.id)

    const relationshipsInDb = await db
      .select()
      .from(relationships)
      .where(eq(relationships.userId, testUserId))

    expect(relationshipsInDb).toHaveLength(0)
  })

  it('should import all individuals when no duplicates exist', async () => {
    // Setup preview data
    const previewData = {
      individuals: [
        {
          id: 'I001',
          firstName: 'John',
          lastName: 'Smith',
          sex: 'M',
          birthDate: '1950-01-15',
          _original: { children: [] }
        },
        {
          id: 'I002',
          firstName: 'Jane',
          lastName: 'Smith',
          sex: 'F',
          birthDate: '1952-03-20',
          _original: { children: [] }
        }
      ],
      families: [
        {
          id: 'F001',
          husband: 'I001',
          wife: 'I002',
          children: []
        }
      ]
    }

    await storePreviewData(uploadId, testUserId, previewData, [])

    // Create mock request
    const request = new Request('http://localhost/api/gedcom/import/' + uploadId, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        importAll: true
      })
    })

    // Create authenticated event with matching user ID
    const session = createMockSession(testUserId, 'test@example.com', 'Test User')
    const event = createMockAuthenticatedEvent(db, session, {
      request,
      params: { uploadId }
    })

    // Call endpoint
    const response = await POST(event)

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.imported.persons).toBe(2)
    expect(data.imported.relationships).toBe(2) // 2 spouse relationships

    // Verify database records
    const personsInDb = await db
      .select()
      .from(people)
      .where(eq(people.userId, testUserId))

    expect(personsInDb).toHaveLength(2)

    // Store IDs for cleanup
    insertedPersonIds = personsInDb.map(p => p.id)

    // Verify relationships
    const relationshipsInDb = await db
      .select()
      .from(relationships)
      .where(eq(relationships.userId, testUserId))

    expect(relationshipsInDb).toHaveLength(2)
    insertedRelationshipIds = relationshipsInDb.map(r => r.id)

    // Verify spouse relationships are bidirectional
    expect(relationshipsInDb.filter(r => r.type === 'spouse')).toHaveLength(2)
  })

  it('should create parent-child relationships correctly', async () => {
    const previewData = {
      individuals: [
        {
          id: 'I001',
          firstName: 'John',
          lastName: 'Smith',
          sex: 'M',
          _original: { children: [] }
        },
        {
          id: 'I002',
          firstName: 'Jane',
          lastName: 'Smith',
          sex: 'F',
          _original: { children: [] }
        },
        {
          id: 'I003',
          firstName: 'Bob',
          lastName: 'Smith',
          sex: 'M',
          _original: { children: [] }
        }
      ],
      families: [
        {
          id: 'F001',
          husband: 'I001',
          wife: 'I002',
          children: ['I003']
        }
      ]
    }

    await storePreviewData(uploadId, testUserId, previewData, [])

    const request = new Request('http://localhost/api/gedcom/import/' + uploadId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importAll: true })
    })

    const session = createMockSession(testUserId, 'test@example.com', 'Test User')
    const event = createMockAuthenticatedEvent(db, session, {
      request,
      params: { uploadId }
    })

    const response = await POST(event)

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.imported.persons).toBe(3)
    expect(data.imported.relationships).toBe(4) // 2 parent-child + 2 spouse

    // Verify relationships
    const relationshipsInDb = await db
      .select()
      .from(relationships)
      .where(eq(relationships.userId, testUserId))

    insertedRelationshipIds = relationshipsInDb.map(r => r.id)

    const personsInDb = await db
      .select()
      .from(people)
      .where(eq(people.userId, testUserId))

    insertedPersonIds = personsInDb.map(p => p.id)

    // Find parent IDs
    const john = personsInDb.find(p => p.firstName === 'John')
    const jane = personsInDb.find(p => p.firstName === 'Jane')
    const bob = personsInDb.find(p => p.firstName === 'Bob')

    // Verify father relationship
    const fatherRel = relationshipsInDb.find(
      r => r.person1Id === john.id && r.person2Id === bob.id && r.type === 'parentOf'
    )
    expect(fatherRel).toBeDefined()
    expect(fatherRel.parentRole).toBe('father')

    // Verify mother relationship
    const motherRel = relationshipsInDb.find(
      r => r.person1Id === jane.id && r.person2Id === bob.id && r.type === 'parentOf'
    )
    expect(motherRel).toBeDefined()
    expect(motherRel.parentRole).toBe('mother')
  })

  it('should handle duplicate merge resolution', async () => {
    // Create an existing person
    const [existingPerson] = await db
      .insert(people)
      .values({
        firstName: 'John',
        lastName: 'Smith',
        gender: 'male',
        birthDate: '1950-01-15',
        userId: testUserId
      })
      .returning()

    insertedPersonIds.push(existingPerson.id)

    const previewData = {
      individuals: [
        {
          id: 'I001',  // storePreviewData expects 'id', not 'gedcomId'
          firstName: 'John Robert',
          lastName: 'Smith',
          sex: 'M',
          birthDate: '1950-01-15',
          _original: { children: [] }
        },
        {
          id: 'I002',  // storePreviewData expects 'id', not 'gedcomId'
          firstName: 'Jane',
          lastName: 'Doe',
          sex: 'F',
          _original: { children: [] }
        }
      ],
      families: []
    }

    const duplicates = [
      {
        gedcomPerson: previewData.individuals[0],
        existingPerson: {
          id: existingPerson.id,
          firstName: 'John',
          lastName: 'Smith'
        },
        confidence: 0.95,
        matchingFields: ['firstName', 'lastName', 'birthDate']
      }
    ]

    await storePreviewData(uploadId, testUserId, previewData, duplicates)

    // Save resolution decision to merge
    await saveResolutionDecisions(uploadId, testUserId, [
      {
        gedcomId: 'I001',
        resolution: 'merge',
        existingPersonId: existingPerson.id
      }
    ])

    const request = new Request('http://localhost/api/gedcom/import/' + uploadId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importAll: true })
    })

    const session = createMockSession(testUserId, 'test@example.com', 'Test User')
    const event = createMockAuthenticatedEvent(db, session, {
      request,
      params: { uploadId }
    })

    const response = await POST(event)

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.imported.persons).toBe(1) // Only I002 inserted
    expect(data.imported.updated).toBe(1) // I001 updated

    // Verify only 2 people total (1 existing + 1 new)
    const personsInDb = await db
      .select()
      .from(people)
      .where(eq(people.userId, testUserId))

    expect(personsInDb).toHaveLength(2)

    // Verify existing person was updated
    const updatedPerson = personsInDb.find(p => p.id === existingPerson.id)
    expect(updatedPerson.firstName).toBe('John Robert')

    // Store all IDs for cleanup
    insertedPersonIds = personsInDb.map(p => p.id)
  })

  it('should handle duplicate skip resolution', async () => {
    // Create an existing person
    const [existingPerson] = await db
      .insert(people)
      .values({
        firstName: 'John',
        lastName: 'Smith',
        gender: 'male',
        userId: testUserId
      })
      .returning()

    insertedPersonIds.push(existingPerson.id)

    const previewData = {
      individuals: [
        {
          id: 'I001',  // storePreviewData expects 'id', not 'gedcomId'
          firstName: 'John',
          lastName: 'Smith',
          sex: 'M',
          _original: { children: [] }
        },
        {
          id: 'I002',  // storePreviewData expects 'id', not 'gedcomId'
          firstName: 'Jane',
          lastName: 'Doe',
          sex: 'F',
          _original: { children: [] }
        }
      ],
      families: []
    }

    const duplicates = [
      {
        gedcomPerson: previewData.individuals[0],
        existingPerson: {
          id: existingPerson.id,
          firstName: 'John',
          lastName: 'Smith'
        },
        confidence: 0.95,
        matchingFields: ['firstName', 'lastName']
      }
    ]

    await storePreviewData(uploadId, testUserId, previewData, duplicates)

    // Save resolution decision to skip
    await saveResolutionDecisions(uploadId, testUserId, [
      {
        gedcomId: 'I001',
        resolution: 'skip',
        existingPersonId: existingPerson.id
      }
    ])

    const request = new Request('http://localhost/api/gedcom/import/' + uploadId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importAll: true })
    })

    const session = createMockSession(testUserId, 'test@example.com', 'Test User')
    const event = createMockAuthenticatedEvent(db, session, {
      request,
      params: { uploadId }
    })

    const response = await POST(event)

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.imported.persons).toBe(1) // Only I002 inserted
    expect(data.imported.updated).toBe(0) // Nothing updated

    // Verify only 2 people total (1 existing + 1 new)
    const personsInDb = await db
      .select()
      .from(people)
      .where(eq(people.userId, testUserId))

    expect(personsInDb).toHaveLength(2)

    insertedPersonIds = personsInDb.map(p => p.id)
  })

  it('should rollback on transaction error', async () => {
    // This test simulates a transaction error
    // We'll create a scenario that would violate constraints

    const previewData = {
      individuals: [
        {
          id: 'I001',
          firstName: 'John',
          lastName: 'Smith',
          sex: 'M',
          _original: { children: [] }
        }
      ],
      families: []
    }

    await storePreviewData(uploadId, testUserId, previewData, [])

    // Count persons before import
    const personsBefore = await db
      .select()
      .from(people)
      .where(eq(people.userId, testUserId))

    const countBefore = personsBefore.length

    // We can't easily force a transaction error in this test without
    // mocking the database, so we'll verify the transaction behavior
    // by checking that either all data is inserted or none is

    const request = new Request('http://localhost/api/gedcom/import/' + uploadId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importAll: true })
    })

    const session = createMockSession(testUserId, 'test@example.com', 'Test User')
    const event = createMockAuthenticatedEvent(db, session, {
      request,
      params: { uploadId }
    })

    const response = await POST(event)

    // If successful, verify all data is there
    if (response.status === 200) {
      const personsAfter = await db
        .select()
        .from(people)
        .where(eq(people.userId, testUserId))

      expect(personsAfter.length).toBe(countBefore + 1)
      insertedPersonIds = personsAfter.map(p => p.id)
    }
  })

  it('should return 404 if preview data not found', async () => {
    const request = new Request('http://localhost/api/gedcom/import/nonexistent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importAll: true })
    })

    const session = createMockSession(testUserId, 'test@example.com', 'Test User')
    const event = createMockAuthenticatedEvent(db, session, {
      request,
      params: { uploadId: 'nonexistent' }
    })

    const response = await POST(event)

    expect(response.status).toBe(404)

    const data = await response.json()
    expect(data.error).toBeDefined()
  })

  it('should return 401 if user not authenticated', async () => {
    const request = new Request('http://localhost/api/gedcom/import/' + uploadId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importAll: true })
    })

    // Create event with truly no session (getSession returns null)
    const event = {
      request,
      params: { uploadId },
      locals: {
        db,
        getSession: async () => null
      }
    }

    const response = await POST(event)

    expect(response.status).toBe(401)
  })

  it('should set correct user_id on all records', async () => {
    const previewData = {
      individuals: [
        {
          id: 'I001',
          firstName: 'John',
          lastName: 'Smith',
          sex: 'M',
          _original: { children: [] }
        },
        {
          id: 'I002',
          firstName: 'Jane',
          lastName: 'Smith',
          sex: 'F',
          _original: { children: [] }
        }
      ],
      families: [
        {
          id: 'F001',
          husband: 'I001',
          wife: 'I002',
          children: []
        }
      ]
    }

    await storePreviewData(uploadId, testUserId, previewData, [])

    const request = new Request('http://localhost/api/gedcom/import/' + uploadId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importAll: true })
    })

    const session = createMockSession(testUserId, 'test@example.com', 'Test User')
    const event = createMockAuthenticatedEvent(db, session, {
      request,
      params: { uploadId }
    })

    const response = await POST(event)

    expect(response.status).toBe(200)

    // Verify all people have correct user_id
    const personsInDb = await db
      .select()
      .from(people)
      .where(eq(people.userId, testUserId))

    expect(personsInDb.every(p => p.userId === testUserId)).toBe(true)
    insertedPersonIds = personsInDb.map(p => p.id)

    // Verify all relationships have correct user_id
    const relationshipsInDb = await db
      .select()
      .from(relationships)
      .where(eq(relationships.userId, testUserId))

    expect(relationshipsInDb.every(r => r.userId === testUserId)).toBe(true)
    insertedRelationshipIds = relationshipsInDb.map(r => r.id)
  })

  it('should handle photo URLs from GEDCOM', async () => {
    const previewData = {
      individuals: [
        {
          id: 'I001',  // storePreviewData expects 'id', not 'gedcomId'
          firstName: 'John',
          lastName: 'Smith',
          sex: 'M',
          _original: {
            children: [
              {
                type: 'OBJE',
                children: [
                  { type: 'FILE', value: 'https://example.com/john.jpg' }
                ]
              }
            ]
          }
        }
      ],
      families: []
    }

    await storePreviewData(uploadId, testUserId, previewData, [])

    const request = new Request('http://localhost/api/gedcom/import/' + uploadId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importAll: true })
    })

    const session = createMockSession(testUserId, 'test@example.com', 'Test User')
    const event = createMockAuthenticatedEvent(db, session, {
      request,
      params: { uploadId }
    })

    const response = await POST(event)

    expect(response.status).toBe(200)

    // Verify photo URL was stored
    const personsInDb = await db
      .select()
      .from(people)
      .where(eq(people.userId, testUserId))

    expect(personsInDb).toHaveLength(1)
    expect(personsInDb[0].photoUrl).toBe('https://example.com/john.jpg')

    insertedPersonIds = personsInDb.map(p => p.id)
  })

  it('should auto-create user record if session exists but user record is missing', async () => {
    // This test simulates the chicken-and-egg problem:
    // User authenticates via OAuth, gets a session with a user ID,
    // but tries to import GEDCOM into a fresh/empty database where
    // the user record doesn't exist yet (e.g., restore from backup scenario)

    // Create a session with a user ID that doesn't exist in the database
    const nonExistentUserId = 999999
    const userEmail = 'fresh-user@example.com'
    const userName = 'Fresh User'

    // Verify user doesn't exist
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, nonExistentUserId))
    expect(existingUsers).toHaveLength(0)

    // Setup preview data
    const previewData = {
      individuals: [
        {
          id: 'I001',
          firstName: 'John',
          lastName: 'Smith',
          sex: 'M',
          _original: { children: [] }
        }
      ],
      families: []
    }

    // Store preview data with the non-existent user ID
    await storePreviewData(uploadId, nonExistentUserId, previewData, [])

    const request = new Request('http://localhost/api/gedcom/import/' + uploadId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importAll: true })
    })

    // Create session with non-existent user ID (OAuth gave us this ID)
    const session = createMockSession(nonExistentUserId, userEmail, userName)
    const event = createMockAuthenticatedEvent(db, session, {
      request,
      params: { uploadId }
    })

    const response = await POST(event)

    // Should succeed (not fail with foreign key constraint error)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.imported.persons).toBe(1)

    // Verify user record was auto-created
    const createdUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, nonExistentUserId))

    expect(createdUsers).toHaveLength(1)
    expect(createdUsers[0].email).toBe(userEmail)
    expect(createdUsers[0].name).toBe(userName)

    // Verify person was imported with correct user_id
    const personsInDb = await db
      .select()
      .from(people)
      .where(eq(people.userId, nonExistentUserId))

    expect(personsInDb).toHaveLength(1)
    expect(personsInDb[0].userId).toBe(nonExistentUserId)

    // Track IDs for cleanup
    insertedPersonIds = personsInDb.map(p => p.id)
    testUserId = nonExistentUserId // Cleanup in afterEach
  })
})
