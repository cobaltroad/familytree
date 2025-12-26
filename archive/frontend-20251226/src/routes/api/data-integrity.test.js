import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { GET as getPeople, POST as postPerson } from './people/+server.js'
import { GET as getPerson, PUT as putPerson, DELETE as deletePerson } from './people/[id]/+server.js'
import { GET as getRelationships, POST as postRelationship } from './relationships/+server.js'
import { DELETE as deleteRelationship } from './relationships/[id]/+server.js'

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
 */
describe('Data Integrity - CRUD Operations', () => {
  let db
  let sqlite

  beforeEach(() => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    sqlite.exec(`
      CREATE TABLE people (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        birth_date TEXT,
        death_date TEXT,
        gender TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person1_id INTEGER NOT NULL,
        person2_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        parent_role TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (person1_id) REFERENCES people(id) ON DELETE CASCADE,
        FOREIGN KEY (person2_id) REFERENCES people(id) ON DELETE CASCADE
      );
    `)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should maintain data integrity through full person CRUD lifecycle', async () => {
    // CREATE
    const createResponse = await postPerson({
      request: {
        json: async () => ({
          firstName: 'John',
          lastName: 'Doe',
          birthDate: '1980-01-01',
          gender: 'male'
        })
      },
      locals: { db }
    })

    expect(createResponse.status).toBe(201)
    const created = await createResponse.json()
    const personId = created.id

    // READ
    const readResponse = await getPerson({
      params: { id: personId.toString() },
      locals: { db }
    })

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
    const updateResponse = await putPerson({
      params: { id: personId.toString() },
      request: {
        json: async () => ({
          firstName: 'Jane',
          lastName: 'Smith',
          birthDate: '1985-05-15',
          gender: 'female'
        })
      },
      locals: { db }
    })

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
    const verifyResponse = await getPerson({
      params: { id: personId.toString() },
      locals: { db }
    })
    const verified = await verifyResponse.json()
    expect(verified.firstName).toBe('Jane')

    // DELETE
    const deleteResponse = await deletePerson({
      params: { id: personId.toString() },
      locals: { db }
    })

    expect(deleteResponse.status).toBe(204)

    // Verify deletion
    const finalResponse = await getPerson({
      params: { id: personId.toString() },
      locals: { db }
    })

    expect(finalResponse.status).toBe(404)
  })

  it('should maintain data integrity through full relationship CRUD lifecycle', async () => {
    // Create two people first
    const person1Response = await postPerson({
      request: {
        json: async () => ({ firstName: 'Child', lastName: 'Person' })
      },
      locals: { db }
    })
    const person1 = await person1Response.json()

    const person2Response = await postPerson({
      request: {
        json: async () => ({ firstName: 'Mother', lastName: 'Person' })
      },
      locals: { db }
    })
    const person2 = await person2Response.json()

    // CREATE relationship
    const createResponse = await postRelationship({
      request: {
        json: async () => ({
          person1Id: person2.id,
          person2Id: person1.id,
          type: 'mother'
        })
      },
      locals: { db }
    })

    expect(createResponse.status).toBe(201)
    const created = await createResponse.json()
    const relationshipId = created.id

    // READ relationships
    const readResponse = await getRelationships({ locals: { db } })
    expect(readResponse.status).toBe(200)
    const relationships = await readResponse.json()

    const foundRel = relationships.find(r => r.id === relationshipId)
    expect(foundRel).toBeDefined()
    expect(foundRel).toMatchObject({
      person1Id: person2.id,
      person2Id: person1.id,
      type: 'mother',  // API returns denormalized type
      parentRole: 'mother'
    })

    // DELETE relationship
    const deleteResponse = await deleteRelationship({
      params: { id: relationshipId.toString() },
      locals: { db }
    })

    expect(deleteResponse.status).toBe(204)

    // Verify deletion
    const verifyResponse = await getRelationships({ locals: { db } })
    const finalRelationships = await verifyResponse.json()
    const deletedRel = finalRelationships.find(r => r.id === relationshipId)
    expect(deletedRel).toBeUndefined()

    // Verify people still exist (only relationship deleted)
    const person1Check = await getPerson({
      params: { id: person1.id.toString() },
      locals: { db }
    })
    const person2Check = await getPerson({
      params: { id: person2.id.toString() },
      locals: { db }
    })

    expect(person1Check.status).toBe(200)
    expect(person2Check.status).toBe(200)
  })

  it('should not corrupt data when multiple updates occur', async () => {
    // Create person
    const createResponse = await postPerson({
      request: {
        json: async () => ({
          firstName: 'Original',
          lastName: 'Name',
          gender: 'male'
        })
      },
      locals: { db }
    })

    const person = await createResponse.json()
    const personId = person.id

    // Perform multiple updates
    await putPerson({
      params: { id: personId.toString() },
      request: {
        json: async () => ({
          firstName: 'Update1',
          lastName: 'Name',
          gender: 'male'
        })
      },
      locals: { db }
    })

    await putPerson({
      params: { id: personId.toString() },
      request: {
        json: async () => ({
          firstName: 'Update2',
          lastName: 'Name',
          gender: 'female'
        })
      },
      locals: { db }
    })

    await putPerson({
      params: { id: personId.toString() },
      request: {
        json: async () => ({
          firstName: 'Final',
          lastName: 'Update',
          gender: 'other'
        })
      },
      locals: { db }
    })

    // Verify final state
    const finalResponse = await getPerson({
      params: { id: personId.toString() },
      locals: { db }
    })

    const final = await finalResponse.json()
    expect(final).toMatchObject({
      id: personId,
      firstName: 'Final',
      lastName: 'Update',
      gender: 'other'
    })

    // Verify only one record exists in database
    const count = sqlite.prepare('SELECT COUNT(*) as count FROM people WHERE id = ?').get(personId)
    expect(count.count).toBe(1)
  })

  it('should maintain data integrity during concurrent-like operations', async () => {
    // Create multiple people in rapid succession
    const promises = []
    for (let i = 0; i < 10; i++) {
      promises.push(
        postPerson({
          request: {
            json: async () => ({
              firstName: `Person${i}`,
              lastName: `LastName${i}`
            })
          },
          locals: { db }
        })
      )
    }

    const responses = await Promise.all(promises)

    // All should succeed
    responses.forEach(response => {
      expect(response.status).toBe(201)
    })

    // Verify all people exist
    const peopleResponse = await getPeople({ locals: { db } })
    const people = await peopleResponse.json()

    expect(people).toHaveLength(10)

    // Verify unique IDs
    const ids = people.map(p => p.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(10)  // All IDs should be unique
  })
})

