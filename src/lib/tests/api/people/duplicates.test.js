/**
 * Integration Tests for Duplicate Detection API Endpoints
 * Story #108: Duplicate Detection Service (Foundation)
 *
 * Tests GET /api/people/duplicates endpoint
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { GET } from '../../../../routes/api/people/duplicates/+server.js'
import { setupTestDatabase, createMockEvent } from '$lib/server/testHelpers.js'

describe('GET /api/people/duplicates', () => {
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

  it('should return empty array when no duplicates exist', async () => {
    // Insert distinct people (no duplicates)
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?)
    `).run('John', 'Smith', '1950-01-15')

    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?)
    `).run('Jane', 'Doe', '1960-05-20')

    const event = createMockEvent(db)
    const response = await GET(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('should detect duplicates', async () => {
    // Insert duplicate people
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?)
    `).run('John', 'Smith', '1950-01-15')

    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?)
    `).run('John', 'Smith', '1950-01-15')

    const event = createMockEvent(db)
    const response = await GET(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].person1.id).toBe(1)
    expect(data[0].person2.id).toBe(2)
    expect(data[0].confidence).toBeGreaterThan(70)
    expect(data[0].matchingFields).toContain('name')
    expect(data[0].matchingFields).toContain('birthDate')
  })

  it('should return multiple duplicate pairs', async () => {
    // Insert 3 pairs of duplicates
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?), (?, ?, ?), (?, ?, ?), (?, ?, ?)
    `).run(
      'John', 'Smith', '1950-01-15',
      'John', 'Smith', '1950-01-15',
      'Jane', 'Doe', '1960-05-20',
      'Jane', 'Doe', '1960-05-20',
      'Bob', 'Jones', '1945-01-01',
      'Bob', 'Jones', '1945-01-01'
    )

    const event = createMockEvent(db)
    const response = await GET(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(3) // 3 pairs
  })

  it('should sort results by confidence (highest first)', async () => {
    // Insert people with varying match confidence
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)
    `).run(
      'John', 'Smith', '1950-01-15',  // id=1
      'John', 'Smith', '1950-01-15',  // id=2 (exact match with 1 = 80%)
      'Jon', 'Smith', '1950-01-15'    // id=3 (close match = 75%)
    )

    const event = createMockEvent(db)
    const response = await GET(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    // First result should have highest confidence
    expect(data[0].confidence).toBeGreaterThanOrEqual(data[1].confidence)
  })

  it('should respect custom confidence threshold via query parameter', async () => {
    // Insert people with varying match confidence
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)
    `).run(
      'John', 'Smith', '1950-01-15',  // id=1
      'John', 'Smith', '1950-01-15',  // id=2 (80% match)
      'Jon', 'Smith', '1950-01-15'    // id=3 (75% match)
    )

    // Default threshold (70%)
    const event1 = createMockEvent(db)
    const response1 = await GET(event1)
    const data1 = await response1.json()
    expect(data1.length).toBeGreaterThanOrEqual(2) // All pairs above 70%

    // High threshold (80%)
    const event2 = {
      ...createMockEvent(db),
      url: new URL('http://localhost/api/people/duplicates?threshold=80')
    }
    const response2 = await GET(event2)
    const data2 = await response2.json()
    expect(data2).toHaveLength(1) // Only exact match pair
  })

  it('should respect limit parameter for pagination', async () => {
    // Insert multiple duplicate pairs
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date)
      VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?), (?, ?, ?), (?, ?, ?), (?, ?, ?)
    `).run(
      'John', 'Smith', '1950-01-15',
      'John', 'Smith', '1950-01-15',
      'Jane', 'Doe', '1960-05-20',
      'Jane', 'Doe', '1960-05-20',
      'Bob', 'Jones', '1945-01-01',
      'Bob', 'Jones', '1945-01-01'
    )

    const event = {
      ...createMockEvent(db),
      url: new URL('http://localhost/api/people/duplicates?limit=2')
    }
    const response = await GET(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(2) // Limited to 2 results
  })
})
