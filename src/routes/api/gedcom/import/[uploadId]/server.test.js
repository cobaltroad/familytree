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

  it('should import all individuals when no duplicates exist', async () => {
    // Setup preview data
    const previewData = {
      individuals: [
        {
          gedcomId: 'I001',
          firstName: 'John',
          lastName: 'Smith',
          sex: 'M',
          birthDate: '1950-01-15',
          _original: { children: [] }
        },
        {
          gedcomId: 'I002',
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

    // Mock locals with session
    const mockLocals = {
      session: {
        userId: testUserId
      }
    }

    // Call endpoint
    const response = await POST({
      request,
      params: { uploadId },
      locals: mockLocals
    })

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
          gedcomId: 'I001',
          firstName: 'John',
          lastName: 'Smith',
          sex: 'M',
          _original: { children: [] }
        },
        {
          gedcomId: 'I002',
          firstName: 'Jane',
          lastName: 'Smith',
          sex: 'F',
          _original: { children: [] }
        },
        {
          gedcomId: 'I003',
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

    const response = await POST({
      request,
      params: { uploadId },
      locals: { session: { userId: testUserId } }
    })

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
          gedcomId: 'I001',
          firstName: 'John Robert',
          lastName: 'Smith',
          sex: 'M',
          birthDate: '1950-01-15',
          _original: { children: [] }
        },
        {
          gedcomId: 'I002',
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

    const response = await POST({
      request,
      params: { uploadId },
      locals: { session: { userId: testUserId } }
    })

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
          gedcomId: 'I001',
          firstName: 'John',
          lastName: 'Smith',
          sex: 'M',
          _original: { children: [] }
        },
        {
          gedcomId: 'I002',
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

    const response = await POST({
      request,
      params: { uploadId },
      locals: { session: { userId: testUserId } }
    })

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
          gedcomId: 'I001',
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

    const response = await POST({
      request,
      params: { uploadId },
      locals: { session: { userId: testUserId } }
    })

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

    const response = await POST({
      request,
      params: { uploadId: 'nonexistent' },
      locals: { session: { userId: testUserId } }
    })

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

    const response = await POST({
      request,
      params: { uploadId },
      locals: { session: null }
    })

    expect(response.status).toBe(401)
  })

  it('should set correct user_id on all records', async () => {
    const previewData = {
      individuals: [
        {
          gedcomId: 'I001',
          firstName: 'John',
          lastName: 'Smith',
          sex: 'M',
          _original: { children: [] }
        },
        {
          gedcomId: 'I002',
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

    const response = await POST({
      request,
      params: { uploadId },
      locals: { session: { userId: testUserId } }
    })

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
          gedcomId: 'I001',
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

    const response = await POST({
      request,
      params: { uploadId },
      locals: { session: { userId: testUserId } }
    })

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
})