describe('Data Integrity - Foreign Key Constraints', () => {
  let db
  let sqlite

  beforeEach(() => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    sqlite.exec(`
      CREATE TABLE people (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        birth_date TEXT,
        death_date TEXT,
        gender TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person1_id INTEGER NOT NULL,
        person2_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        parent_role TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (person1_id) REFERENCES people(id) ON DELETE CASCADE,
        FOREIGN KEY (person2_id) REFERENCES people(id) ON DELETE CASCADE
      );

      PRAGMA foreign_keys = ON;
    `)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should prevent creating relationship with non-existent person1_id', async () => {
    // Create one person
    const personResponse = await postPerson({
      request: {
        json: async () => ({ firstName: 'Existing', lastName: 'Person' })
      },
      locals: { db }
    })
    const person = await personResponse.json()

    // Try to create relationship with non-existent person1_id
    const response = await postRelationship({
      request: {
        json: async () => ({
          person1Id: 9999,  // Doesn't exist
          person2Id: person.id,
          type: 'mother'
        })
      },
      locals: { db }
    })

    expect(response.status).toBe(400)
  })

  it('should prevent creating relationship with non-existent related_person1_id', async () => {
    // Create one person
    const personResponse = await postPerson({
      request: {
        json: async () => ({ firstName: 'Existing', lastName: 'Person' })
      },
      locals: { db }
    })
    const person = await personResponse.json()

    // Try to create relationship with non-existent related_person1_id
    const response = await postRelationship({
      request: {
        json: async () => ({
          person1Id: person.id,
          person2Id: 9999,  // Doesn't exist
          type: 'mother'
        })
      },
      locals: { db }
    })

    expect(response.status).toBe(400)
  })

  it('should cascade delete relationships when person is deleted', async () => {
    // Create parent and child
    const childResponse = await postPerson({
      request: {
        json: async () => ({ firstName: 'Child', lastName: 'Person' })
      },
      locals: { db }
    })
    const child = await childResponse.json()

    const motherResponse = await postPerson({
      request: {
        json: async () => ({ firstName: 'Mother', lastName: 'Person' })
      },
      locals: { db }
    })
    const mother = await motherResponse.json()

    // Create relationship
    const relResponse = await postRelationship({
      request: {
        json: async () => ({
          person1Id: child.id,
          person2Id: mother.id,
          type: 'mother'
        })
      },
      locals: { db }
    })

    expect(relResponse.status).toBe(201)
    const relationship = await relResponse.json()

    // Verify relationship exists
    const relCheckBefore = sqlite.prepare(
      'SELECT * FROM relationships WHERE id = ?'
    ).get(relationship.id)
    expect(relCheckBefore).toBeDefined()

    // Delete mother
    const deleteResponse = await deletePerson({
      params: { id: mother.id.toString() },
      locals: { db }
    })

    expect(deleteResponse.status).toBe(204)

    // Verify relationship was CASCADE deleted
    const relCheckAfter = sqlite.prepare(
      'SELECT * FROM relationships WHERE id = ?'
    ).get(relationship.id)
    expect(relCheckAfter).toBeUndefined()

    // Verify child still exists
    const childCheck = await getPerson({
      params: { id: child.id.toString() },
      locals: { db }
    })
    expect(childCheck.status).toBe(200)
  })

  it('should cascade delete all relationships when person with multiple relationships is deleted', async () => {
    // Create family: child with mother, father, and spouse
    const childResponse = await postPerson({
      request: {
        json: async () => ({ firstName: 'Child', lastName: 'Person' })
      },
      locals: { db }
    })
    const child = await childResponse.json()

    const motherResponse = await postPerson({
      request: {
        json: async () => ({ firstName: 'Mother', lastName: 'Person' })
      },
      locals: { db }
    })
    const mother = await motherResponse.json()

    const fatherResponse = await postPerson({
      request: {
        json: async () => ({ firstName: 'Father', lastName: 'Person' })
      },
      locals: { db }
    })
    const father = await fatherResponse.json()

    const spouseResponse = await postPerson({
      request: {
        json: async () => ({ firstName: 'Spouse', lastName: 'Person' })
      },
      locals: { db }
    })
    const spouse = await spouseResponse.json()

    // Create relationships
    await postRelationship({
      request: {
        json: async () => ({
          person1Id: child.id,
          person2Id: mother.id,
          type: 'mother'
        })
      },
      locals: { db }
    })

    await postRelationship({
      request: {
        json: async () => ({
          person1Id: child.id,
          person2Id: father.id,
          type: 'father'
        })
      },
      locals: { db }
    })

    await postRelationship({
      request: {
        json: async () => ({
          person1Id: child.id,
          person2Id: spouse.id,
          type: 'spouse'
        })
      },
      locals: { db }
    })

    // Verify 3 relationships exist
    const relsBefore = sqlite.prepare(
      'SELECT COUNT(*) as count FROM relationships WHERE person1_id = ?'
    ).get(child.id)
    expect(relsBefore.count).toBe(3)

    // Delete child
    await deletePerson({
      params: { id: child.id.toString() },
      locals: { db }
    })

    // Verify all relationships CASCADE deleted
    const relsAfter = sqlite.prepare(
      'SELECT COUNT(*) as count FROM relationships WHERE person1_id = ?'
    ).get(child.id)
    expect(relsAfter.count).toBe(0)

    // Verify other people still exist
    const motherCheck = await getPerson({
      params: { id: mother.id.toString() },
      locals: { db }
    })
    const fatherCheck = await getPerson({
      params: { id: father.id.toString() },
      locals: { db }
    })
    const spouseCheck = await getPerson({
      params: { id: spouse.id.toString() },
      locals: { db }
    })

    expect(motherCheck.status).toBe(200)
    expect(fatherCheck.status).toBe(200)
    expect(spouseCheck.status).toBe(200)
  })

  it('should maintain referential integrity across complex operations', async () => {
    // Create 3-generation family
    const grandparentResponse = await postPerson({
      request: {
        json: async () => ({ firstName: 'Grandparent', lastName: 'Person' })
      },
      locals: { db }
    })
    const grandparent = await grandparentResponse.json()

    const parentResponse = await postPerson({
      request: {
        json: async () => ({ firstName: 'Parent', lastName: 'Person' })
      },
      locals: { db }
    })
    const parent = await parentResponse.json()

    const childResponse = await postPerson({
      request: {
        json: async () => ({ firstName: 'Child', lastName: 'Person' })
      },
      locals: { db }
    })
    const child = await childResponse.json()

    // Create relationships
    await postRelationship({
      request: {
        json: async () => ({
          person1Id: parent.id,
          person2Id: grandparent.id,
          type: 'mother'
        })
      },
      locals: { db }
    })

    await postRelationship({
      request: {
        json: async () => ({
          person1Id: child.id,
          person2Id: parent.id,
          type: 'mother'
        })
      },
      locals: { db }
    })

    // Delete middle generation (parent)
    await deletePerson({
      params: { id: parent.id.toString() },
      locals: { db }
    })

    // Verify grandparent and child still exist
    const grandparentCheck = await getPerson({
      params: { id: grandparent.id.toString() },
      locals: { db }
    })
    const childCheck = await getPerson({
      params: { id: child.id.toString() },
      locals: { db }
    })

    expect(grandparentCheck.status).toBe(200)
    expect(childCheck.status).toBe(200)

    // Verify both relationships involving parent are deleted
    const allRels = await getRelationships({ locals: { db } })
    const rels = await allRels.json()
    const parentRels = rels.filter(
      r => r.person1Id === parent.id || r.person2Id === parent.id
    )

    expect(parentRels).toHaveLength(0)
  })
})

