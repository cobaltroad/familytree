import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { GET as getPeople, POST as postPerson } from '../../../routes/api/people/+server.js'
import { GET as getPerson, PUT as putPerson } from '../../../routes/api/people/[id]/+server.js'
import { GET as getRelationships, POST as postRelationship } from '../../../routes/api/relationships/+server.js'

/**
 * Performance Benchmark Tests for SvelteKit API Routes
 * Part of Story 6: Comprehensive Testing and Validation (Issue #65)
 *
 * Tests:
 * - API response times
 * - Database query efficiency
 * - Throughput under load
 * - Performance with large datasets
 */
describe('Performance Benchmarks - People API', () => {
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

  it('should fetch empty people list in < 100ms', async () => {
    const start = performance.now()
    const response = await getPeople({ locals: { db } })
    await response.json()
    const duration = performance.now() - start

    console.log(`Empty GET /api/people: ${duration.toFixed(2)}ms`)

    expect(response.status).toBe(200)
    expect(duration).toBeLessThan(100)
  })

  it('should fetch 100 people in < 200ms', async () => {
    // Insert 100 people
    const stmt = sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender)
      VALUES (?, ?, ?, ?)
    `)

    for (let i = 0; i < 100; i++) {
      stmt.run(`Person${i}`, `LastName${i}`, '1980-01-01', 'male')
    }

    const start = performance.now()
    const response = await getPeople({ locals: { db } })
    const data = await response.json()
    const duration = performance.now() - start

    console.log(`GET /api/people (100 records): ${duration.toFixed(2)}ms`)

    expect(response.status).toBe(200)
    expect(data).toHaveLength(100)
    expect(duration).toBeLessThan(200)
  })

  it('should fetch 1000 people in < 500ms', async () => {
    // Insert 1000 people
    const stmt = sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender)
      VALUES (?, ?, ?, ?)
    `)

    for (let i = 0; i < 1000; i++) {
      stmt.run(`Person${i}`, `LastName${i}`, '1980-01-01', 'male')
    }

    const start = performance.now()
    const response = await getPeople({ locals: { db } })
    const data = await response.json()
    const duration = performance.now() - start

    console.log(`GET /api/people (1000 records): ${duration.toFixed(2)}ms`)

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1000)
    expect(duration).toBeLessThan(500)
  })

  it('should create person in < 50ms', async () => {
    const start = performance.now()

    const response = await postPerson({
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

    await response.json()
    const duration = performance.now() - start

    console.log(`POST /api/people: ${duration.toFixed(2)}ms`)

    expect(response.status).toBe(201)
    expect(duration).toBeLessThan(50)
  })

  it('should handle batch creation of 100 people efficiently', async () => {
    const start = performance.now()

    const promises = []
    for (let i = 0; i < 100; i++) {
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

    await Promise.all(promises)
    const duration = performance.now() - start

    console.log(`Batch create 100 people: ${duration.toFixed(2)}ms`)
    console.log(`Average per person: ${(duration / 100).toFixed(2)}ms`)

    expect(duration).toBeLessThan(2000)  // < 2 seconds for 100 people
  })

  it('should fetch single person in < 50ms', async () => {
    // Create a person first
    const createResponse = await postPerson({
      request: {
        json: async () => ({ firstName: 'John', lastName: 'Doe' })
      },
      locals: { db }
    })

    const person = await createResponse.json()

    const start = performance.now()

    const response = await getPerson({
      params: { id: person.id.toString() },
      locals: { db }
    })

    await response.json()
    const duration = performance.now() - start

    console.log(`GET /api/people/:id: ${duration.toFixed(2)}ms`)

    expect(response.status).toBe(200)
    expect(duration).toBeLessThan(50)
  })

  it('should update person in < 50ms', async () => {
    // Create a person first
    const createResponse = await postPerson({
      request: {
        json: async () => ({ firstName: 'John', lastName: 'Doe' })
      },
      locals: { db }
    })

    const person = await createResponse.json()

    const start = performance.now()

    const response = await putPerson({
      params: { id: person.id.toString() },
      request: {
        json: async () => ({
          firstName: 'Jane',
          lastName: 'Smith'
        })
      },
      locals: { db }
    })

    await response.json()
    const duration = performance.now() - start

    console.log(`PUT /api/people/:id: ${duration.toFixed(2)}ms`)

    expect(response.status).toBe(200)
    expect(duration).toBeLessThan(50)
  })

  it('should handle 100 sequential updates efficiently', async () => {
    // Create a person
    const createResponse = await postPerson({
      request: {
        json: async () => ({ firstName: 'Test', lastName: 'Person' })
      },
      locals: { db }
    })

    const person = await createResponse.json()

    const start = performance.now()

    // Perform 100 updates
    for (let i = 0; i < 100; i++) {
      await putPerson({
        params: { id: person.id.toString() },
        request: {
          json: async () => ({
            firstName: `Update${i}`,
            lastName: 'Person'
          })
        },
        locals: { db }
      })
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

  it('should fetch empty relationships list in < 100ms', async () => {
    const start = performance.now()
    const response = await getRelationships({ locals: { db } })
    await response.json()
    const duration = performance.now() - start

    console.log(`Empty GET /api/relationships: ${duration.toFixed(2)}ms`)

    expect(response.status).toBe(200)
    expect(duration).toBeLessThan(100)
  })

  it('should fetch 100 relationships in < 200ms', async () => {
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
    const response = await getRelationships({ locals: { db } })
    const data = await response.json()
    const duration = performance.now() - start

    console.log(`GET /api/relationships (100 records): ${duration.toFixed(2)}ms`)

    expect(response.status).toBe(200)
    expect(data.length).toBeGreaterThan(0)
    expect(duration).toBeLessThan(200)
  })

  it('should create relationship in < 50ms', async () => {
    const start = performance.now()

    const response = await postRelationship({
      request: {
        json: async () => ({
          person1Id: 1,
          person2Id: 2,
          type: 'mother'
        })
      },
      locals: { db }
    })

    await response.json()
    const duration = performance.now() - start

    console.log(`POST /api/relationships: ${duration.toFixed(2)}ms`)

    expect(response.status).toBe(201)
    expect(duration).toBeLessThan(50)
  })

  it('should handle batch creation of 50 relationships efficiently', async () => {
    const start = performance.now()

    const promises = []
    for (let i = 0; i < 50; i++) {
      const personId = (i % 10) + 1
      const relatedPersonId = ((i + 2) % 10) + 1

      if (personId !== relatedPersonId) {
        promises.push(
          postRelationship({
            request: {
              json: async () => ({
                personId,
                relatedPersonId,
                type: 'spouse'
              })
            },
            locals: { db }
          })
        )
      }
    }

    await Promise.all(promises)
    const duration = performance.now() - start

    console.log(`Batch create 50 relationships: ${duration.toFixed(2)}ms`)
    console.log(`Average per relationship: ${(duration / promises.length).toFixed(2)}ms`)

    expect(duration).toBeLessThan(1500)  // < 1.5 seconds for 50 relationships
  })
})

describe('Performance Benchmarks - Complex Queries', () => {
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

      CREATE INDEX idx_relationships_person ON relationships(person1_id);
      CREATE INDEX idx_relationships_related ON relationships(person2_id);
      CREATE INDEX idx_relationships_type ON relationships(type);
    `)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should handle large dataset (500 people, 1000 relationships) efficiently', async () => {
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
    const peopleResponse = await getPeople({ locals: { db } })
    const peopleData = await peopleResponse.json()
    const peopleDuration = performance.now() - peopleStart

    console.log(`GET /api/people (500 records): ${peopleDuration.toFixed(2)}ms`)

    // Test fetching all relationships
    const relsStart = performance.now()
    const relsResponse = await getRelationships({ locals: { db } })
    const relsData = await relsResponse.json()
    const relsDuration = performance.now() - relsStart

    console.log(`GET /api/relationships (1000 records): ${relsDuration.toFixed(2)}ms`)

    expect(peopleData).toHaveLength(500)
    expect(relsData.length).toBeGreaterThan(900)  // Most of 1000 (excluding self-refs)
    expect(peopleDuration).toBeLessThan(1000)
    expect(relsDuration).toBeLessThan(1000)
  })

  it('should maintain performance with repeated queries', async () => {
    // Create test data
    for (let i = 1; i <= 100; i++) {
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name) VALUES (?, ?)
      `).run(`Person${i}`, `LastName${i}`)
    }

    // Run 10 consecutive queries and measure consistency
    const durations = []

    for (let i = 0; i < 10; i++) {
      const start = performance.now()
      await getPeople({ locals: { db } })
      const duration = performance.now() - start
      durations.push(duration)
    }

    const avgDuration = durations.reduce((a, b) => a + b) / durations.length
    const maxDuration = Math.max(...durations)
    const minDuration = Math.min(...durations)
    const variance = maxDuration - minDuration

    console.log(`10 repeated queries - Avg: ${avgDuration.toFixed(2)}ms, Min: ${minDuration.toFixed(2)}ms, Max: ${maxDuration.toFixed(2)}ms, Variance: ${variance.toFixed(2)}ms`)

    // Performance should be consistent (low variance)
    expect(avgDuration).toBeLessThan(100)
    expect(variance).toBeLessThan(50)  // Less than 50ms variance
  })

  it('should scale linearly with dataset size', async () => {
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
      const response = await getPeople({ locals: { db } })
      await response.json()
      const duration = performance.now() - start

      results.push({ count, duration })
      console.log(`${count} people: ${duration.toFixed(2)}ms`)
    }

    // Calculate scaling factor (should be close to linear)
    const ratio1 = results[1].duration / results[0].duration
    const ratio2 = results[2].duration / results[1].duration

    console.log(`Scaling ratios: ${ratio1.toFixed(2)}, ${ratio2.toFixed(2)}`)

    // Ratios should be close to 2:1 (linear scaling) and not 4:1 (quadratic)
    expect(ratio1).toBeLessThan(3)  // Not worse than 3x for 2x data
    expect(ratio2).toBeLessThan(3)
  })
})

