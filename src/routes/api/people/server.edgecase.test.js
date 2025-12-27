import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { GET, POST } from './+server.js'
import { setupTestDatabase, createMockAuthenticatedEvent } from '$lib/server/testHelpers.js'

/**
 * Edge Case Tests for People API Collection Endpoints
 * Part of Story 6: Comprehensive Testing and Validation (Issue #65)
 *
 * Updated for Issue #72: All tests now include authentication
 */
describe('POST /api/people - Edge Cases', () => {
  let db
  let sqlite
  let userId

  beforeEach(async () => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)


    // Setup test database with users table and default test user (Issue #72)

    userId = await setupTestDatabase(sqlite, db)
  })

  afterEach(() => {
    sqlite.close()
  })

  // Boundary Conditions - Names
  it('should accept single-character first name', async () => {
    const request = {
      json: async () => ({ firstName: 'A', lastName: 'Smith' })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.firstName).toBe('A')
  })

  it('should accept single-character last name', async () => {
    const request = {
      json: async () => ({ firstName: 'John', lastName: 'X' })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.lastName).toBe('X')
  })

  it('should accept very long first name (255 characters)', async () => {
    const longName = 'A'.repeat(255)
    const request = {
      json: async () => ({ firstName: longName, lastName: 'Smith' })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.firstName).toBe(longName)
  })

  it('should accept very long last name (255 characters)', async () => {
    const longName = 'B'.repeat(255)
    const request = {
      json: async () => ({ firstName: 'John', lastName: longName })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.lastName).toBe(longName)
  })

  // Special Characters
  it('should accept names with hyphens', async () => {
    const request = {
      json: async () => ({ firstName: 'Mary-Jane', lastName: 'Smith-Jones' })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.firstName).toBe('Mary-Jane')
    expect(data.lastName).toBe('Smith-Jones')
  })

  it('should accept names with apostrophes', async () => {
    const request = {
      json: async () => ({ firstName: "D'Angelo", lastName: "O'Brien" })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.firstName).toBe("D'Angelo")
    expect(data.lastName).toBe("O'Brien")
  })

  it('should accept names with spaces', async () => {
    const request = {
      json: async () => ({ firstName: 'Mary Ann', lastName: 'Van Der Berg' })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.firstName).toBe('Mary Ann')
    expect(data.lastName).toBe('Van Der Berg')
  })

  it('should accept names with accented characters', async () => {
    const request = {
      json: async () => ({ firstName: 'José', lastName: 'Müller' })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.firstName).toBe('José')
    expect(data.lastName).toBe('Müller')
  })

  it('should accept names with non-Latin characters (Chinese)', async () => {
    const request = {
      json: async () => ({ firstName: '李', lastName: '明' })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.firstName).toBe('李')
    expect(data.lastName).toBe('明')
  })

  it('should accept names with non-Latin characters (Arabic)', async () => {
    const request = {
      json: async () => ({ firstName: 'محمد', lastName: 'علي' })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.firstName).toBe('محمد')
    expect(data.lastName).toBe('علي')
  })

  // Whitespace Edge Cases
  it('should handle names with leading/trailing whitespace', async () => {
    const request = {
      json: async () => ({ firstName: '  John  ', lastName: '  Doe  ' })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    // Store should preserve whitespace (trimming is optional frontend concern)
    expect(data.firstName).toBe('  John  ')
    expect(data.lastName).toBe('  Doe  ')
  })

  it('should reject empty string first name', async () => {
    const request = {
      json: async () => ({ firstName: '', lastName: 'Doe' })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))

    expect(response.status).toBe(400)
  })

  it('should reject empty string last name', async () => {
    const request = {
      json: async () => ({ firstName: 'John', lastName: '' })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))

    expect(response.status).toBe(400)
  })

  it('should reject whitespace-only first name', async () => {
    const request = {
      json: async () => ({ firstName: '   ', lastName: 'Doe' })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))

    expect(response.status).toBe(400)
  })

  it('should reject whitespace-only last name', async () => {
    const request = {
      json: async () => ({ firstName: 'John', lastName: '   ' })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))

    expect(response.status).toBe(400)
  })

  // Date Edge Cases
  it('should accept very old birth dates (year 1000)', async () => {
    const request = {
      json: async () => ({
        firstName: 'Ancient',
        lastName: 'Person',
        birthDate: '1000-01-01'
      })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.birthDate).toBe('1000-01-01')
  })

  it('should accept future birth dates', async () => {
    const request = {
      json: async () => ({
        firstName: 'Future',
        lastName: 'Baby',
        birthDate: '2030-12-31'
      })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.birthDate).toBe('2030-12-31')
  })

  it('should accept leap year dates', async () => {
    const request = {
      json: async () => ({
        firstName: 'Leap',
        lastName: 'Year',
        birthDate: '2000-02-29'
      })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.birthDate).toBe('2000-02-29')
  })

  it('should reject invalid date format', async () => {
    const request = {
      json: async () => ({
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '01/01/1980'  // Wrong format (MM/DD/YYYY instead of YYYY-MM-DD)
      })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))

    expect(response.status).toBe(400)
  })

  it('should reject invalid dates (13th month)', async () => {
    const request = {
      json: async () => ({
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1980-13-01'
      })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))

    expect(response.status).toBe(400)
  })

  it('should reject invalid dates (32nd day)', async () => {
    const request = {
      json: async () => ({
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1980-01-32'
      })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))

    expect(response.status).toBe(400)
  })

  it('should reject invalid dates (Feb 30)', async () => {
    const request = {
      json: async () => ({
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1980-02-30'
      })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))

    expect(response.status).toBe(400)
  })

  it('should reject death date before birth date', async () => {
    const request = {
      json: async () => ({
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1980-01-01',
        deathDate: '1979-12-31'
      })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))

    expect(response.status).toBe(400)
  })

  it('should accept same birth and death date (died on birth)', async () => {
    const request = {
      json: async () => ({
        firstName: 'Tragic',
        lastName: 'Case',
        birthDate: '1980-01-01',
        deathDate: '1980-01-01'
      })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.birthDate).toBe('1980-01-01')
    expect(data.deathDate).toBe('1980-01-01')
  })

  // Gender Edge Cases
  it('should accept lowercase gender values', async () => {
    const request = {
      json: async () => ({
        firstName: 'John',
        lastName: 'Doe',
        gender: 'male'
      })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.gender).toBe('male')
  })

  it('should reject uppercase gender values (enforce lowercase)', async () => {
    const request = {
      json: async () => ({
        firstName: 'John',
        lastName: 'Doe',
        gender: 'MALE'
      })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))

    expect(response.status).toBe(400)
  })

  it('should reject invalid gender values', async () => {
    const request = {
      json: async () => ({
        firstName: 'John',
        lastName: 'Doe',
        gender: 'invalid'
      })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))

    expect(response.status).toBe(400)
  })

  it('should accept all valid gender values', async () => {
    const genders = ['female', 'male', 'other', 'unspecified']

    for (const gender of genders) {
      const request = {
        json: async () => ({
          firstName: 'Test',
          lastName: 'Person',
          gender
        })
      }

      const response = await POST(createMockAuthenticatedEvent(db, null, { request }))
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.gender).toBe(gender)
    }
  })

  // Unexpected Field Types
  it('should reject firstName as number', async () => {
    const request = {
      json: async () => ({ firstName: 123, lastName: 'Doe' })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))

    expect(response.status).toBe(400)
  })

  it('should reject lastName as boolean', async () => {
    const request = {
      json: async () => ({ firstName: 'John', lastName: true })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))

    expect(response.status).toBe(400)
  })

  it('should reject firstName as array', async () => {
    const request = {
      json: async () => ({ firstName: ['John'], lastName: 'Doe' })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))

    expect(response.status).toBe(400)
  })

  it('should reject lastName as object', async () => {
    const request = {
      json: async () => ({ firstName: 'John', lastName: { name: 'Doe' } })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))

    expect(response.status).toBe(400)
  })

  it('should reject null firstName', async () => {
    const request = {
      json: async () => ({ firstName: null, lastName: 'Doe' })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))

    expect(response.status).toBe(400)
  })

  it('should reject null lastName', async () => {
    const request = {
      json: async () => ({ firstName: 'John', lastName: null })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))

    expect(response.status).toBe(400)
  })

  // Extra/Unexpected Fields
  it('should ignore extra unexpected fields', async () => {
    const request = {
      json: async () => ({
        firstName: 'John',
        lastName: 'Doe',
        unexpectedField: 'should be ignored',
        anotherField: 123
      })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.firstName).toBe('John')
    expect(data.lastName).toBe('Doe')
    expect(data.unexpectedField).toBeUndefined()
    expect(data.anotherField).toBeUndefined()
  })

  // SQL Injection Attempts
  it('should safely handle SQL injection attempts in firstName', async () => {
    const request = {
      json: async () => ({
        firstName: "'; DROP TABLE people; --",
        lastName: 'Hacker'
      })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.firstName).toBe("'; DROP TABLE people; --")

    // Verify table still exists
    const count = sqlite.prepare('SELECT COUNT(*) as count FROM people').get()
    expect(count.count).toBe(1)
  })

  it('should safely handle SQL injection attempts in lastName', async () => {
    const request = {
      json: async () => ({
        firstName: 'Bobby',
        lastName: "'; DELETE FROM people WHERE 1=1; --"
      })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.lastName).toBe("'; DELETE FROM people WHERE 1=1; --")

    // Verify record exists
    const count = sqlite.prepare('SELECT COUNT(*) as count FROM people').get()
    expect(count.count).toBe(1)
  })

  // Large Payloads
  it('should handle large but reasonable payload size', async () => {
    const request = {
      json: async () => ({
        firstName: 'A'.repeat(100),
        lastName: 'B'.repeat(100),
        birthDate: '1980-01-01',
        deathDate: '2050-01-01',
        gender: 'male'
      })
    }

    const response = await POST(createMockAuthenticatedEvent(db, null, { request }))

    expect(response.status).toBe(201)
  })
})

