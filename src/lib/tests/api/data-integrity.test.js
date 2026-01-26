import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { GET as getPeople, POST as postPerson } from '../../../routes/api/people/+server.js'
import { GET as getPerson, PUT as putPerson, DELETE as deletePerson } from '../../../routes/api/people/[id]/+server.js'
import { GET as getRelationships, POST as postRelationship } from '../../../routes/api/relationships/+server.js'
import { DELETE as deleteRelationship } from '../../../routes/api/relationships/[id]/+server.js'
import { setupTestDatabase, createMockEvent } from '../../server/testHelpers.js'

/**
 * Data Integrity Tests for SvelteKit API Routes
 * Part of Story 6: Comprehensive Testing and Validation (Issue #65)
 *
 * Tests:
 * - CRUD operations maintain data integrity
 * - Foreign key constraints work correctly
 * - Cascade deletes work as expected
 * - No orphaned records
 * - Referential integrity maintained
 *
 * Updated for Issue #118: Uses authentication helpers
 */
describe('Data Integrity - CRUD Operations', () => {
  let db
  let sqlite
  let userId

  beforeEach(async () => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)
    userId = await setupTestDatabase(sqlite, db)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should maintain data integrity through full person CRUD lifecycle', async () => {
    // CREATE
    const createResponse = await postPerson(createMockEvent(db, {
      request: {
        json: async () => ({
          firstName: 'John',
          lastName: 'Doe',
          birthDate: '1980-01-01',
          gender: 'male'
        })
      }
    }))

    expect(createResponse.status).toBe(201)
    const created = await createResponse.json()
    const personId = created.id

    // READ
    const readResponse = await getPerson(createMockEvent(db, {
      params: { id: personId.toString() }
    }))

    expect(readResponse.status).toBe(200)
    const read = await readResponse.json()
    expect(read).toMatchObject({
      id: personId,
      firstName: 'John',
      lastName: 'Doe',
      birthDate: '1980-01-01',
      gender: 'male'
    })

    // UPDATE
    const updateResponse = await putPerson(createMockEvent(db, {
      params: { id: personId.toString() },
      request: {
        json: async () => ({
          firstName: 'Jane',
          lastName: 'Smith',
          birthDate: '1985-05-15',
          gender: 'female'
        })
      }
    }))

    expect(updateResponse.status).toBe(200)
    const updated = await updateResponse.json()
    expect(updated).toMatchObject({
      id: personId,
      firstName: 'Jane',
      lastName: 'Smith',
      birthDate: '1985-05-15',
      gender: 'female'
    })

    // Verify update persisted
    const verifyResponse = await getPerson(createMockEvent(db, {
      params: { id: personId.toString() }
    }))
    const verified = await verifyResponse.json()
    expect(verified.firstName).toBe('Jane')

    // DELETE
    const deleteResponse = await deletePerson(createMockEvent(db, {
      params: { id: personId.toString() }
    }))

    expect(deleteResponse.status).toBe(204)

    // Verify deletion
    const finalResponse = await getPerson(createMockEvent(db, {
      params: { id: personId.toString() }
    }))

    expect(finalResponse.status).toBe(404)
  })

  it('should maintain data integrity through full relationship CRUD lifecycle', async () => {
    // Create two people first
    const person1Response = await postPerson(createMockEvent(db, {
      request: {
        json: async () => ({ firstName: 'Child', lastName: 'Person' })
      }
    }))
    const person1 = await person1Response.json()

    const person2Response = await postPerson(createMockEvent(db, {
      request: {
        json: async () => ({ firstName: 'Mother', lastName: 'Person' })
      }
    }))
    const person2 = await person2Response.json()

    // CREATE relationship
    const createResponse = await postRelationship(createMockEvent(db, {
      request: {
        json: async () => ({
          person1Id: person2.id,
          person2Id: person1.id,
          type: 'mother'
        })
      }
    }))

    expect(createResponse.status).toBe(201)
    const created = await createResponse.json()
    const relationshipId = created.id

    // READ relationships
    const readResponse = await getRelationships(createMockEvent(db))
    expect(readResponse.status).toBe(200)
    const relationships = await readResponse.json()

    const foundRel = relationships.find(r => r.id === relationshipId)
    expect(foundRel).toBeDefined()
    expect(foundRel).toMatchObject({
      person1Id: person2.id,
      person2Id: person1.id,
      type: 'mother',
      parentRole: 'mother'
    })

    // DELETE relationship
    const deleteResponse = await deleteRelationship(createMockEvent(db, {
      params: { id: relationshipId.toString() }
    }))

    expect(deleteResponse.status).toBe(204)

    // Verify deletion
    const verifyResponse = await getRelationships(createMockEvent(db))
    const finalRelationships = await verifyResponse.json()
    const deletedRel = finalRelationships.find(r => r.id === relationshipId)
    expect(deletedRel).toBeUndefined()

    // Verify people still exist (only relationship deleted)
    const person1Check = await getPerson(createMockEvent(db, {
      params: { id: person1.id.toString() }
    }))
    const person2Check = await getPerson(createMockEvent(db, {
      params: { id: person2.id.toString() }
    }))

    expect(person1Check.status).toBe(200)
    expect(person2Check.status).toBe(200)
  })
})

