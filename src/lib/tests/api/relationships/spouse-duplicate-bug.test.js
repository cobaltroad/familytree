import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { people, relationships, users } from '$lib/db/schema.js'
import { POST } from '../../../../routes/api/relationships/+server.js'
import { eq } from 'drizzle-orm'
import { setupTestDatabase, createMockEvent } from '$lib/server/testHelpers.js'

/**
 * BUG REPRODUCTION TEST: Adding a spouse via QuickAddSpouse throws "relationship already exists" error
 *
 * This test reproduces the bug where creating bidirectional spouse relationships fails
 * because the duplicate check is too strict. When creating the second relationship
 * (spouse -> person), it incorrectly detects the first relationship (person -> spouse)
 * as a duplicate.
 *
 * Expected behavior:
 * - First relationship (person -> spouse) should succeed
 * - Second relationship (spouse -> person) should also succeed
 * - Both relationships should exist in the database
 *
 * Actual behavior (BUG):
 * - First relationship succeeds
 * - Second relationship fails with "This relationship already exists" error
 */
describe('BUG: Bidirectional Spouse Relationship Creation', () => {
  let sqlite
  let db
  let testUserId
  let person1Id
  let person2Id

  beforeEach(async () => {
    // Create in-memory SQLite database
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)

    // Setup test database with users table and default test user
    testUserId = await setupTestDatabase(sqlite, db)

    // Insert two people (who will become spouses)
    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, gender)
      VALUES (?, ?, ?)
    `).run('John', 'Doe', 'male')
    person1Id = sqlite.prepare('SELECT last_insert_rowid() as id').get().id

    sqlite.prepare(`
      INSERT INTO people (first_name, last_name, gender)
      VALUES (?, ?, ?)
    `).run('Jane', 'Doe', 'female')
    person2Id = sqlite.prepare('SELECT last_insert_rowid() as id').get().id
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should allow creating bidirectional spouse relationships without duplicate error', async () => {
    // Step 1: Create first relationship (person1 -> person2)
    const request1 = new Request('http://localhost/api/relationships', {
      method: 'POST',
      body: JSON.stringify({
        person1Id: person1Id,
        person2Id: person2Id,
        type: 'spouse',
        parentRole: null
      }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response1 = await POST({
      request: request1,
      ...createMockEvent(db)
    })

    expect(response1.status).toBe(201)
    const relationship1 = await response1.json()
    expect(relationship1.type).toBe('spouse')
    expect(relationship1.person1Id).toBe(person1Id)
    expect(relationship1.person2Id).toBe(person2Id)

    // Step 2: Create second relationship (person2 -> person1) - THIS SHOULD NOT FAIL
    const request2 = new Request('http://localhost/api/relationships', {
      method: 'POST',
      body: JSON.stringify({
        person1Id: person2Id,
        person2Id: person1Id,
        type: 'spouse',
        parentRole: null
      }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response2 = await POST({
      request: request2,
      ...createMockEvent(db)
    })

    // BUG: This currently fails with status 400 "This relationship already exists"
    // EXPECTED: Should succeed with status 201
    expect(response2.status).toBe(201)
    const relationship2 = await response2.json()
    expect(relationship2.type).toBe('spouse')
    expect(relationship2.person1Id).toBe(person2Id)
    expect(relationship2.person2Id).toBe(person1Id)

    // Verify both relationships exist in database
    const allRelationships = await db
      .select()
      .from(relationships)

    expect(allRelationships).toHaveLength(2)

    // Verify bidirectional structure
    const forward = allRelationships.find(r => r.person1Id === person1Id && r.person2Id === person2Id)
    const reverse = allRelationships.find(r => r.person1Id === person2Id && r.person2Id === person1Id)

    expect(forward).toBeDefined()
    expect(reverse).toBeDefined()
    expect(forward.type).toBe('spouse')
    expect(reverse.type).toBe('spouse')
  })

  it('should prevent creating duplicate spouse relationships in the SAME direction', async () => {
    // Create first relationship (person1 -> person2)
    const request1 = new Request('http://localhost/api/relationships', {
      method: 'POST',
      body: JSON.stringify({
        person1Id: person1Id,
        person2Id: person2Id,
        type: 'spouse',
        parentRole: null
      }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response1 = await POST({
      request: request1,
      ...createMockEvent(db)
    })

    expect(response1.status).toBe(201)

    // Try to create EXACT SAME relationship again (same direction)
    const request2 = new Request('http://localhost/api/relationships', {
      method: 'POST',
      body: JSON.stringify({
        person1Id: person1Id,
        person2Id: person2Id,
        type: 'spouse',
        parentRole: null
      }),
      headers: { 'Content-Type': 'application/json' }
    })

    const response2 = await POST({
      request: request2,
      ...createMockEvent(db)
    })

    // This SHOULD fail - we don't want exact duplicates
    expect(response2.status).toBe(400)
    const errorResponse = await response2.json()
    expect(errorResponse.error).toContain('already exists')
  })
})