describe('GET /api/people - Edge Cases', () => {
  let db
  let sqlite

  beforeEach(async () => {
    sqlite = new Database(':memory:')


    // Setup test database with users table and default test user (Issue #72)

    userId = await setupTestDatabase(sqlite, db)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should handle large result sets (1000+ people)', async () => {
    // Create 1000 people
    const stmt = sqlite.prepare(`
      INSERT INTO people (first_name, last_name, user_id)
      VALUES (?, ?, ?)
    `)

    for (let i = 0; i < 1000; i++) {
      stmt.run(`Person${i}`, `LastName${i}`, userId)
    }

    const response = await GET(createMockAuthenticatedEvent(db))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1000)
    expect(data[0].firstName).toBe('Person0')
    expect(data[999].firstName).toBe('Person999')
  })

  it('should handle people with special characters in names', async () => {
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, user_id)
      VALUES (?, ?, ?)
    `).run("D'Angelo", "O'Brien-Smith", userId)

    const response = await GET(createMockAuthenticatedEvent(db))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data[0].firstName).toBe("D'Angelo")
    expect(data[0].lastName).toBe("O'Brien-Smith")
  })

  it('should handle people with Unicode characters', async () => {
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, user_id)
      VALUES (?, ?, ?)
    `).run('José', 'Müller', userId)

    const response = await GET(createMockAuthenticatedEvent(db))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data[0].firstName).toBe('José')
    expect(data[0].lastName).toBe('Müller')
  })

  it('should handle people with non-Latin scripts', async () => {
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, user_id)
      VALUES (?, ?, ?)
    `).run('李', '明', userId)

    const response = await GET(createMockAuthenticatedEvent(db))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data[0].firstName).toBe('李')
    expect(data[0].lastName).toBe('明')
  })

  it('should maintain data consistency across multiple calls', async () => {
    // Insert test data
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, user_id)
      VALUES (?, ?, ?)
    `).run('John', 'Doe', userId)

    // Call GET multiple times
    const response1 = await GET(createMockAuthenticatedEvent(db))
    const data1 = await response1.json()

    const response2 = await GET(createMockAuthenticatedEvent(db))
    const data2 = await response2.json()

    const response3 = await GET(createMockAuthenticatedEvent(db))
    const data3 = await response3.json()

    // All responses should be identical
    expect(data1).toEqual(data2)
    expect(data2).toEqual(data3)
    expect(data1).toHaveLength(1)
  })
})
