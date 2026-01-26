import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { GET as getPeople, POST as postPerson } from '../../../routes/api/people/+server.js'
import { GET as getPerson, PUT as putPerson } from '../../../routes/api/people/[id]/+server.js'
import { GET as getRelationships, POST as postRelationship } from '../../../routes/api/relationships/+server.js'
import { setupTestDatabase, createMockEvent } from '../../server/testHelpers.js'

/**
 * Performance Benchmark Tests for SvelteKit API Routes
 * Part of Story 6: Comprehensive Testing and Validation (Issue #65)
 *
 * Tests:
 * - API response times
 * - Database query efficiency
 * - Throughput under load
 * - Performance with large datasets
 *
 * Updated for Issue #118: Uses authentication helpers
 */
describe('Performance Benchmarks - People API', () => {
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

  // Skip: Environment-sensitive test - timing thresholds vary by environment
  it.skip('should fetch empty people list in < 100ms', async () => {
    const event = createMockEvent(db)

    const start = performance.now()
    const response = await getPeople(event)
    await response.json()
    const duration = performance.now() - start

    console.log(`Empty GET /api/people: ${duration.toFixed(2)}ms`)

    expect(response.status).toBe(200)
    expect(duration).toBeLessThan(100)
  })

  it('should fetch 100 people in < 200ms', async () => {
    const event = createMockEvent(db)

    // Insert 100 people
    const stmt = sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender)
      VALUES (?, ?, ?, ?)
    `)

    for (let i = 0; i < 100; i++) {
      stmt.run(`Person${i}`, `LastName${i}`, '1980-01-01', 'male')
    }

    const start = performance.now()
    const response = await getPeople(event)
    const data = await response.json()
    const duration = performance.now() - start

    console.log(`GET /api/people (100 records): ${duration.toFixed(2)}ms`)

    expect(response.status).toBe(200)
    expect(data).toHaveLength(100)
    expect(duration).toBeLessThan(200)
  })

  // Skip: Environment-sensitive test - timing thresholds vary by environment
  it.skip('should fetch 1000 people in < 500ms', async () => {
    const event = createMockEvent(db)

    // Insert 1000 people
    const stmt = sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender)
      VALUES (?, ?, ?, ?)
    `)

    for (let i = 0; i < 1000; i++) {
      stmt.run(`Person${i}`, `LastName${i}`, '1980-01-01', 'male')
    }

    const start = performance.now()
    const response = await getPeople(event)
    const data = await response.json()
    const duration = performance.now() - start

    console.log(`GET /api/people (1000 records): ${duration.toFixed(2)}ms`)

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1000)
    expect(duration).toBeLessThan(500)
  })

  it('should create person in < 100ms', async () => {
    const start = performance.now()

    const response = await postPerson(createMockEvent(db, {
      request: {
        json: async () => ({
          firstName: 'John',
          lastName: 'Doe',
          birthDate: '1980-01-01',
          gender: 'male'
        })
      }
    }))

    await response.json()
    const duration = performance.now() - start

    console.log(`POST /api/people: ${duration.toFixed(2)}ms`)

    expect(response.status).toBe(201)
    // Threshold of 100ms accounts for CI/CD environment variance
    expect(duration).toBeLessThan(100)
  })

  it('should fetch single person in < 50ms', async () => {
    // Create a person first
    const createResponse = await postPerson(createMockEvent(db, {
      request: {
        json: async () => ({ firstName: 'John', lastName: 'Doe' })
      }
    }))

    const person = await createResponse.json()

    const start = performance.now()

    const response = await getPerson(createMockEvent(db, {
      params: { id: person.id.toString() }
    }))

    await response.json()
    const duration = performance.now() - start

    console.log(`GET /api/people/:id: ${duration.toFixed(2)}ms`)

    expect(response.status).toBe(200)
    expect(duration).toBeLessThan(50)
  })

  it('should update person in < 50ms', async () => {
    // Create a person first
    const createResponse = await postPerson(createMockEvent(db, {
      request: {
        json: async () => ({ firstName: 'John', lastName: 'Doe' })
      }
    }))

    const person = await createResponse.json()

    const start = performance.now()

    const response = await putPerson(createMockEvent(db, {
      params: { id: person.id.toString() },
      request: {
        json: async () => ({
          firstName: 'Jane',
          lastName: 'Smith'
        })
      }
    }))

    await response.json()
    const duration = performance.now() - start

    console.log(`PUT /api/people/:id: ${duration.toFixed(2)}ms`)

    expect(response.status).toBe(200)
    expect(duration).toBeLessThan(50)
  })

  it('should handle 100 sequential updates efficiently', async () => {
    // Create a person
    const createResponse = await postPerson(createMockEvent(db, {
      request: {
        json: async () => ({ firstName: 'Test', lastName: 'Person' })
      }
    }))

    const person = await createResponse.json()

    const start = performance.now()

    // Perform 100 updates
    for (let i = 0; i < 100; i++) {
      await putPerson(createMockEvent(db, {
        params: { id: person.id.toString() },
        request: {
          json: async () => ({
            firstName: `Update${i}`,
            lastName: 'Person'
          })
        }
      }))
    }

    const duration = performance.now() - start

    console.log(`100 sequential updates: ${duration.toFixed(2)}ms`)
    console.log(`Average per update: ${(duration / 100).toFixed(2)}ms`)

    expect(duration).toBeLessThan(2000)  // < 2 seconds for 100 updates
  })
})

