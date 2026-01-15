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
import { setupTestDatabase, createMockAuthenticatedEvent, createMockSession } from '$lib/server/testHelpers.js'

describe('POST /api/people/merge/preview', () => {
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

    // Create second user for cross-user validation tests
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
    const event = {
      locals: { db },
      request: new Request('http://localhost/api/people/merge/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: 1, targetId: 2 })
      })
    }

    const response = await POST(event)

    expect(response.status).toBe(401)
  })

  it('should require sourceId and targetId in request body', async () => {
    const session = createMockSession(userId, 'test@example.com', 'Test User')
    const event = createMockAuthenticatedEvent(db, session, {
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
    const session = createMockSession(userId, 'test@example.com', 'Test User')
    const event = createMockAuthenticatedEvent(db, session, {
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
      INSERT INTO people (first_name, last_name, birth_date, user_id)
      VALUES (?, ?, ?, ?)
    `).run('John', 'Smith', '1950', userId)

    const session = createMockSession(userId, 'test@example.com', 'Test User')
    const event = createMockAuthenticatedEvent(db, session, {
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
    // Insert source person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run('John', 'Smith', '1950', 'male', userId)

    // Insert target person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender, photo_url, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('John', 'A. Smith', '1950-03-15', 'male', 'http://example.com/photo.jpg', userId)

    const session = createMockSession(userId, 'test@example.com', 'Test User')
    const event = createMockAuthenticatedEvent(db, session, {
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
    expect(data.validation.errors).toEqual([])
    expect(data.source.firstName).toBe('John')
    expect(data.target.firstName).toBe('John')
    expect(data.merged.lastName).toBe('A. Smith')
    expect(data.merged.birthDate).toBe('1950-03-15')
    expect(data.merged.photoUrl).toBe('http://example.com/photo.jpg')
  })

  it('should detect gender mismatch validation error', async () => {
    // Insert source person (male)
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run('John', 'Smith', '1950', 'male', userId)

    // Insert target person (female)
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run('Jane', 'Smith', '1950', 'female', userId)

    const session = createMockSession(userId, 'test@example.com', 'Test User')
    const event = createMockAuthenticatedEvent(db, session, {
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

  it('should prevent merging user default person', async () => {
    // Insert source person (will be default person)
    const result1 = sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run('John', 'Smith', '1950', 'male', userId)
    const sourcePersonId = result1.lastInsertRowid

    // Set as default person for user
    sqlite.prepare(`
      UPDATE users SET default_person_id = ? WHERE id = ?
    `).run(sourcePersonId, userId)

    // Insert target person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run('John', 'A. Smith', '1950-03-15', 'male', userId)

    const session = createMockSession(userId, 'test@example.com', 'Test User')
    const event = createMockAuthenticatedEvent(db, session, {
      request: new Request('http://localhost/api/people/merge/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: sourcePersonId, targetId: 2 })
      })
    })

    const response = await POST(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.canMerge).toBe(false)
    expect(data.validation.errors).toContain('Cannot merge your profile person into another person')
  })

  it('should prevent cross-user merge', async () => {
    // Insert source person for user 1
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run('John', 'Smith', '1950', 'male', userId)

    // Insert target person for user 2
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run('John', 'Smith', '1950', 'male', userId2)

    const session = createMockSession(userId, 'test@example.com', 'Test User')
    const event = createMockAuthenticatedEvent(db, session, {
      request: new Request('http://localhost/api/people/merge/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: 1, targetId: 2 })
      })
    })

    const response = await POST(event)

    // Security fix: Now returns 404 instead of exposing another user's data
    // This is more secure - we don't reveal that the record exists
    expect(response.status).toBe(404)
    const text = await response.text()
    expect(text).toContain('Target person not found')
  })

  it('should detect relationship conflicts', async () => {
    // Insert source person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run('John', 'Smith', '1950', 'male', userId)

    // Insert target person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run('John', 'A. Smith', '1950-03-15', 'male', userId)

    // Insert Mary as mother of source
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, user_id)
      VALUES (?, ?, ?)
    `).run('Mary', 'Smith', userId)

    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, parent_role, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(3, 1, 'parentOf', 'mother', userId)

    // Insert Sarah as mother of target
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, user_id)
      VALUES (?, ?, ?)
    `).run('Sarah', 'Johnson', userId)

    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, parent_role, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(4, 2, 'parentOf', 'mother', userId)

    const session = createMockSession(userId, 'test@example.com', 'Test User')
    const event = createMockAuthenticatedEvent(db, session, {
      request: new Request('http://localhost/api/people/merge/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: 1, targetId: 2 })
      })
    })

    const response = await POST(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.canMerge).toBe(true) // Conflicts are warnings, not blockers
    expect(data.validation.warnings).toContain('Both people have different mothers - merge will overwrite')
    expect(data.validation.conflictFields).toContain('mother')
  })

  it('should list relationships to transfer', async () => {
    // Insert source person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run('John', 'Smith', '1950', 'male', userId)

    // Insert target person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run('John', 'A. Smith', '1950-03-15', 'male', userId)

    // Insert mother for source
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, user_id)
      VALUES (?, ?, ?)
    `).run('Mary', 'Smith', userId)

    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, parent_role, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(3, 1, 'parentOf', 'mother', userId)

    // Insert spouse for source
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, user_id)
      VALUES (?, ?, ?)
    `).run('Jane', 'Doe', userId)

    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, user_id)
      VALUES (?, ?, ?, ?)
    `).run(1, 4, 'spouse', userId)

    // Insert father for target
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, user_id)
      VALUES (?, ?, ?)
    `).run('Robert', 'Smith', userId)

    sqlite.prepare(`
      INSERT INTO relationships (person1_id, person2_id, type, parent_role, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(5, 2, 'parentOf', 'father', userId)

    const session = createMockSession(userId, 'test@example.com', 'Test User')
    const event = createMockAuthenticatedEvent(db, session, {
      request: new Request('http://localhost/api/people/merge/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: 1, targetId: 2 })
      })
    })

    const response = await POST(event)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.relationshipsToTransfer).toHaveLength(2)
    expect(data.existingRelationships).toHaveLength(1)
  })

  it('should complete within 500ms for 50+ relationships', async () => {
    // Insert source person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run('John', 'Smith', '1950', 'male', userId)

    // Insert target person
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, birth_date, gender, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run('John', 'A. Smith', '1950-03-15', 'male', userId)

    // Insert 25 children for source
    for (let i = 0; i < 25; i++) {
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, user_id)
        VALUES (?, ?, ?)
      `).run(`Child${i}`, 'Smith', userId)

      sqlite.prepare(`
        INSERT INTO relationships (person1_id, person2_id, type, parent_role, user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(1, i + 3, 'parentOf', 'father', userId)
    }

    // Insert 25 children for target
    for (let i = 0; i < 25; i++) {
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, user_id)
        VALUES (?, ?, ?)
      `).run(`Child${i + 25}`, 'Smith', userId)

      sqlite.prepare(`
        INSERT INTO relationships (person1_id, person2_id, type, parent_role, user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(2, i + 28, 'parentOf', 'father', userId)
    }

    const session = createMockSession(userId, 'test@example.com', 'Test User')
    const event = createMockAuthenticatedEvent(db, session, {
      request: new Request('http://localhost/api/people/merge/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: 1, targetId: 2 })
      })
    })

    const startTime = Date.now()
    const response = await POST(event)
    const endTime = Date.now()

    expect(response.status).toBe(200)
    expect(endTime - startTime).toBeLessThan(500)
  })

  describe('Security: userId validation', () => {
    it('should return 404 when trying to access another users source person', async () => {
      // Insert source person for user 2
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, birth_date, gender, user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run('John', 'Smith', '1950', 'male', userId2)

      // Insert target person for user 1
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, birth_date, gender, user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run('Jane', 'Doe', '1955', 'female', userId)

      // User 1 tries to access user 2's person as source
      const session = createMockSession(userId, 'test@example.com', 'Test User')
      const event = createMockAuthenticatedEvent(db, session, {
        request: new Request('http://localhost/api/people/merge/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId: 1, targetId: 2 })
        })
      })

      const response = await POST(event)

      expect(response.status).toBe(404)
      const text = await response.text()
      expect(text).toContain('Source person not found')
    })

    it('should return 404 when trying to access another users target person', async () => {
      // Insert source person for user 1
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, birth_date, gender, user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run('John', 'Smith', '1950', 'male', userId)

      // Insert target person for user 2
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, birth_date, gender, user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run('Jane', 'Doe', '1955', 'female', userId2)

      // User 1 tries to access user 2's person as target
      const session = createMockSession(userId, 'test@example.com', 'Test User')
      const event = createMockAuthenticatedEvent(db, session, {
        request: new Request('http://localhost/api/people/merge/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId: 1, targetId: 2 })
        })
      })

      const response = await POST(event)

      expect(response.status).toBe(404)
      const text = await response.text()
      expect(text).toContain('Target person not found')
    })

    it('should not expose other users relationships in source relationships', async () => {
      // Insert source person for user 1
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, birth_date, gender, user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run('John', 'Smith', '1950', 'male', userId)

      // Insert target person for user 1
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, birth_date, gender, user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run('John', 'A. Smith', '1950-03-15', 'male', userId)

      // Insert parent for user 2
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, user_id)
        VALUES (?, ?, ?)
      `).run('Mary', 'Smith', userId2)

      // Create relationship between user 1's person and user 2's person
      // This represents a data integrity issue but shouldn't be exposed
      sqlite.prepare(`
        INSERT INTO relationships (person1_id, person2_id, type, parent_role, user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(3, 1, 'parentOf', 'mother', userId2)

      const session = createMockSession(userId, 'test@example.com', 'Test User')
      const event = createMockAuthenticatedEvent(db, session, {
        request: new Request('http://localhost/api/people/merge/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId: 1, targetId: 2 })
        })
      })

      const response = await POST(event)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Should not include relationships owned by other users
      expect(data.relationshipsToTransfer).toHaveLength(0)
      expect(data.existingRelationships).toHaveLength(0)
    })

    it('should not expose other users relationships in target relationships', async () => {
      // Insert source person for user 1
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, birth_date, gender, user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run('John', 'Smith', '1950', 'male', userId)

      // Insert target person for user 1
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, birth_date, gender, user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run('John', 'A. Smith', '1950-03-15', 'male', userId)

      // Insert parent for user 2
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, user_id)
        VALUES (?, ?, ?)
      `).run('Robert', 'Smith', userId2)

      // Create relationship between user 1's target and user 2's person
      sqlite.prepare(`
        INSERT INTO relationships (person1_id, person2_id, type, parent_role, user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(3, 2, 'parentOf', 'father', userId2)

      const session = createMockSession(userId, 'test@example.com', 'Test User')
      const event = createMockAuthenticatedEvent(db, session, {
        request: new Request('http://localhost/api/people/merge/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId: 1, targetId: 2 })
        })
      })

      const response = await POST(event)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Should not include relationships owned by other users
      expect(data.relationshipsToTransfer).toHaveLength(0)
      expect(data.existingRelationships).toHaveLength(0)
    })
  })
})
