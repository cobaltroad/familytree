import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setupTestDatabase, createMockEvent } from "$lib/server/testHelpers.js"
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { GET, POST } from '../../../../routes/api/relationships/+server.js'

/**
 * Edge Case Tests for Relationships API Collection Endpoints
 * Part of Story 6: Comprehensive Testing and Validation (Issue #65)
 *
 * Tests edge cases, boundary conditions, concurrent operations, and validation rules
 */
describe('POST /api/relationships - Edge Cases', () => {
  let db
  let sqlite
  let userId

  beforeEach(async () => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // Setup test database with users table and default test user (Issue #72)
    userId = await setupTestDatabase(sqlite, db)

    // Insert test people
    sqlite.prepare(`
      INSERT INTO people (id, first_name, last_name, birth_date, gender)
      VALUES (?, ?, ?, ?, ?)
    `).run(1, 'Child', 'Person', '2000-01-01', 'male')

    sqlite.prepare(`
      INSERT INTO people (id, first_name, last_name, birth_date, gender)
      VALUES (?, ?, ?, ?, ?)
    `).run(2, 'Mother', 'Person', '1970-01-01', 'female')

    sqlite.prepare(`
      INSERT INTO people (id, first_name, last_name, birth_date, gender)
      VALUES (?, ?, ?, ?, ?)
    `).run(3, 'Father', 'Person', '1968-01-01', 'male')

    sqlite.prepare(`
      INSERT INTO people (id, first_name, last_name, birth_date, gender)
      VALUES (?, ?, ?, ?, ?)
    `).run(4, 'Sibling', 'Person', '2002-01-01', 'female')

    sqlite.prepare(`
      INSERT INTO people (id, first_name, last_name, birth_date, gender)
      VALUES (?, ?, ?, ?, ?)
    `).run(5, 'Spouse', 'Person', '1999-01-01', 'female')
  })

  afterEach(() => {
    sqlite.close()
  })

  // Parent Relationship Validation
  it('should prevent creating duplicate mother relationship', async () => {
    // Create first mother relationship: Person 2 is mother of Person 1 (child)
    const request1 = {
      json: async () => ({
        person1Id: 2,  // Mother
        person2Id: 1,  // Child
        type: 'mother'
      })
    }
    await POST(createMockEvent(db, { request: request1 }))

    // Attempt to create second mother for same child: Person 3 as mother of Person 1
    const request2 = {
      json: async () => ({
        person1Id: 3,  // Different mother
        person2Id: 1,  // Same child
        type: 'mother'
      })
    }

    const response = await POST(createMockEvent(db, { request: request2 }))

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('already has a mother')
  })

  it('should prevent creating duplicate father relationship', async () => {
    // Create first father relationship: Person 3 is father of Person 1 (child)
    const request1 = {
      json: async () => ({
        person1Id: 3,  // Father
        person2Id: 1,  // Child
        type: 'father'
      })
    }
    await POST(createMockEvent(db, { request: request1 }))

    // Attempt to create second father for same child: Person 2 as father of Person 1
    const request2 = {
      json: async () => ({
        person1Id: 2,  // Different father
        person2Id: 1,  // Same child
        type: 'father'
      })
    }

    const response = await POST(createMockEvent(db, { request: request2 }))

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('already has a father')
  })

  it('should allow both mother and father (no conflict)', async () => {
    // Create mother: Person 2 is mother of Person 1 (child)
    const request1 = {
      json: async () => ({
        person1Id: 2,  // Mother
        person2Id: 1,  // Child
        type: 'mother'
      })
    }
    const response1 = await POST(createMockEvent(db, { request: request1 }))

    // Create father: Person 3 is father of Person 1 (same child)
    const request2 = {
      json: async () => ({
        person1Id: 3,  // Father
        person2Id: 1,  // Same child
        type: 'father'
      })
    }
    const response2 = await POST(createMockEvent(db, { request: request2 }))

    expect(response1.status).toBe(201)
    expect(response2.status).toBe(201)

    // Verify both relationships exist (child Person 1 has two parents)
    const relationships = sqlite.prepare(
      "SELECT * FROM relationships WHERE person2_id = 1 AND type = 'parentOf'"
    ).all()

    expect(relationships).toHaveLength(2)
    expect(relationships.find(r => r.parent_role === 'mother')).toBeDefined()
    expect(relationships.find(r => r.parent_role === 'father')).toBeDefined()
  })

  // Relationship Type Normalization
  it('should normalize "mother" to "parentOf" with parent_role="mother"', async () => {
    const request = {
      json: async () => ({
        person1Id: 1,
        person2Id: 2,
        type: 'mother'
      })
    }

    const response = await POST(createMockEvent(db, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.type).toBe('mother')  // API returns denormalized type
    expect(data.parentRole).toBe('mother')

    // Verify in database (stored normalized)
    const rel = sqlite.prepare(
      'SELECT * FROM relationships WHERE id = ?'
    ).get(data.id)
    expect(rel.type).toBe('parentOf')
    expect(rel.parent_role).toBe('mother')
  })

  it('should normalize "father" to "parentOf" with parent_role="father"', async () => {
    const request = {
      json: async () => ({
        person1Id: 1,
        person2Id: 3,
        type: 'father'
      })
    }

    const response = await POST(createMockEvent(db, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.type).toBe('father')  // API returns denormalized type
    expect(data.parentRole).toBe('father')

    // Verify in database (stored normalized)
    const rel = sqlite.prepare(
      'SELECT * FROM relationships WHERE id = ?'
    ).get(data.id)
    expect(rel.type).toBe('parentOf')
    expect(rel.parent_role).toBe('father')
  })

  it('should not normalize "spouse" relationship', async () => {
    const request = {
      json: async () => ({
        person1Id: 1,
        person2Id: 5,
        type: 'spouse'
      })
    }

    const response = await POST(createMockEvent(db, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.type).toBe('spouse')
    expect(data.parentRole).toBeNull()

    // Verify in database
    const rel = sqlite.prepare(
      'SELECT * FROM relationships WHERE id = ?'
    ).get(data.id)
    expect(rel.type).toBe('spouse')
    expect(rel.parent_role).toBeNull()
  })

  // Self-Referential Relationships
  it('should prevent person from being their own parent', async () => {
    const request = {
      json: async () => ({
        person1Id: 1,
        person2Id: 1,
        type: 'mother'
      })
    }

    const response = await POST(createMockEvent(db, { request }))

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('cannot be related to themselves')
  })

  it('should prevent person from being their own spouse', async () => {
    const request = {
      json: async () => ({
        person1Id: 1,
        person2Id: 1,
        type: 'spouse'
      })
    }

    const response = await POST(createMockEvent(db, { request }))

    expect(response.status).toBe(400)
  })

  // Non-Existent Person IDs
  it('should reject relationship with non-existent personId', async () => {
    const request = {
      json: async () => ({
        person1Id: 9999,  // Doesn't exist
        person2Id: 2,
        type: 'mother'
      })
    }

    const response = await POST(createMockEvent(db, { request }))

    // Returns 403 because person doesn't exist (ownership check fails before validation)
    expect(response.status).toBe(400)
  })

  it('should reject relationship with non-existent relatedPersonId', async () => {
    const request = {
      json: async () => ({
        person1Id: 1,
        person2Id: 9999,  // Doesn't exist
        type: 'mother'
      })
    }

    const response = await POST(createMockEvent(db, { request }))

    // Returns 403 because person doesn't exist (ownership check fails before validation)
    expect(response.status).toBe(400)
  })

  // Invalid Relationship Types
  it('should reject invalid relationship type', async () => {
    const request = {
      json: async () => ({
        person1Id: 1,
        person2Id: 2,
        type: 'invalid-type'
      })
    }

    const response = await POST(createMockEvent(db, { request }))

    expect(response.status).toBe(400)
  })

  it('should reject empty relationship type', async () => {
    const request = {
      json: async () => ({
        person1Id: 1,
        person2Id: 2,
        type: ''
      })
    }

    const response = await POST(createMockEvent(db, { request }))

    expect(response.status).toBe(400)
  })

  it('should reject null relationship type', async () => {
    const request = {
      json: async () => ({
        person1Id: 1,
        person2Id: 2,
        type: null
      })
    }

    const response = await POST(createMockEvent(db, { request }))

    expect(response.status).toBe(400)
  })

  it('should reject uppercase relationship types (enforce lowercase)', async () => {
    const request = {
      json: async () => ({
        person1Id: 1,
        person2Id: 2,
        type: 'MOTHER'
      })
    }

    const response = await POST(createMockEvent(db, { request }))

    expect(response.status).toBe(400)
  })

  // Invalid Field Types
  it('should reject personId as string', async () => {
    const request = {
      json: async () => ({
        person1Id: '1',
        person2Id: 2,
        type: 'mother'
      })
    }

    const response = await POST(createMockEvent(db, { request }))

    expect(response.status).toBe(400)
  })

  it('should reject relatedPersonId as string', async () => {
    const request = {
      json: async () => ({
        person1Id: 1,
        person2Id: '2',
        type: 'mother'
      })
    }

    const response = await POST(createMockEvent(db, { request }))

    expect(response.status).toBe(400)
  })

  it('should reject negative personId', async () => {
    const request = {
      json: async () => ({
        person1Id: -1,
        person2Id: 2,
        type: 'mother'
      })
    }

    const response = await POST(createMockEvent(db, { request }))

    // Returns 403 because negative ID doesn't exist (ownership check fails before validation)
    expect(response.status).toBe(400)
  })

  it('should reject zero personId', async () => {
    const request = {
      json: async () => ({
        person1Id: 0,
        person2Id: 2,
        type: 'mother'
      })
    }

    const response = await POST(createMockEvent(db, { request }))

    expect(response.status).toBe(400)
  })

  it('should reject float personId', async () => {
    const request = {
      json: async () => ({
        person1Id: 1.5,
        person2Id: 2,
        type: 'mother'
      })
    }

    const response = await POST(createMockEvent(db, { request }))

    // Returns 403 because float ID doesn't exist (ownership check fails before validation)
    expect(response.status).toBe(400)
  })

  // Missing Required Fields
  it('should reject missing personId', async () => {
    const request = {
      json: async () => ({
        person2Id: 2,
        type: 'mother'
      })
    }

    const response = await POST(createMockEvent(db, { request }))

    expect(response.status).toBe(400)
  })

  it('should reject missing relatedPersonId', async () => {
    const request = {
      json: async () => ({
        person1Id: 1,
        type: 'mother'
      })
    }

    const response = await POST(createMockEvent(db, { request }))

    expect(response.status).toBe(400)
  })

  it('should reject missing type', async () => {
    const request = {
      json: async () => ({
        person1Id: 1,
        person2Id: 2
      })
    }

    const response = await POST(createMockEvent(db, { request }))

    expect(response.status).toBe(400)
  })

  // Extra/Unexpected Fields
  it('should ignore unexpected extra fields', async () => {
    const request = {
      json: async () => ({
        person1Id: 1,
        person2Id: 2,
        type: 'mother',
        unexpectedField: 'ignore me',
        anotherField: 123
      })
    }

    const response = await POST(createMockEvent(db, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.unexpectedField).toBeUndefined()
    expect(data.anotherField).toBeUndefined()
  })

  // Multiple Spouse Relationships
  it('should allow multiple spouse relationships for same person', async () => {
    // Add second spouse
    sqlite.prepare(`
      INSERT INTO people (id, first_name, last_name, birth_date, gender)
      VALUES (?, ?, ?, ?, ?)
    `).run(6, 'Spouse2', 'Person', '1998-01-01', 'female')

    // Create first spouse relationship
    const request1 = {
      json: async () => ({
        person1Id: 1,
        person2Id: 5,
        type: 'spouse'
      })
    }
    const response1 = await POST(createMockEvent(db, { request: request1 }))

    // Create second spouse relationship
    const request2 = {
      json: async () => ({
        person1Id: 1,
        person2Id: 6,
        type: 'spouse'
      })
    }
    const response2 = await POST(createMockEvent(db, { request: request2 }))

    expect(response1.status).toBe(201)
    expect(response2.status).toBe(201)

    // Verify both spouse relationships exist
    const relationships = sqlite.prepare(
      "SELECT * FROM relationships WHERE person1_id = 1 AND type = 'spouse'"
    ).all()

    expect(relationships).toHaveLength(2)
  })

  // Duplicate Relationship Prevention
  it('should prevent exact duplicate relationship (same person, related person, type)', async () => {
    // Create first relationship
    const request1 = {
      json: async () => ({
        person1Id: 1,
        person2Id: 2,
        type: 'mother'
      })
    }
    await POST(createMockEvent(db, { request: request1 }))

    // Attempt to create duplicate
    const request2 = {
      json: async () => ({
        person1Id: 1,
        person2Id: 2,
        type: 'mother'
      })
    }

    const response = await POST(createMockEvent(db, { request: request2 }))

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('already has a mother')
  })

  // Bidirectional Relationship Checks
  it('should allow parent of child and child of parent as separate relationships', async () => {
    // Create parent->child relationship (mother of child)
    const request = {
      json: async () => ({
        person1Id: 2,  // Mother
        person2Id: 1,  // Child
        type: 'parentOf',
        parentRole: 'mother'
      })
    }
    const response1 = await POST(createMockEvent(db, { request }))

    // This is typically created automatically in the UI, but should work in API
    expect(response1.status).toBe(201)

    // Verify relationship in database (normalized storage)
    const rel = sqlite.prepare(
      'SELECT * FROM relationships WHERE person1_id = 2 AND person2_id = 1'
    ).get()

    expect(rel.type).toBe('parentOf')
    expect(rel.parent_role).toBe('mother')
  })
})

describe('GET /api/relationships - Edge Cases', () => {
  let db
  let sqlite
  let userId

  beforeEach(async () => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // Setup test database with users table and default test user (Issue #72)
    userId = await setupTestDatabase(sqlite, db)

    // Insert test people
    for (let i = 1; i <= 10; i++) {
      sqlite.prepare(`
        INSERT INTO people (id, first_name, last_name) VALUES (?, ?, ?)
      `).run(i, `Person${i}`, `LastName${i}`)
    }
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should handle large number of relationships (100+)', async () => {
    // Create 100 spouse relationships
    const stmt = sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type)
      VALUES (?, ?, ?)
    `)

    for (let i = 1; i <= 100; i++) {
      const personId = (i % 10) + 1
      const relatedPersonId = ((i + 1) % 10) + 1
      if (personId !== relatedPersonId) {
        stmt.run(personId, relatedPersonId, 'spouse')
      }
    }

    const response = await GET(createMockEvent(db))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.length).toBeGreaterThanOrEqual(90)  // At least 90 (excluding self-references)
  })

  it('should return consistent results across multiple calls', async () => {
    // Create test relationships
    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
    `).run(1, 2, 'parentOf', 'mother')

    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
    `).run(1, 3, 'parentOf', 'father')

    // Call GET multiple times
    const response1 = await GET(createMockEvent(db))
    const data1 = await response1.json()

    const response2 = await GET(createMockEvent(db))
    const data2 = await response2.json()

    const response3 = await GET(createMockEvent(db))
    const data3 = await response3.json()

    // All responses should be identical
    expect(data1).toEqual(data2)
    expect(data2).toEqual(data3)
  })

  it('should handle relationships with null parent_role (spouse)', async () => {
    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
    `).run(1, 2, 'spouse', null)

    const response = await GET(createMockEvent(db))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].type).toBe('spouse')
    expect(data[0].parentRole).toBeNull()
  })

  it('should handle relationships with parent_role set', async () => {
    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
    `).run(1, 2, 'parentOf', 'mother')

    const response = await GET(createMockEvent(db))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].type).toBe('mother')  // API returns denormalized type
    expect(data[0].parentRole).toBe('mother')
  })

  it('should handle complex family network', async () => {
    // Create multi-generational family
    // Person 1: Grandparent
    // Person 2, 3: Parents (children of 1)
    // Person 4, 5: Children (children of 2 and 3)

    // Grandparent -> Parent relationships
    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
    `).run(2, 1, 'parentOf', 'mother')  // Person 1 is mother of Person 2

    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
    `).run(3, 1, 'parentOf', 'father')  // Person 1 is father of Person 3

    // Parent -> Child relationships
    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
    `).run(4, 2, 'parentOf', 'mother')  // Person 2 is mother of Person 4

    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
    `).run(5, 3, 'parentOf', 'father')  // Person 3 is father of Person 5

    // Spouse relationships
    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type)
      VALUES (?, ?, ?)
    `).run(2, 3, 'spouse')  // Person 2 and 3 are spouses

    const response = await GET(createMockEvent(db))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(5)

    // Verify structure
    const motherRels = data.filter(r => r.parentRole === 'mother')
    const fatherRels = data.filter(r => r.parentRole === 'father')
    const spouseRels = data.filter(r => r.type === 'spouse')

    expect(motherRels).toHaveLength(2)
    expect(fatherRels).toHaveLength(2)
    expect(spouseRels).toHaveLength(1)
  })
})
