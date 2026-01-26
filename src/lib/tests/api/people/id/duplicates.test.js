/**
 * Integration Tests for Single Person Duplicate Detection API
 * Story #108: Duplicate Detection Service (Foundation)
 *
 * Tests GET /api/people/[id]/duplicates endpoint
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { GET } from '../../../../../routes/api/people/[id]/duplicates/+server.js'
import { setupTestDatabase, createMockEvent } from '$lib/server/testHelpers.js'

describe('GET /api/people/[id]/duplicates', () => {
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

  it('should return 404 when person does not exist', async () => {
    const event = createMockEvent(db)
    event.params = { id: '999' }

    const response = await GET(event)

    expect(response.status).toBe(404)
  })

  it('should return empty array when no duplicates exist', async () => {
    // Insert target person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?)
    `).run('John', 'Smith', '1950-01-15')

    // Insert different person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?)
    `).run('Jane', 'Doe', '1960-05-20')

    const event = createMockEvent(db)
    event.params = { id: '1' }

    const response = await GET(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('should find duplicates for specific person', async () => {
    // Insert target person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?)
    `).run('John', 'Smith', '1950-01-15')

    // Insert duplicate person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?)
    `).run('John', 'Smith', '1950-01-15')

    // Insert different person (should not be in results)
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?)
    `).run('Jane', 'Doe', '1960-05-20')

    const event = createMockEvent(db)
    event.params = { id: '1' }

    const response = await GET(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].person.id).toBe(2)
    expect(data[0].confidence).toBeGreaterThan(70)
  })

  it('should exclude the target person from results', async () => {
    // Insert target person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?)
    `).run('John', 'Smith', '1950-01-15')

    const event = createMockEvent(db)
    event.params = { id: '1' }

    const response = await GET(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('should sort results by confidence (highest first)', async () => {
    // Insert target person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?)
    `).run('John', 'Smith', '1950-01-15')

    // Insert exact match (high confidence)
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?)
    `).run('John', 'Smith', '1950-01-15')

    // Insert close match (lower confidence)
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?)
    `).run('Jon', 'Smith', '1950-01-15')

    const event = createMockEvent(db)
    event.params = { id: '1' }

    const response = await GET(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.length).toBeGreaterThanOrEqual(1)
    // First result should have highest confidence
    if (data.length > 1) {
      expect(data[0].confidence).toBeGreaterThanOrEqual(data[1].confidence)
    }
  })

  it('should respect custom confidence threshold via query parameter', async () => {
    // Insert target person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?)
    `).run('John', 'Smith', '1950-01-15')

    // Insert exact match (high confidence ~80%)
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?)
    `).run('John', 'Smith', '1950-01-15')

    // Insert close match (lower confidence ~75%)
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?)
    `).run('Jon', 'Smith', '1950-01-15')

    // Default threshold (70%)
    const event1 = createMockEvent(db)
    event1.params = { id: '1' }
    const response1 = await GET(event1)
    const data1 = await response1.json()
    expect(data1.length).toBeGreaterThanOrEqual(1)

    // High threshold (80%)
    const event2 = {
      ...createMockEvent(db),
      params: { id: '1' },
      url: new URL('http://localhost/api/people/1/duplicates?threshold=80')
    }
    const response2 = await GET(event2)
    const data2 = await response2.json()
    expect(data2.length).toBeLessThanOrEqual(data1.length)
  })

  it('should respect limit parameter for pagination', async () => {
    // Insert target person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?)
    `).run('John', 'Smith', '1950-01-15')

    // Insert multiple duplicates
    for (let i = 0; i < 5; i++) {
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, birth_date)
        VALUES (?, ?, ?)
      `).run('John', 'Smith', '1950-01-15')
    }

    const event = {
      ...createMockEvent(db),
      params: { id: '1' },
      url: new URL('http://localhost/api/people/1/duplicates?limit=2')
    }
    const response = await GET(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(2)
  })
})
