import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { GET, PUT, DELETE } from './+server.js'
import { setupTestDatabase, createMockAuthenticatedEvent } from '$lib/server/testHelpers.js'

/**
 * Test suite for People API Individual Resource Endpoints
 * Tests GET /api/people/[id], PUT /api/people/[id], DELETE /api/people/[id]
 *
 * Updated for Issue #72: All tests now include authentication
 */
describe('GET /api/people/[id]', () => {
  let db
  let sqlite
  let userId

  beforeEach(async () => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // Setup test database with users table and default test user (Issue #72)
    userId = await setupTestDatabase(sqlite, db)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should return person by ID with all fields', async () => {
    // Arrange: Insert test person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, death_date, gender, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('John', 'Doe', '1980-01-01', null, 'male', userId)

    const params = { id: '1' }

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params })
    const response = await GET(event)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      birthDate: '1980-01-01',
      deathDate: null,
      gender: 'male'
    })
    expect(data.createdAt).toBeDefined()
  })

  it('should return person with death date', async () => {
    // Arrange
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, death_date, gender, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('Albert', 'Einstein', '1879-03-14', '1955-04-18', 'male', userId)

    const params = { id: '1' }

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params })
    const response = await GET(event)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.deathDate).toBe('1955-04-18')
  })

  it('should return 404 when person not found', async () => {
    // Arrange
    const params = { id: '999' }

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params })
    const response = await GET(event)

    // Assert
    expect(response.status).toBe(404)
  })

  it('should return 400 for invalid ID format', async () => {
    // Arrange
    const params = { id: 'abc' }

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params })
    const response = await GET(event)

    // Assert
    expect(response.status).toBe(400)
  })

  it('should return 400 for negative ID', async () => {
    // Arrange
    const params = { id: '-1' }

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params })
    const response = await GET(event)

    // Assert
    expect(response.status).toBe(400)
  })

  it('should return Content-Type application/json header', async () => {
    // Arrange
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, user_id)
      VALUES (?, ?, ?)
    `).run('Test', 'User', userId)

    const params = { id: '1' }

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params })
    const response = await GET(event)

    // Assert
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('should return 500 on database error', async () => {
    // Arrange
    const params = { id: '1' }

    // Close database to force error
    sqlite.close()

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params })
    const response = await GET(event)

    // Assert
    expect(response.status).toBe(500)
  })
})

describe('PUT /api/people/[id]', () => {
  let db
  let sqlite
  let userId

  beforeEach(async () => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // Setup test database with users table and default test user (Issue #72)
    userId = await setupTestDatabase(sqlite, db)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should update person and return updated data', async () => {
    // Arrange: Create initial person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, death_date, gender, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('John', 'Doe', '1980-01-01', null, 'male', userId)

    const params = { id: '1' }
    const requestData = {
      firstName: 'Jane',
      lastName: 'Smith',
      birthDate: '1985-05-15',
      deathDate: null,
      gender: 'female'
    }

    const request = {
      json: async () => requestData
    }

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params, request })
    const response = await PUT(event)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      id: 1,
      firstName: 'Jane',
      lastName: 'Smith',
      birthDate: '1985-05-15',
      deathDate: null,
      gender: 'female'
    })

    // Verify database was actually updated
    const person = sqlite.prepare('SELECT * FROM people WHERE id = ?').get(1)
    expect(person.first_name).toBe('Jane')
    expect(person.last_name).toBe('Smith')
  })

  it('should update only specified fields', async () => {
    // Arrange
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, death_date, gender, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('John', 'Doe', '1980-01-01', null, 'male', userId)

    const params = { id: '1' }
    const requestData = {
      firstName: 'John',
      lastName: 'Doe',
      birthDate: '1980-01-01',
      deathDate: '2023-12-25',  // Only updating death date
      gender: 'male'
    }

    const request = {
      json: async () => requestData
    }

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params, request })
    const response = await PUT(event)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.deathDate).toBe('2023-12-25')
    expect(data.firstName).toBe('John')  // Unchanged
  })

  it('should allow clearing optional fields by setting to null', async () => {
    // Arrange
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, death_date, gender, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('John', 'Doe', '1980-01-01', '2020-01-01', 'male', userId)

    const params = { id: '1' }
    const requestData = {
      firstName: 'John',
      lastName: 'Doe',
      birthDate: null,
      deathDate: null,
      gender: null
    }

    const request = {
      json: async () => requestData
    }

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params, request })
    const response = await PUT(event)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data.birthDate).toBe(null)
    expect(data.deathDate).toBe(null)
    expect(data.gender).toBe(null)
  })

  it('should return 404 when person not found', async () => {
    // Arrange
    const params = { id: '999' }
    const requestData = {
      firstName: 'Jane',
      lastName: 'Doe'
    }

    const request = {
      json: async () => requestData
    }

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params, request })
    const response = await PUT(event)

    // Assert
    expect(response.status).toBe(404)
  })

  it('should return 400 for invalid ID format', async () => {
    // Arrange
    const params = { id: 'abc' }
    const requestData = {
      firstName: 'Jane',
      lastName: 'Doe'
    }

    const request = {
      json: async () => requestData
    }

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params, request })
    const response = await PUT(event)

    // Assert
    expect(response.status).toBe(400)
  })

  it('should return 400 on malformed JSON', async () => {
    // Arrange
    const params = { id: '1' }
    const request = {
      json: async () => {
        throw new Error('Invalid JSON')
      }
    }

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params, request })
    const response = await PUT(event)

    // Assert
    expect(response.status).toBe(400)
  })

  it('should return 400 when firstName is missing', async () => {
    // Arrange
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, user_id)
      VALUES (?, ?, ?)
    `).run('John', 'Doe', userId)

    const params = { id: '1' }
    const requestData = {
      lastName: 'Smith'
    }

    const request = {
      json: async () => requestData
    }

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params, request })
    const response = await PUT(event)

    // Assert
    expect(response.status).toBe(400)
  })

  it('should return 400 when lastName is missing', async () => {
    // Arrange
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, user_id)
      VALUES (?, ?, ?)
    `).run('John', 'Doe', userId)

    const params = { id: '1' }
    const requestData = {
      firstName: 'Jane'
    }

    const request = {
      json: async () => requestData
    }

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params, request })
    const response = await PUT(event)

    // Assert
    expect(response.status).toBe(400)
  })

  it('should return Content-Type application/json header', async () => {
    // Arrange
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, user_id)
      VALUES (?, ?, ?)
    `).run('John', 'Doe', userId)

    const params = { id: '1' }
    const requestData = {
      firstName: 'Jane',
      lastName: 'Smith'
    }

    const request = {
      json: async () => requestData
    }

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params, request })
    const response = await PUT(event)

    // Assert
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('should return 500 on database error', async () => {
    // Arrange
    const params = { id: '1' }
    const requestData = {
      firstName: 'Jane',
      lastName: 'Smith'
    }

    const request = {
      json: async () => requestData
    }

    // Close database to force error
    sqlite.close()

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params, request })
    const response = await PUT(event)

    // Assert
    expect(response.status).toBe(500)
  })
})

