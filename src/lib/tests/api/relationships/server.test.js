import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { relationships, people } from '$lib/db/schema.js'
import { GET, POST } from '../../../../routes/api/relationships/+server.js'
import { setupTestDatabase, createMockEvent } from '$lib/server/testHelpers.js'

/**
 * Test suite for Relationships API Collection Endpoints
 * Tests GET /api/relationships and POST /api/relationships
 *
 * Following TDD RED phase: These tests define expected behavior before implementation
 */

describe('GET /api/relationships', () => {
  let db
  let sqlite
  let userId

  beforeEach(async () => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // Setup test database with users table and default test user (Issue #72)
    userId = await setupTestDatabase(sqlite, db)

    // Insert test people
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender)
      VALUES (?, ?, ?, ?)
    `).run('John', 'Doe', '1950-01-01', 'male')

    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender)
      VALUES (?, ?, ?, ?)
    `).run('Jane', 'Doe', '1952-05-15', 'female')

    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender)
      VALUES (?, ?, ?, ?)
    `).run('Alice', 'Doe', '1980-03-20', 'female')
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should return empty array when no relationships exist', async () => {
    // Act
    const response = await GET(createMockEvent(db))
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('should return all relationships as JSON array', async () => {
    // Arrange: Insert test relationships
    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
    `).run(1, 3, 'parentOf', 'father')

    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
    `).run(2, 3, 'parentOf', 'mother')

    // Act
    const response = await GET(createMockEvent(db))
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(2)
  })

  it('should denormalize parentOf relationships to mother/father', async () => {
    // Arrange: Insert parent relationships stored as "parentOf"
    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
    `).run(1, 3, 'parentOf', 'father')

    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
    `).run(2, 3, 'parentOf', 'mother')

    // Act
    const response = await GET(createMockEvent(db))
    const data = await response.json()

    // Assert - Should return as "father" and "mother" types
    expect(data[0]).toMatchObject({
      id: 1,
      person1Id: 1,
      person2Id: 3,
      type: 'father', // Denormalized from parentOf
      parentRole: 'father'
    })

    expect(data[1]).toMatchObject({
      id: 2,
      person1Id: 2,
      person2Id: 3,
      type: 'mother', // Denormalized from parentOf
      parentRole: 'mother'
    })
  })

  it('should return spouse relationships as-is without denormalization', async () => {
    // Arrange: Insert spouse relationship
    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
    `).run(1, 2, 'spouse', null)

    // Act
    const response = await GET(createMockEvent(db))
    const data = await response.json()

    // Assert
    expect(data[0]).toMatchObject({
      id: 1,
      person1Id: 1,
      person2Id: 2,
      type: 'spouse',
      parentRole: null
    })
  })

  it('should handle database errors gracefully', async () => {
    // Arrange: Close database to trigger error
    sqlite.close()

    // Act
    const response = await GET(createMockEvent(db))

    // Assert
    expect(response.status).toBe(500)
  })
})

