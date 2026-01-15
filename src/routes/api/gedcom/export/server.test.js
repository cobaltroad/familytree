/**
 * GEDCOM Export API Endpoint - Integration Tests
 * Story #96: Export Family Tree as GEDCOM
 *
 * Tests the GET /api/gedcom/export endpoint
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { GET } from './+server.js'
import { setupTestDatabase, createMockAuthenticatedEvent } from '$lib/server/testHelpers.js'
import { people, relationships } from '$lib/db/schema.js'

// Create a stable mock database for the "production scenario" test
// This avoids race conditions with other tests that modify the singleton db
// Using vi.hoisted ensures these are available when the mock factory runs
const { mockSingletonSqlite, mockSingletonDb } = vi.hoisted(() => {
  const Database = require('better-sqlite3')
  const { drizzle } = require('drizzle-orm/better-sqlite3')
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)
  return { mockSingletonSqlite: sqlite, mockSingletonDb: db }
})

// Track the user ID for the mock singleton db (set during first beforeEach)
let mockSingletonUserId = null

vi.mock('$lib/db/client.js', () => ({
  db: mockSingletonDb,
  sqlite: mockSingletonSqlite,
  reconnectDatabase: vi.fn()
}))

describe('GET /api/gedcom/export', () => {
  let sqlite, db, userId

  beforeEach(async () => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)
    userId = await setupTestDatabase(sqlite, db)

    // Initialize mock singleton db for "production scenario" test
    // This ensures the mocked singleton db has proper schema
    if (!mockSingletonUserId) {
      mockSingletonUserId = await setupTestDatabase(mockSingletonSqlite, mockSingletonDb)
    }
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should require authentication', async () => {
    const mockEvent = {
      request: new Request('http://localhost/api/gedcom/export?format=5.5.1'),
      locals: {
        db,
        getSession: async () => null // No session
      },
      url: new URL('http://localhost/api/gedcom/export?format=5.5.1')
    }

    const response = await GET(mockEvent)
    expect(response.status).toBe(401)
  })

  it('should export GEDCOM 5.5.1 file with proper headers', async () => {
    // Insert test data
    const [person1] = await db.insert(people).values({
      firstName: 'John',
      lastName: 'Smith',
      gender: 'male',
      birthDate: '1950-01-15',
      deathDate: null,
      photoUrl: null,
      userId
    }).returning()

    const mockEvent = createMockAuthenticatedEvent(db, null, {
      request: new Request('http://localhost/api/gedcom/export?format=5.5.1'),
      url: new URL('http://localhost/api/gedcom/export?format=5.5.1')
    })

    const response = await GET(mockEvent)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/x-gedcom')
    expect(response.headers.get('Content-Disposition')).toMatch(/attachment; filename="familytree_\d{8}\.ged"/)
  })

  it('should export all individuals as INDI records', async () => {
    // Insert test people
    await db.insert(people).values([
      {
        firstName: 'John',
        lastName: 'Smith',
        gender: 'male',
        birthDate: '1950-01-15',
        deathDate: null,
        photoUrl: null,
        userId
      },
      {
        firstName: 'Jane',
        lastName: 'Doe',
        gender: 'female',
        birthDate: '1952-03-20',
        deathDate: null,
        photoUrl: null,
        userId
      }
    ])

    const mockEvent = createMockAuthenticatedEvent(db, null, {
      request: new Request('http://localhost/api/gedcom/export?format=5.5.1'),
      url: new URL('http://localhost/api/gedcom/export?format=5.5.1')
    })

    const response = await GET(mockEvent)
    const gedcomContent = await response.text()

    expect(gedcomContent).toContain('0 @I1@ INDI')
    expect(gedcomContent).toContain('1 NAME John /Smith/')
    expect(gedcomContent).toContain('0 @I2@ INDI')
    expect(gedcomContent).toContain('1 NAME Jane /Doe/')
  })

  it('should export relationships as FAM records', async () => {
    // Insert test people
    const [person1] = await db.insert(people).values({
      firstName: 'John',
      lastName: 'Smith',
      gender: 'male',
      birthDate: '1950-01-15',
      deathDate: null,
      photoUrl: null,
      userId
    }).returning()

    const [person2] = await db.insert(people).values({
      firstName: 'Jane',
      lastName: 'Doe',
      gender: 'female',
      birthDate: '1952-03-20',
      deathDate: null,
      photoUrl: null,
      userId
    }).returning()

    const [person3] = await db.insert(people).values({
      firstName: 'Alice',
      lastName: 'Smith',
      gender: 'female',
      birthDate: '1975-06-10',
      deathDate: null,
      photoUrl: null,
      userId
    }).returning()

    // Create spouse relationship
    await db.insert(relationships).values({
      person1Id: person1.id,
      person2Id: person2.id,
      type: 'spouse',
      userId
    })

    // Create parent-child relationships
    await db.insert(relationships).values([
      {
        person1Id: person1.id,
        person2Id: person3.id,
        type: 'parentOf',
        parentRole: 'father',
        userId
      },
      {
        person1Id: person2.id,
        person2Id: person3.id,
        type: 'parentOf',
        parentRole: 'mother',
        userId
      }
    ])

    const mockEvent = createMockAuthenticatedEvent(db, null, {
      request: new Request('http://localhost/api/gedcom/export?format=5.5.1'),
      url: new URL('http://localhost/api/gedcom/export?format=5.5.1')
    })

    const response = await GET(mockEvent)
    const gedcomContent = await response.text()

    // Should have FAM record with husband, wife, and child
    expect(gedcomContent).toContain('0 @F1@ FAM')
    expect(gedcomContent).toContain('1 HUSB @I1@')
    expect(gedcomContent).toContain('1 WIFE @I2@')
    expect(gedcomContent).toContain('1 CHIL @I3@')
  })

  it('should include header with GEDCOM version 5.5.1', async () => {
    const mockEvent = createMockAuthenticatedEvent(db, null, {
      request: new Request('http://localhost/api/gedcom/export?format=5.5.1'),
      url: new URL('http://localhost/api/gedcom/export?format=5.5.1')
    })

    const response = await GET(mockEvent)
    const gedcomContent = await response.text()

    expect(gedcomContent).toContain('0 HEAD')
    expect(gedcomContent).toContain('1 GEDC')
    expect(gedcomContent).toContain('2 VERS 5.5.1')
    expect(gedcomContent).toContain('1 CHAR UTF-8')
    expect(gedcomContent).toContain('1 SOUR FamilyTree App')
  })

  it('should export GEDCOM 7.0 when format=7.0', async () => {
    await db.insert(people).values({
      firstName: 'John',
      lastName: 'Smith',
      gender: 'male',
      birthDate: null,
      deathDate: null,
      photoUrl: null,
      userId
    })

    const mockEvent = createMockAuthenticatedEvent(db, null, {
      request: new Request('http://localhost/api/gedcom/export?format=7.0'),
      url: new URL('http://localhost/api/gedcom/export?format=7.0')
    })

    const response = await GET(mockEvent)
    const gedcomContent = await response.text()

    expect(gedcomContent).toContain('2 VERS 7.0')
  })

  it('should default to GEDCOM 5.5.1 if format not specified', async () => {
    const mockEvent = createMockAuthenticatedEvent(db, null, {
      request: new Request('http://localhost/api/gedcom/export'),
      url: new URL('http://localhost/api/gedcom/export')
    })

    const response = await GET(mockEvent)
    const gedcomContent = await response.text()

    expect(gedcomContent).toContain('2 VERS 5.5.1')
  })

  it('should include trailer', async () => {
    const mockEvent = createMockAuthenticatedEvent(db, null, {
      request: new Request('http://localhost/api/gedcom/export?format=5.5.1'),
      url: new URL('http://localhost/api/gedcom/export?format=5.5.1')
    })

    const response = await GET(mockEvent)
    const gedcomContent = await response.text()

    expect(gedcomContent).toContain('0 TRLR')
  })

  it('should only export authenticated user\'s data', async () => {
    // Insert data for user 1
    await db.insert(people).values({
      firstName: 'User1Person',
      lastName: 'Smith',
      gender: 'male',
      birthDate: null,
      deathDate: null,
      photoUrl: null,
      userId: userId
    })

    // Create another user
    const result = sqlite.prepare(`
      INSERT INTO users (email, name, provider)
      VALUES (?, ?, ?)
    `).run('other@example.com', 'Other User', 'test')
    const otherUserId = result.lastInsertRowid

    // Insert data for user 2
    await db.insert(people).values({
      firstName: 'User2Person',
      lastName: 'Doe',
      gender: 'female',
      birthDate: null,
      deathDate: null,
      photoUrl: null,
      userId: otherUserId
    })

    // Export as user 1
    const mockEvent = createMockAuthenticatedEvent(db, null, {
      request: new Request('http://localhost/api/gedcom/export?format=5.5.1'),
      url: new URL('http://localhost/api/gedcom/export?format=5.5.1')
    })

    const response = await GET(mockEvent)
    const gedcomContent = await response.text()

    // Should only include user 1's data
    expect(gedcomContent).toContain('User1Person')
    expect(gedcomContent).not.toContain('User2Person')
  })

  it('should include photo URLs in OBJE records', async () => {
    await db.insert(people).values({
      firstName: 'John',
      lastName: 'Smith',
      gender: 'male',
      birthDate: null,
      deathDate: null,
      photoUrl: 'https://example.com/photos/john.jpg',
      userId
    })

    const mockEvent = createMockAuthenticatedEvent(db, null, {
      request: new Request('http://localhost/api/gedcom/export?format=5.5.1'),
      url: new URL('http://localhost/api/gedcom/export?format=5.5.1')
    })

    const response = await GET(mockEvent)
    const gedcomContent = await response.text()

    expect(gedcomContent).toContain('1 OBJE')
    expect(gedcomContent).toContain('2 FILE https://example.com/photos/john.jpg')
  })

  it('should include birth and death dates', async () => {
    await db.insert(people).values({
      firstName: 'John',
      lastName: 'Smith',
      gender: 'male',
      birthDate: '1950-01-15',
      deathDate: '2020-03-10',
      photoUrl: null,
      userId
    })

    const mockEvent = createMockAuthenticatedEvent(db, null, {
      request: new Request('http://localhost/api/gedcom/export?format=5.5.1'),
      url: new URL('http://localhost/api/gedcom/export?format=5.5.1')
    })

    const response = await GET(mockEvent)
    const gedcomContent = await response.text()

    expect(gedcomContent).toContain('1 BIRT')
    expect(gedcomContent).toContain('2 DATE 15 JAN 1950')
    expect(gedcomContent).toContain('1 DEAT')
    expect(gedcomContent).toContain('2 DATE 10 MAR 2020')
  })

  it('should generate filename with current date', async () => {
    const mockEvent = createMockAuthenticatedEvent(db, null, {
      request: new Request('http://localhost/api/gedcom/export?format=5.5.1'),
      url: new URL('http://localhost/api/gedcom/export?format=5.5.1')
    })

    const response = await GET(mockEvent)
    const contentDisposition = response.headers.get('Content-Disposition')

    // Should match pattern: familytree_YYYYMMDD.ged
    expect(contentDisposition).toMatch(/attachment; filename="familytree_\d{8}\.ged"/)
  })

  it('should handle empty family tree', async () => {
    // No people inserted

    const mockEvent = createMockAuthenticatedEvent(db, null, {
      request: new Request('http://localhost/api/gedcom/export?format=5.5.1'),
      url: new URL('http://localhost/api/gedcom/export?format=5.5.1')
    })

    const response = await GET(mockEvent)
    const gedcomContent = await response.text()

    // Should still have header and trailer
    expect(gedcomContent).toContain('0 HEAD')
    expect(gedcomContent).toContain('0 TRLR')
    // Should not have any INDI or FAM records
    expect(gedcomContent).not.toContain('0 @I')
    expect(gedcomContent).not.toContain('0 @F')
  })

  it('should work when event.locals.db is undefined (production scenario)', async () => {
    // BUG REPRODUCTION TEST
    // In production, event.locals.db is undefined because hooks.server.js doesn't set it.
    // The endpoint should fall back to the singleton db import like other API endpoints do.
    //
    // This test verifies the fix: endpoint uses "event.locals?.db || db" instead of "event.locals.db"
    // Before fix: TypeError: Cannot read properties of undefined (reading 'select')
    // After fix: Returns valid GEDCOM file (even if empty for the test user)
    //
    // NOTE: We use mockSingletonUserId because the endpoint will fall back to the mocked
    // singleton db, which has this user ID (not the per-test userId)

    // Create mock event WITHOUT locals.db (simulating production environment)
    // In production, event.locals only has getSession(), not db
    const mockSession = {
      user: {
        id: mockSingletonUserId, // Must match user in mocked singleton db
        email: 'test@example.com',
        name: 'Test User'
      }
    }

    const mockEvent = {
      locals: {
        getSession: async () => mockSession
        // NOTE: No db property here - this is the production scenario!
      },
      request: new Request('http://localhost/api/gedcom/export?format=5.5.1'),
      url: new URL('http://localhost/api/gedcom/export?format=5.5.1')
    }

    const response = await GET(mockEvent)

    // Should not return 500 Internal Server Error
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/x-gedcom')

    // Should return valid GEDCOM structure (header, submitter, trailer)
    // NOTE: Content may be empty (no INDI/FAM records) because the singleton db
    // points to production database which doesn't have this test user's data.
    // The important thing is that it doesn't crash.
    const gedcomContent = await response.text()
    expect(gedcomContent).toContain('0 HEAD')
    expect(gedcomContent).toContain('0 @S1@ SUBM')
    expect(gedcomContent).toContain('1 NAME Test User')
    expect(gedcomContent).toContain('0 TRLR')
  })
})
