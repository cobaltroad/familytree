/**
 * GEDCOM Import ID Mapping Tests
 *
 * Tests to reproduce and fix the foreign key constraint violation
 * when importing GEDCOM files with relationships.
 *
 * RED: This test should fail initially, exposing the ID mapping bug
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { POST } from './+server.js'
import { db } from '$lib/db/client.js'
import { people, relationships, users } from '$lib/db/schema.js'
import { eq } from 'drizzle-orm'
import { storePreviewData } from '$lib/server/gedcomPreview.js'
import { createMockAuthenticatedEvent, createMockSession } from '$lib/server/testHelpers.js'

describe('GEDCOM Import ID Mapping - Reproducing Foreign Key Error', () => {
  let testUserId
  let uploadId
  let insertedPersonIds = []

  beforeEach(async () => {
    // Create a test user
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
    insertedPersonIds = []
  })

  afterEach(async () => {
    // Clean up
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId))
    }
  })

  it('should handle GEDCOM IDs correctly when building relationships', async () => {
    // This test reproduces the exact structure from the actual GEDCOM parser
    // where individuals have 'id' field and storePreviewData wraps them with 'gedcomId'

    const parsedIndividuals = [
      {
        id: '@I1@',  // GEDCOM ID format from parser
        name: 'Ron /Dollete/',
        firstName: 'Ron',
        lastName: 'Dollete',
        sex: 'M',
        birthDate: '1979-01-29',
        childOfFamily: null,
        spouseFamilies: ['@F1@'],
        _dateErrors: []
      },
      {
        id: '@I2@',
        name: 'McKenna /Dollete/',
        firstName: 'McKenna',
        lastName: 'Dollete',
        sex: 'F',
        birthDate: '1987-11-30',
        childOfFamily: null,
        spouseFamilies: ['@F1@'],
        _dateErrors: []
      },
      {
        id: '@I3@',
        name: 'Oscar /Dollete/',
        firstName: 'Oscar',
        lastName: 'Dollete',
        sex: 'M',
        birthDate: '2018-09-28',
        childOfFamily: '@F1@',
        spouseFamilies: [],
        _dateErrors: []
      }
    ]

    const parsedFamilies = [
      {
        id: '@F1@',
        husband: '@I1@',
        wife: '@I2@',
        children: ['@I3@'],
        marriageDate: null
      }
    ]

    const previewData = {
      individuals: parsedIndividuals,
      families: parsedFamilies
    }

    // storePreviewData wraps individuals with gedcomId field
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

    // This should NOT fail with foreign key constraint error
    const response = await POST(event)

    // Assert success
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)

    // Should import 3 persons
    expect(data.imported.persons).toBe(3)

    // Should create 4 relationships: 2 spouse + 2 parent-child
    expect(data.imported.relationships).toBe(4)

    // Verify database
    const personsInDb = await db
      .select()
      .from(people)
      .where(eq(people.userId, testUserId))

    expect(personsInDb).toHaveLength(3)
    insertedPersonIds = personsInDb.map(p => p.id)

    const relationshipsInDb = await db
      .select()
      .from(relationships)
      .where(eq(relationships.userId, testUserId))

    expect(relationshipsInDb).toHaveLength(4)

    // Verify all relationships reference valid person IDs
    const personIdSet = new Set(personsInDb.map(p => p.id))

    for (const rel of relationshipsInDb) {
      expect(personIdSet.has(rel.person1Id)).toBe(true)
      expect(personIdSet.has(rel.person2Id)).toBe(true)
    }

    // Verify parent-child relationships exist
    const ron = personsInDb.find(p => p.firstName === 'Ron')
    const mckenna = personsInDb.find(p => p.firstName === 'McKenna')
    const oscar = personsInDb.find(p => p.firstName === 'Oscar')

    expect(ron).toBeDefined()
    expect(mckenna).toBeDefined()
    expect(oscar).toBeDefined()

    // Find father relationship
    const fatherRel = relationshipsInDb.find(
      r => r.person1Id === ron.id && r.person2Id === oscar.id && r.type === 'parentOf'
    )
    expect(fatherRel).toBeDefined()
    expect(fatherRel.parentRole).toBe('father')

    // Find mother relationship
    const motherRel = relationshipsInDb.find(
      r => r.person1Id === mckenna.id && r.person2Id === oscar.id && r.type === 'parentOf'
    )
    expect(motherRel).toBeDefined()
    expect(motherRel.parentRole).toBe('mother')
  })

  it('should skip relationships when referenced person is not in the import', async () => {
    // This test reproduces the scenario where a family references someone
    // who was skipped or not imported (e.g., duplicate resolution = skip)

    const parsedIndividuals = [
      {
        id: '@I1@',
        firstName: 'John',
        lastName: 'Doe',
        sex: 'M',
        _dateErrors: []
      },
      {
        id: '@I2@',
        firstName: 'Jane',
        lastName: 'Doe',
        sex: 'F',
        _dateErrors: []
      },
      {
        id: '@I3@',  // This person will be skipped via resolution decision
        firstName: 'Bob',
        lastName: 'Existing',
        sex: 'M',
        _dateErrors: []
      }
    ]

    const parsedFamilies = [
      {
        id: '@F1@',
        husband: '@I1@',
        wife: '@I2@',
        children: ['@I3@']  // Child was skipped, so this relationship should be skipped
      }
    ]

    const previewData = {
      individuals: parsedIndividuals,
      families: parsedFamilies
    }

    await storePreviewData(uploadId, testUserId, previewData, [])

    // Simulate skip resolution for @I3@
    const { saveResolutionDecisions } = await import('$lib/server/gedcomPreview.js')
    await saveResolutionDecisions(uploadId, testUserId, [
      {
        gedcomId: '@I3@',
        resolution: 'skip',
        existingPersonId: 9999  // Some existing person ID
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

    // Should return 400 error because referenced person doesn't exist
    const response = await POST(event)

    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('INVALID_PERSON_REFERENCE')
    expect(data.error.message).toContain('no longer exist')
    expect(data.error.details).toContain('9999')

    // Verify database - transaction should have rolled back, no data inserted
    const personsInDb = await db
      .select()
      .from(people)
      .where(eq(people.userId, testUserId))

    // No persons should have been inserted due to validation failure
    expect(personsInDb).toHaveLength(0)

    const relationshipsInDb = await db
      .select()
      .from(relationships)
      .where(eq(relationships.userId, testUserId))

    // No relationships should have been created
    expect(relationshipsInDb).toHaveLength(0)
  })

  it('should map GEDCOM IDs to database IDs correctly in buildRelationshipsAfterInsertion', async () => {
    // Test the specific function that's causing the issue
    const { prepareImportData, buildRelationshipsAfterInsertion } = await import('$lib/server/gedcomImporter.js')

    const parsedIndividuals = [
      {
        id: '@I1@',
        firstName: 'John',
        lastName: 'Doe',
        sex: 'M',
        _dateErrors: []
      },
      {
        id: '@I2@',
        firstName: 'Jane',
        lastName: 'Doe',
        sex: 'F',
        _dateErrors: []
      }
    ]

    const parsedFamilies = [
      {
        id: '@F1@',
        husband: '@I1@',
        wife: '@I2@',
        children: []
      }
    ]

    const previewData = {
      individuals: parsedIndividuals,
      families: parsedFamilies
    }

    // Store preview data (this wraps individuals with gedcomId)
    await storePreviewData(uploadId, testUserId, previewData, [])

    // Get the wrapped preview data back
    const { getPreviewData } = await import('$lib/server/gedcomPreview.js')
    const storedPreviewData = await getPreviewData(uploadId, testUserId)

    // Prepare import data
    const importData = prepareImportData(storedPreviewData, [], testUserId)

    // Simulate inserting persons and getting back database IDs
    const insertedPersons = [
      { gedcomId: '@I1@', personId: 1001 },
      { gedcomId: '@I2@', personId: 1002 }
    ]

    // Build relationships
    const relationshipsToInsert = buildRelationshipsAfterInsertion(
      importData,
      insertedPersons,
      testUserId
    )

    // Verify relationships were created with correct database IDs
    expect(relationshipsToInsert).toHaveLength(2) // 2 spouse relationships

    // Check that all relationships use database IDs, not GEDCOM IDs
    for (const rel of relationshipsToInsert) {
      expect(rel.person1Id).toBeGreaterThan(1000) // Should be database ID
      expect(rel.person2Id).toBeGreaterThan(1000) // Should be database ID
      expect(rel.person1Id).not.toContain('@') // Should NOT be GEDCOM ID
      expect(rel.person2Id).not.toContain('@') // Should NOT be GEDCOM ID
    }

    // Verify bidirectional spouse relationship
    const spouse1 = relationshipsToInsert.find(
      r => r.person1Id === 1001 && r.person2Id === 1002
    )
    const spouse2 = relationshipsToInsert.find(
      r => r.person1Id === 1002 && r.person2Id === 1001
    )

    expect(spouse1).toBeDefined()
    expect(spouse1.type).toBe('spouse')
    expect(spouse2).toBeDefined()
    expect(spouse2.type).toBe('spouse')
  })
})