describe('Performance Benchmarks - Relationships API', () => {
  let db
  let sqlite
  let userId

  beforeEach(async () => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)
    userId = await setupTestDatabase(sqlite, db)

    // Create 10 test people
    for (let i = 1; i <= 10; i++) {
      sqlite.prepare(`
        INSERT INTO people (id, first_name, last_name) VALUES (?, ?, ?)
      `).run(i, `Person${i}`, `LastName${i}`)
    }
  })

  afterEach(() => {
    sqlite.close()
  })

  // Skip: Environment-sensitive test - timing thresholds vary by environment
  it.skip('should fetch empty relationships list in < 100ms', async () => {
    const event = createMockEvent(db)

    const start = performance.now()
    const response = await getRelationships(event)
    await response.json()
    const duration = performance.now() - start

    console.log(`Empty GET /api/relationships: ${duration.toFixed(2)}ms`)

    expect(response.status).toBe(200)
    expect(duration).toBeLessThan(100)
  })

  it('should fetch 100 relationships in < 200ms', async () => {
    const event = createMockEvent(db)

    // Create 100 spouse relationships
    const stmt = sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type)
      VALUES (?, ?, ?)
    `)

    for (let i = 0; i < 100; i++) {
      const personId = (i % 10) + 1
      const relatedPersonId = ((i + 1) % 10) + 1
      if (personId !== relatedPersonId) {
        stmt.run(personId, relatedPersonId, 'spouse')
      }
    }

    const start = performance.now()
    const response = await getRelationships(event)
    const data = await response.json()
    const duration = performance.now() - start

    console.log(`GET /api/relationships (100 records): ${duration.toFixed(2)}ms`)

    expect(response.status).toBe(200)
    expect(data.length).toBeGreaterThan(0)
    expect(duration).toBeLessThan(200)
  })

  it('should create relationship in < 60ms', async () => {
    const start = performance.now()

    const response = await postRelationship(createMockEvent(db, {
      request: {
        json: async () => ({
          person1Id: 1,
          person2Id: 2,
          type: 'mother'
        })
      }
    }))

    await response.json()
    const duration = performance.now() - start

    console.log(`POST /api/relationships: ${duration.toFixed(2)}ms`)

    expect(response.status).toBe(201)
    expect(duration).toBeLessThan(60) // Allow for CI/CD variance
  })
})

describe('Performance Benchmarks - Complex Queries', () => {
  let db
  let sqlite
  let userId

  beforeEach(async () => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)
    userId = await setupTestDatabase(sqlite, db)

    // Create indices
    sqlite.exec(`
      CREATE INDEX idx_relationships_person ON relationships(person1_id);
      CREATE INDEX idx_relationships_related ON relationships(person2_id);
      CREATE INDEX idx_relationships_type ON relationships(type);
    `)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should handle large dataset (500 people, 1000 relationships) efficiently', async () => {
    const event = createMockEvent(db)

    // Create 500 people
    const peopleStmt = sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender)
      VALUES (?, ?, ?, ?)
    `)

    for (let i = 1; i <= 500; i++) {
      peopleStmt.run(`Person${i}`, `LastName${i}`, '1980-01-01', 'male')
    }

    // Create 1000 relationships
    const relStmt = sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
    `)

    for (let i = 1; i <= 1000; i++) {
      const personId = (i % 500) + 1
      const relatedPersonId = ((i + 10) % 500) + 1

      if (personId !== relatedPersonId) {
        if (i % 3 === 0) {
          relStmt.run(personId, relatedPersonId, 'parentOf', 'mother')
        } else if (i % 3 === 1) {
          relStmt.run(personId, relatedPersonId, 'parentOf', 'father')
        } else {
          relStmt.run(personId, relatedPersonId, 'spouse', null)
        }
      }
    }

    // Test fetching all people
    const peopleStart = performance.now()
    const peopleResponse = await getPeople(event)
    const peopleData = await peopleResponse.json()
    const peopleDuration = performance.now() - peopleStart

    console.log(`GET /api/people (500 records): ${peopleDuration.toFixed(2)}ms`)

    // Test fetching all relationships
    const relsStart = performance.now()
    const relsResponse = await getRelationships(event)
    const relsData = await relsResponse.json()
    const relsDuration = performance.now() - relsStart

    console.log(`GET /api/relationships (1000 records): ${relsDuration.toFixed(2)}ms`)

    expect(peopleData).toHaveLength(500)
    expect(relsData.length).toBeGreaterThan(900)  // Most of 1000 (excluding self-refs)
    expect(peopleDuration).toBeLessThan(1000)
    expect(relsDuration).toBeLessThan(1000)
  })

  // NOTE: Skipped due to high flakiness. Small dataset timing measurements are extremely
  // sensitive to system load, causing ratios to vary from 0.5x to 33x between runs.
  // The large dataset test (500 people) provides adequate performance coverage.
  it.skip('should scale linearly with dataset size', async () => {
    const event = createMockEvent(db)
    const results = []

    // Test with 100, 200, 300 people
    for (const count of [100, 200, 300]) {
      // Clear and recreate table
      sqlite.exec('DELETE FROM people')

      // Insert people
      for (let i = 1; i <= count; i++) {
        sqlite.prepare(`
          INSERT INTO people (first_name, last_name) VALUES (?, ?)
        `).run(`Person${i}`, `LastName${i}`)
      }

      // Measure fetch time
      const start = performance.now()
      const response = await getPeople(event)
      await response.json()
      const duration = performance.now() - start

      results.push({ count, duration })
      console.log(`${count} people: ${duration.toFixed(2)}ms`)
    }

    // Calculate scaling factor (should be close to linear)
    const ratio1 = results[1].duration / results[0].duration
    const ratio2 = results[2].duration / results[1].duration

    console.log(`Scaling ratios: ${ratio1.toFixed(2)}, ${ratio2.toFixed(2)}`)

    // Ratios should be close to 2:1 (linear scaling) and not worse than quadratic
    // Allow up to 6x ratio to account for CI/CD variance with small datasets
    expect(ratio1).toBeLessThan(6)  // Not worse than 6x for 2x data
    expect(ratio2).toBeLessThan(6)
  })
})