describe('Data Integrity - Foreign Key Constraints', () => {
  let db
  let sqlite
  let userId

  beforeEach(async () => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)
    userId = await setupTestDatabase(sqlite, db)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should CASCADE DELETE relationships when person is deleted', async () => {
    // Create two people
    const child = await postPerson(createMockEvent(db, {
      request: { json: async () => ({ firstName: 'Child', lastName: 'One' }) }
    })).then(r => r.json())

    const parent = await postPerson(createMockEvent(db, {
      request: { json: async () => ({ firstName: 'Parent', lastName: 'One' }) }
    })).then(r => r.json())

    // Create relationship
    await postRelationship(createMockEvent(db, {
      request: {
        json: async () => ({
          person1Id: parent.id,
          person2Id: child.id,
          type: 'mother'
        })
      }
    }))

    // Verify relationship exists
    let relationships = await getRelationships(createMockEvent(db)).then(r => r.json())
    expect(relationships.length).toBe(1)

    // Delete parent
    await deletePerson(createMockEvent(db, {
      params: { id: parent.id.toString() }
    }))

    // Verify relationship is CASCADE DELETED
    relationships = await getRelationships(createMockEvent(db)).then(r => r.json())
    expect(relationships.length).toBe(0)

    // Verify child still exists
    const childCheck = await getPerson(createMockEvent(db, {
      params: { id: child.id.toString() }
    }))
    expect(childCheck.status).toBe(200)
  })

  it('should maintain referential integrity across complex operations', async () => {
    // Create family structure
    const mother = await postPerson(createMockEvent(db, {
      request: { json: async () => ({ firstName: 'Mother', lastName: 'Smith', gender: 'female' }) }
    })).then(r => r.json())

    const father = await postPerson(createMockEvent(db, {
      request: { json: async () => ({ firstName: 'Father', lastName: 'Smith', gender: 'male' }) }
    })).then(r => r.json())

    const child1 = await postPerson(createMockEvent(db, {
      request: { json: async () => ({ firstName: 'Child', lastName: 'Smith', birthDate: '2010-01-01' }) }
    })).then(r => r.json())

    const child2 = await postPerson(createMockEvent(db, {
      request: { json: async () => ({ firstName: 'Child2', lastName: 'Smith', birthDate: '2012-05-15' }) }
    })).then(r => r.json())

    // Create relationships
    await postRelationship(createMockEvent(db, {
      request: { json: async () => ({ person1Id: mother.id, person2Id: child1.id, type: 'mother' }) }
    }))

    await postRelationship(createMockEvent(db, {
      request: { json: async () => ({ person1Id: father.id, person2Id: child1.id, type: 'father' }) }
    }))

    await postRelationship(createMockEvent(db, {
      request: { json: async () => ({ person1Id: mother.id, person2Id: child2.id, type: 'mother' }) }
    }))

    await postRelationship(createMockEvent(db, {
      request: { json: async () => ({ person1Id: father.id, person2Id: child2.id, type: 'father' }) }
    }))

    await postRelationship(createMockEvent(db, {
      request: { json: async () => ({ person1Id: mother.id, person2Id: father.id, type: 'spouse' }) }
    }))

    // Verify all relationships exist
    let relationships = await getRelationships(createMockEvent(db)).then(r => r.json())
    expect(relationships.length).toBeGreaterThanOrEqual(5)

    // Delete one child
    await deletePerson(createMockEvent(db, {
      params: { id: child1.id.toString() }
    }))

    // Verify only child1's relationships are deleted
    relationships = await getRelationships(createMockEvent(db)).then(r => r.json())
    const child1Rels = relationships.filter(r => r.person2Id === child1.id || r.person1Id === child1.id)
    expect(child1Rels.length).toBe(0)

    // Verify child2's relationships still exist
    const child2Rels = relationships.filter(r => r.person2Id === child2.id || r.person1Id === child2.id)
    expect(child2Rels.length).toBeGreaterThanOrEqual(2)

    // Verify spouse relationship still exists
    const spouseRel = relationships.find(r => r.type === 'spouse')
    expect(spouseRel).toBeDefined()
  })
})