describe('Data Integrity - No Orphaned Records', () => {
  let db
  let sqlite

  beforeEach(() => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    sqlite.exec(`
      CREATE TABLE people (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        birth_date TEXT,
        death_date TEXT,
        gender TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person1_id INTEGER NOT NULL,
        person2_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        parent_role TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (person1_id) REFERENCES people(id) ON DELETE CASCADE,
        FOREIGN KEY (person2_id) REFERENCES people(id) ON DELETE CASCADE
      );

      PRAGMA foreign_keys = ON;
    `)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should not create orphaned relationships when both people are deleted', async () => {
    // Create two people and a relationship
    const person1Response = await postPerson({
      request: {
        json: async () => ({ firstName: 'Person1', lastName: 'Test' })
      },
      locals: { db }
    })
    const person1 = await person1Response.json()

    const person2Response = await postPerson({
      request: {
        json: async () => ({ firstName: 'Person2', lastName: 'Test' })
      },
      locals: { db }
    })
    const person2 = await person2Response.json()

    await postRelationship({
      request: {
        json: async () => ({
          person1Id: person1.id,
          person2Id: person2.id,
          type: 'spouse'
        })
      },
      locals: { db }
    })

    // Delete both people
    await deletePerson({
      params: { id: person1.id.toString() },
      locals: { db }
    })

    await deletePerson({
      params: { id: person2.id.toString() },
      locals: { db }
    })

    // Verify no relationships remain
    const allRels = await getRelationships({ locals: { db } })
    const rels = await allRels.json()

    expect(rels).toHaveLength(0)
  })

  it('should verify all relationships reference existing people', async () => {
    // Create people and relationships
    const p1 = await (await postPerson({
      request: { json: async () => ({ firstName: 'P1', lastName: 'Test' }) },
      locals: { db }
    })).json()

    const p2 = await (await postPerson({
      request: { json: async () => ({ firstName: 'P2', lastName: 'Test' }) },
      locals: { db }
    })).json()

    const p3 = await (await postPerson({
      request: { json: async () => ({ firstName: 'P3', lastName: 'Test' }) },
      locals: { db }
    })).json()

    await postRelationship({
      request: {
        json: async () => ({
          person1Id: p2.id,
          person2Id: p1.id,
          type: 'mother'
        })
      },
      locals: { db }
    })

    await postRelationship({
      request: {
        json: async () => ({
          person1Id: p3.id,
          person2Id: p1.id,
          type: 'father'
        })
      },
      locals: { db }
    })

    // Get all relationships
    const relsResponse = await getRelationships({ locals: { db } })
    const rels = await relsResponse.json()

    // Verify each relationship references existing people
    for (const rel of rels) {
      const person = await getPerson({
        params: { id: rel.person1Id.toString() },
        locals: { db }
      })
      const relatedPerson = await getPerson({
        params: { id: rel.person2Id.toString() },
        locals: { db }
      })

      expect(person.status).toBe(200)
      expect(relatedPerson.status).toBe(200)
    }
  })

  it('should maintain consistent state after partial transaction failure', async () => {
    // Create person
    const personResponse = await postPerson({
      request: {
        json: async () => ({ firstName: 'Test', lastName: 'Person' })
      },
      locals: { db }
    })

    const person = await personResponse.json()

    // Attempt to create invalid relationship (should fail)
    const failResponse = await postRelationship({
      request: {
        json: async () => ({
          person1Id: person.id,
          person2Id: 9999,  // Doesn't exist
          type: 'mother'
        })
      },
      locals: { db }
    })

    expect(failResponse.status).toBe(400)

    // Verify person still exists and is intact
    const personCheck = await getPerson({
      params: { id: person.id.toString() },
      locals: { db }
    })

    expect(personCheck.status).toBe(200)
    const checkedPerson = await personCheck.json()
    expect(checkedPerson).toMatchObject({
      id: person.id,
      firstName: 'Test',
      lastName: 'Person'
    })

    // Verify no orphaned relationships
    const relsResponse = await getRelationships({ locals: { db } })
    const rels = await relsResponse.json()
    expect(rels).toHaveLength(0)
  })
})
