import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { people } from '$lib/db/schema.js'
import { GET, POST } from './+server.js'

/**
 * Test suite for People API Collection Endpoints
 * Tests GET /api/people and POST /api/people
 *
 * Following TDD RED phase: These tests will fail initially
 */
describe('GET /api/people', () => {
  let db
  let sqlite

  beforeEach(() => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // Create people table
    sqlite.exec(`
      CREATE TABLE people (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        birth_date TEXT,
        death_date TEXT,
        gender TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should return empty array when no people exist', async () => {
    const response = await GET({ locals: { db } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('should return all people as JSON array', async () => {
    // Arrange: Insert test data
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, death_date, gender)
      VALUES (?, ?, ?, ?, ?)
    `).run('John', 'Doe', '1980-01-01', null, 'male')

    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, death_date, gender)
      VALUES (?, ?, ?, ?, ?)
    `).run('Jane', 'Smith', '1985-05-15', null, 'female')

    // Act
    const response = await GET({ locals: { db } })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(2)

    // Verify first person
    expect(data[0]).toMatchObject({
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      birthDate: '1980-01-01',
      deathDate: null,
      gender: 'male'
    })
    expect(data[0].createdAt).toBeDefined()

    // Verify second person
    expect(data[1]).toMatchObject({
      id: 2,
      firstName: 'Jane',
      lastName: 'Smith',
      birthDate: '1985-05-15',
      deathDate: null,
      gender: 'female'
    })
  })

  it('should return people with death dates', async () => {
    // Arrange
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, death_date, gender)
      VALUES (?, ?, ?, ?, ?)
    `).run('Albert', 'Einstein', '1879-03-14', '1955-04-18', 'male')

    // Act
    const response = await GET({ locals: { db } })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data[0].deathDate).toBe('1955-04-18')
  })

  it('should handle people with null optional fields', async () => {
    // Arrange: Person with minimal data
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, death_date, gender)
      VALUES (?, ?, ?, ?, ?)
    `).run('Minimal', 'Person', null, null, null)

    // Act
    const response = await GET({ locals: { db } })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data[0]).toMatchObject({
      firstName: 'Minimal',
      lastName: 'Person',
      birthDate: null,
      deathDate: null,
      gender: null
    })
  })

  it('should return Content-Type application/json header', async () => {
    const response = await GET({ locals: { db } })

    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('should return 500 on database error', async () => {
    // Arrange: Close database to force error
    sqlite.close()

    // Act
    const response = await GET({ locals: { db } })

    // Assert
    expect(response.status).toBe(500)
  })
})

describe('POST /api/people', () => {
  let db
  let sqlite

  beforeEach(() => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // Create people table
    sqlite.exec(`
      CREATE TABLE people (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        birth_date TEXT,
        death_date TEXT,
        gender TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should create person with all fields and return 201', async () => {
    // Arrange
    const requestData = {
      firstName: 'John',
      lastName: 'Doe',
      birthDate: '1980-01-01',
      deathDate: null,
      gender: 'male'
    }

    const request = {
      json: async () => requestData
    }

    // Act
    const response = await POST({ request, locals: { db } })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(201)
    expect(data).toMatchObject({
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      birthDate: '1980-01-01',
      deathDate: null,
      gender: 'male'
    })
    expect(data.createdAt).toBeDefined()

    // Verify person was actually inserted
    const person = sqlite.prepare('SELECT * FROM people WHERE id = ?').get(1)
    expect(person.first_name).toBe('John')
    expect(person.last_name).toBe('Doe')
  })

  it('should create person with minimal required fields only', async () => {
    // Arrange
    const requestData = {
      firstName: 'Jane',
      lastName: 'Smith',
      birthDate: null,
      deathDate: null,
      gender: null
    }

    const request = {
      json: async () => requestData
    }

    // Act
    const response = await POST({ request, locals: { db } })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(201)
    expect(data).toMatchObject({
      id: 1,
      firstName: 'Jane',
      lastName: 'Smith',
      birthDate: null,
      deathDate: null,
      gender: null
    })
  })

  it('should auto-generate ID and createdAt timestamp', async () => {
    // Arrange
    const requestData = {
      firstName: 'Test',
      lastName: 'User'
    }

    const request = {
      json: async () => requestData
    }

    // Act
    const response = await POST({ request, locals: { db } })
    const data = await response.json()

    // Assert
    expect(data.id).toBe(1)
    expect(data.createdAt).toBeDefined()
    expect(typeof data.createdAt).toBe('string')
  })

  it('should auto-increment IDs for multiple people', async () => {
    // Arrange & Act: Create first person
    const request1 = {
      json: async () => ({ firstName: 'First', lastName: 'Person' })
    }
    const response1 = await POST({ request: request1, locals: { db } })
    const data1 = await response1.json()

    // Create second person
    const request2 = {
      json: async () => ({ firstName: 'Second', lastName: 'Person' })
    }
    const response2 = await POST({ request: request2, locals: { db } })
    const data2 = await response2.json()

    // Assert
    expect(data1.id).toBe(1)
    expect(data2.id).toBe(2)
  })

  it('should return 400 on malformed JSON', async () => {
    // Arrange
    const request = {
      json: async () => {
        throw new Error('Invalid JSON')
      }
    }

    // Act
    const response = await POST({ request, locals: { db } })

    // Assert
    expect(response.status).toBe(400)
  })

  it('should return 400 when firstName is missing', async () => {
    // Arrange
    const requestData = {
      lastName: 'Doe'
    }

    const request = {
      json: async () => requestData
    }

    // Act
    const response = await POST({ request, locals: { db } })

    // Assert
    expect(response.status).toBe(400)
  })

  it('should return 400 when lastName is missing', async () => {
    // Arrange
    const requestData = {
      firstName: 'John'
    }

    const request = {
      json: async () => requestData
    }

    // Act
    const response = await POST({ request, locals: { db } })

    // Assert
    expect(response.status).toBe(400)
  })

  it('should return Content-Type application/json header', async () => {
    const requestData = {
      firstName: 'Test',
      lastName: 'User'
    }

    const request = {
      json: async () => requestData
    }

    const response = await POST({ request, locals: { db } })

    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('should return 500 on database error', async () => {
    // Arrange
    const requestData = {
      firstName: 'Test',
      lastName: 'User'
    }

    const request = {
      json: async () => requestData
    }

    // Close database to force error
    sqlite.close()

    // Act
    const response = await POST({ request, locals: { db } })

    // Assert
    expect(response.status).toBe(500)
  })
})