describe('Data Integrity - No Orphaned Records', () => {
  let db
  let sqlite
  let userId

  beforeEach(async () => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)
    userId = await setupTestDatabase(sqlite, db)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should not create orphaned relationships when both people are deleted', async () => {
    // Create two people
    const person1 = await postPerson(createMockEvent(db, {
      request: { json: async () => ({ firstName: 'Person', lastName: 'One' }) }
    })).then(r => r.json())

    const person2 = await postPerson(createMockEvent(db, {
      request: { json: async () => ({ firstName: 'Person', lastName: 'Two' }) }
    })).then(r => r.json())

    // Create relationship
    await postRelationship(createMockEvent(db, {
      request: { json: async () => ({ person1Id: person1.id, person2Id: person2.id, type: 'spouse' }) }
    }))

    // Verify relationship exists
    let relationships = await getRelationships(createMockEvent(db)).then(r => r.json())
    expect(relationships.length).toBeGreaterThanOrEqual(1)

    // Delete both people
    await deletePerson(createMockEvent(db, {
      params: { id: person1.id.toString() }
    }))

    await deletePerson(createMockEvent(db, {
      params: { id: person2.id.toString() }
    }))

    // Verify no orphaned relationships remain
    relationships = await getRelationships(createMockEvent(db)).then(r => r.json())
    expect(relationships.length).toBe(0)
  })

  it('should verify all relationships reference existing people', async () => {
    // Create test data
    const person1 = await postPerson(createMockEvent(db, {
      request: { json: async () => ({ firstName: 'Person', lastName: 'One' }) }
    })).then(r => r.json())

    const person2 = await postPerson(createMockEvent(db, {
      request: { json: async () => ({ firstName: 'Person', lastName: 'Two' }) }
    })).then(r => r.json())

    await postRelationship(createMockEvent(db, {
      request: { json: async () => ({ person1Id: person1.id, person2Id: person2.id, type: 'spouse' }) }
    }))

    // Get all relationships
    const relationships = await getRelationships(createMockEvent(db)).then(r => r.json())

    // Get all people
    const people = await getPeople(createMockEvent(db)).then(r => r.json())
    const personIds = new Set(people.map(p => p.id))

    // Verify all relationship references are valid
    relationships.forEach(rel => {
      expect(personIds.has(rel.person1Id)).toBe(true)
      expect(personIds.has(rel.person2Id)).toBe(true)
    })
  })

  it('should maintain consistent state after partial transaction failure', async () => {
    // This test verifies atomicity - if a complex operation partially fails,
    // the database should remain in a consistent state

    // Create a person
    const person = await postPerson(createMockEvent(db, {
      request: { json: async () => ({ firstName: 'Test', lastName: 'Person' }) }
    })).then(r => r.json())

    // Try to create a relationship with non-existent person (should fail)
    const invalidResponse = await postRelationship(createMockEvent(db, {
      request: { json: async () => ({ person1Id: person.id, person2Id: 99999, type: 'spouse' }) }
    }))

    expect([400, 403]).toContain(invalidResponse.status)  // Should reject invalid relationship (400 or 403)

    // Verify original person still exists and is unaffected
    const personCheck = await getPerson(createMockEvent(db, {
      params: { id: person.id.toString() }
    }))

    expect(personCheck.status).toBe(200)

    // Verify no orphaned relationships were created
    const relationships = await getRelationships(createMockEvent(db)).then(r => r.json())
    const orphaned = relationships.filter(r => r.person1Id === person.id && r.person2Id === 99999)
    expect(orphaned.length).toBe(0)
  })
})