describe('POST /api/relationships', () => {
  let db
  let sqlite
  let userId

  beforeEach(async () => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // Setup test database with users table and default test user (Issue #72)
    userId = await setupTestDatabase(sqlite, db)

    // Insert test people
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender)
      VALUES (?, ?, ?, ?)
    `).run('John', 'Doe', '1950-01-01', 'male')

    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender)
      VALUES (?, ?, ?, ?)
    `).run('Jane', 'Doe', '1952-05-15', 'female')

    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender)
      VALUES (?, ?, ?, ?)
    `).run('Alice', 'Doe', '1980-03-20', 'female')

    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender)
      VALUES (?, ?, ?, ?)
    `).run('Bob', 'Doe', '1982-07-10', 'male')
  })

  afterEach(() => {
    sqlite.close()
  })

  describe('Type Normalization', () => {
    it('should normalize type "mother" to "parentOf" with parent_role "mother"', async () => {
      // Arrange
      const request = new Request('http://localhost/api/relationships', {
        method: 'POST',
        body: JSON.stringify({
          person1Id: 2,
          person2Id: 3,
          type: 'mother'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      // Act
      const response = await POST(createMockEvent(db, { request }))
      const data = await response.json()

      // Assert - Response should denormalize back to "mother"
      expect(response.status).toBe(201)
      expect(data).toMatchObject({
        person1Id: 2,
        person2Id: 3,
        type: 'mother', // Denormalized in response
        parentRole: 'mother'
      })

      // Verify database storage is normalized
      const dbRelationship = sqlite
        .prepare('SELECT * FROM relationships WHERE id = ?')
        .get(data.id)
      expect(dbRelationship.type).toBe('parentOf')
      expect(dbRelationship.parent_role).toBe('mother')
    })

    it('should normalize type "father" to "parentOf" with parent_role "father"', async () => {
      // Arrange
      const request = new Request('http://localhost/api/relationships', {
        method: 'POST',
        body: JSON.stringify({
          person1Id: 1,
          person2Id: 3,
          type: 'father'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      // Act
      const response = await POST(createMockEvent(db, { request }))
      const data = await response.json()

      // Assert - Response should denormalize back to "father"
      expect(response.status).toBe(201)
      expect(data).toMatchObject({
        person1Id: 1,
        person2Id: 3,
        type: 'father', // Denormalized in response
        parentRole: 'father'
      })

      // Verify database storage is normalized
      const dbRelationship = sqlite
        .prepare('SELECT * FROM relationships WHERE id = ?')
        .get(data.id)
      expect(dbRelationship.type).toBe('parentOf')
      expect(dbRelationship.parent_role).toBe('father')
    })

    it('should NOT normalize type "spouse" (stored as-is)', async () => {
      // Arrange
      const request = new Request('http://localhost/api/relationships', {
        method: 'POST',
        body: JSON.stringify({
          person1Id: 1,
          person2Id: 2,
          type: 'spouse'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      // Act
      const response = await POST(createMockEvent(db, { request }))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data).toMatchObject({
        person1Id: 1,
        person2Id: 2,
        type: 'spouse',
        parentRole: null
      })

      // Verify database storage is unchanged
      const dbRelationship = sqlite
        .prepare('SELECT * FROM relationships WHERE id = ?')
        .get(data.id)
      expect(dbRelationship.type).toBe('spouse')
      expect(dbRelationship.parent_role).toBeNull()
    })
  })

  describe('Parent Validation', () => {
    it('should reject adding second mother to same person', async () => {
      // Arrange: Add first mother
      sqlite.prepare(`
        INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
      `).run(2, 3, 'parentOf', 'mother')

      // Act: Try to add second mother
      const request = new Request('http://localhost/api/relationships', {
        method: 'POST',
        body: JSON.stringify({
          person1Id: 2,
          person2Id: 3,
          type: 'mother'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(createMockEvent(db, { request }))

      // Assert
      expect(response.status).toBe(400)
      const errorText = await response.text()
      expect(errorText).toContain('already has a mother')
    })

    it('should reject adding second father to same person', async () => {
      // Arrange: Add first father
      sqlite.prepare(`
        INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
      `).run(1, 3, 'parentOf', 'father')

      // Act: Try to add second father
      const request = new Request('http://localhost/api/relationships', {
        method: 'POST',
        body: JSON.stringify({
          person1Id: 1,
          person2Id: 3,
          type: 'father'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(createMockEvent(db, { request }))

      // Assert
      expect(response.status).toBe(400)
      const errorText = await response.text()
      expect(errorText).toContain('already has a father')
    })

    it('should allow adding both mother AND father to same person', async () => {
      // Arrange: Add mother
      sqlite.prepare(`
        INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
      `).run(2, 3, 'parentOf', 'mother')

      // Act: Add father (should succeed)
      const request = new Request('http://localhost/api/relationships', {
        method: 'POST',
        body: JSON.stringify({
          person1Id: 1,
          person2Id: 3,
          type: 'father'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(createMockEvent(db, { request }))

      // Assert
      expect(response.status).toBe(201)
    })
  })

  describe('Duplicate Prevention', () => {
    it('should reject duplicate identical relationship', async () => {
      // Arrange: Create first relationship
      sqlite.prepare(`
        INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
      `).run(1, 2, 'spouse', null)

      // Act: Try to create duplicate
      const request = new Request('http://localhost/api/relationships', {
        method: 'POST',
        body: JSON.stringify({
          person1Id: 1,
          person2Id: 2,
          type: 'spouse'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(createMockEvent(db, { request }))

      // Assert
      expect(response.status).toBe(400)
      const errorText = await response.text()
      expect(errorText).toContain('already exists')
    })

    it('should ALLOW inverse spouse relationship (bidirectional)', async () => {
      // Arrange: Create relationship person1 -> person2
      sqlite.prepare(`
        INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
      `).run(1, 2, 'spouse', null)

      // Act: Create inverse person2 -> person1 (bidirectional relationship)
      const request = new Request('http://localhost/api/relationships', {
        method: 'POST',
        body: JSON.stringify({
          person1Id: 2,
          person2Id: 1,
          type: 'spouse'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(createMockEvent(db, { request }))

      // Assert: Bidirectional spouse relationships are ALLOWED (required for QuickAddSpouse feature)
      expect(response.status).toBe(201)
      const relationship = await response.json()
      expect(relationship.person1Id).toBe(2)
      expect(relationship.person2Id).toBe(1)
      expect(relationship.type).toBe('spouse')
    })

    it('should reject inverse parent relationship', async () => {
      // Arrange: Create parent relationship person1 -> person2
      sqlite.prepare(`
        INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
      `).run(1, 3, 'parentOf', 'father')

      // Act: Try to create inverse person2 -> person1
      const request = new Request('http://localhost/api/relationships', {
        method: 'POST',
        body: JSON.stringify({
          person1Id: 3,
          person2Id: 1,
          type: 'father'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(createMockEvent(db, { request }))

      // Assert
      expect(response.status).toBe(400)
      const errorText = await response.text()
      expect(errorText).toContain('already exists')
    })
  })

  describe('Invalid Type Rejection', () => {
    it('should reject invalid relationship type', async () => {
      // Arrange
      const request = new Request('http://localhost/api/relationships', {
        method: 'POST',
        body: JSON.stringify({
          person1Id: 1,
          person2Id: 2,
          type: 'invalid_type'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      // Act
      const response = await POST(createMockEvent(db, { request }))

      // Assert
      expect(response.status).toBe(400)
      const errorText = await response.text()
      expect(errorText).toContain('Invalid relationship type')
    })

    it('should reject missing type field', async () => {
      // Arrange
      const request = new Request('http://localhost/api/relationships', {
        method: 'POST',
        body: JSON.stringify({
          person1Id: 1,
          person2Id: 2
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      // Act
      const response = await POST(createMockEvent(db, { request }))

      // Assert
      expect(response.status).toBe(400)
      const errorText = await response.text()
      expect(errorText).toContain('type is required')
    })
  })

  describe('Validation', () => {
    it('should reject missing person1Id', async () => {
      // Arrange
      const request = new Request('http://localhost/api/relationships', {
        method: 'POST',
        body: JSON.stringify({
          person2Id: 2,
          type: 'spouse'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      // Act
      const response = await POST(createMockEvent(db, { request }))

      // Assert
      expect(response.status).toBe(400)
      const errorText = await response.text()
      expect(errorText).toContain('person1Id is required')
    })

    it('should reject missing person2Id', async () => {
      // Arrange
      const request = new Request('http://localhost/api/relationships', {
        method: 'POST',
        body: JSON.stringify({
          person1Id: 1,
          type: 'spouse'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      // Act
      const response = await POST(createMockEvent(db, { request }))

      // Assert
      expect(response.status).toBe(400)
      const errorText = await response.text()
      expect(errorText).toContain('person2Id is required')
    })

    it('should reject invalid JSON', async () => {
      // Arrange
      const request = new Request('http://localhost/api/relationships', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      })

      // Act
      const response = await POST(createMockEvent(db, { request }))

      // Assert
      expect(response.status).toBe(400)
      const errorText = await response.text()
      expect(errorText).toBe('Invalid JSON')
    })
  })

  describe('Successful Creation', () => {
    it('should create mother relationship and return denormalized response', async () => {
      // Arrange
      const request = new Request('http://localhost/api/relationships', {
        method: 'POST',
        body: JSON.stringify({
          person1Id: 2,
          person2Id: 3,
          type: 'mother'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      // Act
      const response = await POST(createMockEvent(db, { request }))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data).toMatchObject({
        id: expect.any(Number),
        person1Id: 2,
        person2Id: 3,
        type: 'mother',
        parentRole: 'mother'
      })
      expect(data.createdAt).toBeDefined()
    })

    it('should create spouse relationship', async () => {
      // Arrange
      const request = new Request('http://localhost/api/relationships', {
        method: 'POST',
        body: JSON.stringify({
          person1Id: 1,
          person2Id: 2,
          type: 'spouse'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      // Act
      const response = await POST(createMockEvent(db, { request }))
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data).toMatchObject({
        id: expect.any(Number),
        person1Id: 1,
        person2Id: 2,
        type: 'spouse',
        parentRole: null
      })
      expect(data.createdAt).toBeDefined()
    })

    it('should allow multiple children for same parent', async () => {
      // Arrange: Create first child relationship
      const request1 = new Request('http://localhost/api/relationships', {
        method: 'POST',
        body: JSON.stringify({
          person1Id: 1,
          person2Id: 3,
          type: 'father'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      // Act: Create first relationship
      const response1 = await POST(createMockEvent(db, { request: request1 }))
      expect(response1.status).toBe(201)

      // Act: Create second child relationship
      const request2 = new Request('http://localhost/api/relationships', {
        method: 'POST',
        body: JSON.stringify({
          person1Id: 1,
          person2Id: 4,
          type: 'father'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response2 = await POST(createMockEvent(db, { request: request2 }))

      // Assert
      expect(response2.status).toBe(201)
    })

    it('should allow multiple spouses', async () => {
      // Arrange: Create first spouse relationship
      const request1 = new Request('http://localhost/api/relationships', {
        method: 'POST',
        body: JSON.stringify({
          person1Id: 1,
          person2Id: 2,
          type: 'spouse'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      // Act: Create first relationship
      const response1 = await POST(createMockEvent(db, { request: request1 }))
      expect(response1.status).toBe(201)

      // Act: Create second spouse relationship
      const request2 = new Request('http://localhost/api/relationships', {
        method: 'POST',
        body: JSON.stringify({
          person1Id: 1,
          person2Id: 3,
          type: 'spouse'
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response2 = await POST(createMockEvent(db, { request: request2 }))

      // Assert
      expect(response2.status).toBe(201)
    })
  })
})
