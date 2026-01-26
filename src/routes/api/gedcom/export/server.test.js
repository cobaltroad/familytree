/**
 * GEDCOM Export API Endpoint - Integration Tests
 * Story #96: Export Family Tree as GEDCOM
 *
 * Tests the GET /api/gedcom/export endpoint
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { GET } from './+server.js'
import { setupTestDatabase, createMockEvent } from '$lib/server/testHelpers.js'
import { people, relationships } from '$lib/db/schema.js'

describe('GET /api/gedcom/export', () => {
  let sqlite, db

  beforeEach(async () => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)
    await setupTestDatabase(sqlite, db)
  })

  afterEach(() => {
    sqlite.close()
  })

  it('should export GEDCOM 5.5.1 file with proper headers', async () => {
    // Insert test data
    await db.insert(people).values({
      firstName: 'John',
      lastName: 'Smith',
      gender: 'male',
      birthDate: '1950-01-15',
      deathDate: null,
      photoUrl: null
    })

    const mockEvent = createMockEvent(db, {
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
        photoUrl: null
      },
      {
        firstName: 'Jane',
        lastName: 'Doe',
        gender: 'female',
        birthDate: '1952-03-20',
        deathDate: null,
        photoUrl: null
      }
    ])

    const mockEvent = createMockEvent(db, {
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
      photoUrl: null
    }).returning()

    const [person2] = await db.insert(people).values({
      firstName: 'Jane',
      lastName: 'Doe',
      gender: 'female',
      birthDate: '1952-03-20',
      deathDate: null,
      photoUrl: null
    }).returning()

    const [person3] = await db.insert(people).values({
      firstName: 'Alice',
      lastName: 'Smith',
      gender: 'female',
      birthDate: '1975-06-10',
      deathDate: null,
      photoUrl: null
    }).returning()

    // Create spouse relationship
    await db.insert(relationships).values({
      person1Id: person1.id,
      person2Id: person2.id,
      type: 'spouse'
    })

    // Create parent-child relationships
    await db.insert(relationships).values([
      {
        person1Id: person1.id,
        person2Id: person3.id,
        type: 'parentOf',
        parentRole: 'father'
      },
      {
        person1Id: person2.id,
        person2Id: person3.id,
        type: 'parentOf',
        parentRole: 'mother'
      }
    ])

    const mockEvent = createMockEvent(db, {
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
    const mockEvent = createMockEvent(db, {
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
      photoUrl: null
    })

    const mockEvent = createMockEvent(db, {
      request: new Request('http://localhost/api/gedcom/export?format=7.0'),
      url: new URL('http://localhost/api/gedcom/export?format=7.0')
    })

    const response = await GET(mockEvent)
    const gedcomContent = await response.text()

    expect(gedcomContent).toContain('2 VERS 7.0')
  })

  it('should default to GEDCOM 5.5.1 if format not specified', async () => {
    const mockEvent = createMockEvent(db, {
      request: new Request('http://localhost/api/gedcom/export'),
      url: new URL('http://localhost/api/gedcom/export')
    })

    const response = await GET(mockEvent)
    const gedcomContent = await response.text()

    expect(gedcomContent).toContain('2 VERS 5.5.1')
  })

  it('should include trailer', async () => {
    const mockEvent = createMockEvent(db, {
      request: new Request('http://localhost/api/gedcom/export?format=5.5.1'),
      url: new URL('http://localhost/api/gedcom/export?format=5.5.1')
    })

    const response = await GET(mockEvent)
    const gedcomContent = await response.text()

    expect(gedcomContent).toContain('0 TRLR')
  })

  it('should include photo URLs in OBJE records', async () => {
    await db.insert(people).values({
      firstName: 'John',
      lastName: 'Smith',
      gender: 'male',
      birthDate: null,
      deathDate: null,
      photoUrl: 'https://example.com/photos/john.jpg'
    })

    const mockEvent = createMockEvent(db, {
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
      photoUrl: null
    })

    const mockEvent = createMockEvent(db, {
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
    const mockEvent = createMockEvent(db, {
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

    const mockEvent = createMockEvent(db, {
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
})
