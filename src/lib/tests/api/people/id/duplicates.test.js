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
import { setupTestDatabase, createMockAuthenticatedEvent } from '$lib/server/testHelpers.js'

describe('GET /api/people/[id]/duplicates', () => {
  let db
  let sqlite
  let userId
  let userId2

  beforeEach(async () => {
    // Create in-memory database for testing
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // Setup test database with users table and default test user
    userId = await setupTestDatabase(sqlite, db)

    // Create second user for data isolation tests
    const result2 = sqlite.prepare(`
      INSERT INTO users (email, name, provider)
      VALUES (?, ?, ?)
    `).run('user2@example.com', 'User Two', 'test')
    userId2 = result2.lastInsertRowid
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should require authentication', async () => {
    // Mock event without authentication
    const event = {
      locals: { db },
      params: { id: '1' }
    }

    const response = await GET(event)

    expect(response.status).toBe(401)
  })

  it('should return 404 when person does not exist', async () => {
    const event = createMockAuthenticatedEvent(db)
    event.params = { id: '999' }

    const response = await GET(event)

    expect(response.status).toBe(404)
  })

  it('should return 404 when person belongs to different user', async () => {
    // Insert person for user 2
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, user_id)
      VALUES (?, ?, ?, ?)
    `).run('John', 'Smith', '1950-01-15', userId2)

    // Try to access as user 1
    const event = createMockAuthenticatedEvent(db)
    event.params = { id: '1' }

    const response = await GET(event)

    expect(response.status).toBe(404)
  })

  it('should return empty array when no duplicates exist', async () => {
    // Insert target person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, user_id)
      VALUES (?, ?, ?, ?)
    `).run('John', 'Smith', '1950-01-15', userId)

    // Insert different person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, user_id)
      VALUES (?, ?, ?, ?)
    `).run('Jane', 'Doe', '1960-05-20', userId)

    const event = createMockAuthenticatedEvent(db)
    event.params = { id: '1' }

    const response = await GET(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('should find duplicates for specific person', async () => {
    // Insert target person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, user_id)
      VALUES (?, ?, ?, ?)
    `).run('John', 'Smith', '1950-01-15', userId)

    // Insert duplicate
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, user_id)
      VALUES (?, ?, ?, ?)
    `).run('John', 'Smith', '1950-01-15', userId)

    // Insert non-duplicate
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, user_id)
      VALUES (?, ?, ?, ?)
    `).run('Jane', 'Doe', '1960-05-20', userId)

    const event = createMockAuthenticatedEvent(db)
    event.params = { id: '1' }

    const response = await GET(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].person.id).toBe(2)
    expect(data[0].confidence).toBeGreaterThan(70)
    expect(data[0].matchingFields).toContain('name')
    expect(data[0].matchingFields).toContain('birthDate')
  })

  it('should exclude the target person from results', async () => {
    // Insert target person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, user_id)
      VALUES (?, ?, ?, ?)
    `).run('John', 'Smith', '1950-01-15', userId)

    const event = createMockAuthenticatedEvent(db)
    event.params = { id: '1' }

    const response = await GET(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    // Should not return the target person as a duplicate of itself
    expect(data.every(d => d.person.id !== 1)).toBe(true)
  })

  it('should sort results by confidence (highest first)', async () => {
    // Insert target person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, user_id)
      VALUES (?, ?, ?, ?)
    `).run('John', 'Smith', '1950-01-15', userId)

    // Insert exact duplicate (higher confidence)
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, user_id)
      VALUES (?, ?, ?, ?)
    `).run('John', 'Smith', '1950-01-15', userId)

    // Insert close duplicate (lower confidence)
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, user_id)
      VALUES (?, ?, ?, ?)
    `).run('Jon', 'Smith', '1950-01-15', userId)

    const event = createMockAuthenticatedEvent(db)
    event.params = { id: '1' }

    const response = await GET(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.length).toBeGreaterThanOrEqual(2)
    // First result should have highest confidence
    expect(data[0].confidence).toBeGreaterThanOrEqual(data[1].confidence)
  })

  it('should respect custom confidence threshold via query parameter', async () => {
    // Insert target person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, user_id)
      VALUES (?, ?, ?, ?)
    `).run('John', 'Smith', '1950-01-15', userId)

    // Insert exact duplicate (80% confidence)
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, user_id)
      VALUES (?, ?, ?, ?)
    `).run('John', 'Smith', '1950-01-15', userId)

    // Insert close duplicate (75% confidence)
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, user_id)
      VALUES (?, ?, ?, ?)
    `).run('Jon', 'Smith', '1950-01-15', userId)

    // Default threshold (70%)
    const event1 = createMockAuthenticatedEvent(db)
    event1.params = { id: '1' }
    const response1 = await GET(event1)
    const data1 = await response1.json()
    expect(data1).toHaveLength(2) // Both above 70%

    // High threshold (80%)
    const event2 = {
      ...createMockAuthenticatedEvent(db),
      params: { id: '1' },
      url: new URL('http://localhost/api/people/1/duplicates?threshold=80')
    }
    const response2 = await GET(event2)
    const data2 = await response2.json()
    expect(data2).toHaveLength(1) // Only exact match
  })

  it('should respect limit parameter for pagination', async () => {
    // Insert target person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, user_id)
      VALUES (?, ?, ?, ?)
    `).run('John', 'Smith', '1950-01-15', userId)

    // Insert 3 duplicates
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, user_id)
      VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)
    `).run(
      'John', 'Smith', '1950-01-15', userId,
      'John', 'Smith', '1950-01-15', userId,
      'John', 'Smith', '1950-01-15', userId
    )

    const event = {
      ...createMockAuthenticatedEvent(db),
      params: { id: '1' },
      url: new URL('http://localhost/api/people/1/duplicates?limit=2')
    }
    const response = await GET(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(2) // Limited to 2 results
  })

  it('should enforce data isolation (exclude other users\' people)', async () => {
    // Insert target person for user 1
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, user_id)
      VALUES (?, ?, ?, ?)
    `).run('John', 'Smith', '1950-01-15', userId)

    // Insert duplicate for user 1
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, user_id)
      VALUES (?, ?, ?, ?)
    `).run('John', 'Smith', '1950-01-15', userId)

    // Insert matching person for user 2 (should be excluded)
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, user_id)
      VALUES (?, ?, ?, ?)
    `).run('John', 'Smith', '1950-01-15', userId2)

    const event = createMockAuthenticatedEvent(db)
    event.params = { id: '1' }

    const response = await GET(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1) // Only user 1's duplicate
    expect(data[0].person.id).toBe(2) // Not person 3 (from user 2)
  })

  it('should respect view_all_records flag when true', async () => {
    // Enable view_all_records for test user
    sqlite.prepare(`
      UPDATE users SET view_all_records = 1 WHERE id = ?
    `).run(userId)

    // Insert target person for user 1
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, user_id)
      VALUES (?, ?, ?, ?)
    `).run('John', 'Smith', '1950-01-15', userId)

    // Insert duplicate for user 1
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, user_id)
      VALUES (?, ?, ?, ?)
    `).run('John', 'Smith', '1950-01-15', userId)

    // Insert matching person for user 2 (should be included with flag)
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, user_id)
      VALUES (?, ?, ?, ?)
    `).run('John', 'Smith', '1950-01-15', userId2)

    const event = createMockAuthenticatedEvent(db)
    event.params = { id: '1' }

    const response = await GET(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(2) // Both user 1 and user 2 duplicates
  })
})