describe('Performance Benchmarks - Validation Overhead', () => {
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

    // Create test people for relationship validation
    for (let i = 1; i <= 10; i++) {
      sqlite.prepare(`
        INSERT INTO people (id, first_name, last_name) VALUES (?, ?, ?)
      `).run(i, `Person${i}`, `LastName${i}`)
    }
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should validate person creation quickly (< 50ms)', async () => {
    const start = performance.now()

    await postPerson({
      request: {
        json: async () => ({
          firstName: 'Valid',
          lastName: 'Person',
          birthDate: '1980-01-01',
          deathDate: '2050-01-01',
          gender: 'male'
        })
      },
      locals: { db }
    })

    const duration = performance.now() - start

    console.log(`Person creation with validation: ${duration.toFixed(2)}ms`)

    expect(duration).toBeLessThan(50)
  })

  it('should validate and reject invalid person quickly (< 50ms)', async () => {
    const start = performance.now()

    await postPerson({
      request: {
        json: async () => ({
          firstName: '',  // Invalid - empty
          lastName: 'Person'
        })
      },
      locals: { db }
    })

    const duration = performance.now() - start

    console.log(`Person validation rejection: ${duration.toFixed(2)}ms`)

    expect(duration).toBeLessThan(50)
  })

  it('should validate relationship parent rules quickly (< 100ms)', async () => {
    // Create first mother relationship
    await postRelationship({
      request: {
        json: async () => ({
          person1Id: 1,
          person2Id: 2,
          type: 'mother'
        })
      },
      locals: { db }
    })

    const start = performance.now()

    // Attempt duplicate mother (should be rejected quickly)
    await postRelationship({
      request: {
        json: async () => ({
          person1Id: 1,
          person2Id: 3,
          type: 'mother'
        })
      },
      locals: { db }
    })

    const duration = performance.now() - start

    console.log(`Relationship validation (duplicate parent check): ${duration.toFixed(2)}ms`)

    expect(duration).toBeLessThan(100)
  })
})