describe('DELETE /api/people/[id]', () => {
  let db
  let sqlite
  let userId

  beforeEach(async () => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // Setup test database with users table and default test user (Issue #72)
    userId = await setupTestDatabase(sqlite, db)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should delete person and return 204 No Content', async () => {
    // Arrange: Create person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, user_id)
      VALUES (?, ?, ?)
    `).run('John', 'Doe', userId)

    const params = { id: '1' }

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params })
    const response = await DELETE(event)

    // Assert
    expect(response.status).toBe(204)

    // Verify person was actually deleted
    const person = sqlite.prepare('SELECT * FROM people WHERE id = ?').get(1)
    expect(person).toBeUndefined()
  })

  it('should not return a body for 204 response', async () => {
    // Arrange
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, user_id)
      VALUES (?, ?, ?)
    `).run('John', 'Doe', userId)

    const params = { id: '1' }

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params })
    const response = await DELETE(event)

    // Assert
    expect(response.status).toBe(204)
    // 204 responses should not have a body
    const text = await response.text()
    expect(text).toBe('')
  })

  it('should return 404 when person not found', async () => {
    // Arrange
    const params = { id: '999' }

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params })
    const response = await DELETE(event)

    // Assert
    expect(response.status).toBe(404)
  })

  it('should return 400 for invalid ID format', async () => {
    // Arrange
    const params = { id: 'abc' }

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params })
    const response = await DELETE(event)

    // Assert
    expect(response.status).toBe(400)
  })

  it('should return 400 for negative ID', async () => {
    // Arrange
    const params = { id: '-1' }

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params })
    const response = await DELETE(event)

    // Assert
    expect(response.status).toBe(400)
  })

  it('should cascade delete relationships when person is deleted', async () => {
    // Arrange: Create two people and a relationship
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, user_id)
      VALUES (?, ?, ?)
    `).run('John', 'Doe', userId)

    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, user_id)
      VALUES (?, ?, ?)
    `).run('Jane', 'Doe', userId)

    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, user_id)
      VALUES (?, ?, ?, ?)
    `).run(1, 2, 'spouse', userId)

    const params = { id: '1' }

    // Act: Delete person 1
    const event = createMockAuthenticatedEvent(db, null, { params })
    const response = await DELETE(event)

    // Assert
    expect(response.status).toBe(204)

    // Verify relationship was cascade deleted
    const relationships = sqlite.prepare('SELECT * FROM relationships').all()
    expect(relationships).toHaveLength(0)
  })

  it('should return 500 on database error', async () => {
    // Arrange
    const params = { id: '1' }

    // Close database to force error
    sqlite.close()

    // Act
    const event = createMockAuthenticatedEvent(db, null, { params })
    const response = await DELETE(event)

    // Assert
    expect(response.status).toBe(500)
  })
})
