/**
 * Integration Tests for Merge Preview API Endpoint
 * Story #109: Merge Preview and Validation
 *
 * Tests POST /api/people/merge/preview endpoint
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { POST } from '../../../../routes/api/people/merge/preview/+server.js'
import { setupTestDatabase, createMockEvent } from '$lib/server/testHelpers.js'

describe('POST /api/people/merge/preview', () => {
  let db
  let sqlite

  beforeEach(async () => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // Setup test database
    await setupTestDatabase(sqlite, db)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should require sourceId and targetId in request body', async () => {
    const event = createMockEvent(db, {
      request: new Request('http://localhost/api/people/merge/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
    })

    const response = await POST(event)

    expect(response.status).toBe(400)
    const text = await response.text()
    expect(text).toContain('sourceId and targetId are required')
  })

  it('should return 404 when source person not found', async () => {
    const event = createMockEvent(db, {
      request: new Request('http://localhost/api/people/merge/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: 999, targetId: 1 })
      })
    })

    const response = await POST(event)

    expect(response.status).toBe(404)
    const text = await response.text()
    expect(text).toContain('Source person not found')
  })

  it('should return 404 when target person not found', async () => {
    // Insert source person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?)
    `).run('John', 'Smith', '1950')

    const event = createMockEvent(db, {
      request: new Request('http://localhost/api/people/merge/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: 1, targetId: 999 })
      })
    })

    const response = await POST(event)

    expect(response.status).toBe(404)
    const text = await response.text()
    expect(text).toContain('Target person not found')
  })

  it('should return merge preview with combined data', async () => {
    // Insert source person (less complete)
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?)
    `).run('John', 'Smith', '1950')

    // Insert target person (more complete)
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?)
    `).run('John', 'A. Smith', '1950-03-15')

    const event = createMockEvent(db, {
      request: new Request('http://localhost/api/people/merge/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: 1, targetId: 2 })
      })
    })

    const response = await POST(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.canMerge).toBe(true)
    expect(data.source.id).toBe(1)
    expect(data.target.id).toBe(2)
    expect(data.merged.lastName).toBe('A. Smith') // Longer wins
    expect(data.merged.birthDate).toBe('1950-03-15') // More specific wins
  })

  it('should detect gender mismatch validation error', async () => {
    // Insert source person (male)
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, gender)
      VALUES (?, ?, ?)
    `).run('John', 'Smith', 'male')

    // Insert target person (female)
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, gender)
      VALUES (?, ?, ?)
    `).run('Jane', 'Doe', 'female')

    const event = createMockEvent(db, {
      request: new Request('http://localhost/api/people/merge/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: 1, targetId: 2 })
      })
    })

    const response = await POST(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.canMerge).toBe(false)
    expect(data.validation.errors).toContain('Gender mismatch: Cannot merge male into female')
  })

  it('should detect relationship conflicts', async () => {
    // Insert people
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, gender)
      VALUES (?, ?, ?)
    `).run('John', 'Smith', 'male') // id=1 (source)

    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, gender)
      VALUES (?, ?, ?)
    `).run('John', 'Doe', 'male') // id=2 (target)

    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, gender)
      VALUES (?, ?, ?)
    `).run('Mary', 'Smith', 'female') // id=3 (source's mother)

    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, gender)
      VALUES (?, ?, ?)
    `).run('Jane', 'Doe', 'female') // id=4 (target's mother)

    // Create relationships - different mothers
    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
    `).run(3, 1, 'parentOf', 'mother')

    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
    `).run(4, 2, 'parentOf', 'mother')

    const event = createMockEvent(db, {
      request: new Request('http://localhost/api/people/merge/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: 1, targetId: 2 })
      })
    })

    const response = await POST(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.validation.conflictFields).toContain('mother')
    expect(data.validation.warnings).toContain('Both people have different mothers - merge will overwrite')
  })

  it('should list relationships to transfer', async () => {
    // Insert source person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name)
      VALUES (?, ?)
    `).run('John', 'Smith') // id=1

    // Insert target person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name)
      VALUES (?, ?)
    `).run('John', 'Doe') // id=2

    // Insert related person (child)
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name)
      VALUES (?, ?)
    `).run('Jane', 'Smith') // id=3

    // Create relationship to transfer
    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, parent_role)
      VALUES (?, ?, ?, ?)
    `).run(1, 3, 'parentOf', 'father')

    const event = createMockEvent(db, {
      request: new Request('http://localhost/api/people/merge/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: 1, targetId: 2 })
      })
    })

    const response = await POST(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.relationshipsToTransfer).toHaveLength(1)
    expect(data.relationshipsToTransfer[0].type).toBe('parentOf')
    expect(data.relationshipsToTransfer[0].parentRole).toBe('father')
  })

  it('should complete within 500ms for 50+ relationships', async () => {
    // Insert source and target people
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name)
      VALUES (?, ?)
    `).run('John', 'Source') // id=1

    sqlite.prepare(`
      INSERT INTO people (first_name, last_name)
      VALUES (?, ?)
    `).run('John', 'Target') // id=2

    // Create many related people and relationships
    for (let i = 0; i < 25; i++) {
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name)
        VALUES (?, ?)
      `).run(`Child${i}`, 'Smith')

      const childId = i + 3
      sqlite.prepare(`
        INSERT INTO relationships (person1_id, person2_id, type, parent_role)
        VALUES (?, ?, ?, ?)
      `).run(1, childId, 'parentOf', 'father')

      sqlite.prepare(`
        INSERT INTO relationships (person1_id, person2_id, type, parent_role)
        VALUES (?, ?, ?, ?)
      `).run(2, childId, 'parentOf', 'father')
    }

    const startTime = performance.now()

    const event = createMockEvent(db, {
      request: new Request('http://localhost/api/people/merge/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: 1, targetId: 2 })
      })
    })

    const response = await POST(event)
    const endTime = performance.now()

    expect(response.status).toBe(200)
    expect(endTime - startTime).toBeLessThan(500)
  })
})
