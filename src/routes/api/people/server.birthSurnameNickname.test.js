import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { setupTestDatabase, createMockEvent } from '$lib/server/testHelpers.js'
import { GET, POST } from './+server.js'
import { GET as GET_BY_ID, PUT, DELETE } from './[id]/+server.js'

describe('API Endpoints - Birth Surname and Nickname Support (AC3)', () => {
  let sqlite
  let db
  let userId

  beforeEach(async () => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)
    userId = await setupTestDatabase(sqlite, db)
  })

  afterEach(() => {
    sqlite.close()
  })

  describe('POST /api/people - Create Person', () => {
    it('should create person with birthSurname', async () => {
      const mockEvent = createMockEvent(db, {
        request: new Request('http://localhost/api/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'Jane',
            lastName: 'Smith',
            birthSurname: 'Jones'
          })
        })
      })

      const response = await POST(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.firstName).toBe('Jane')
      expect(data.lastName).toBe('Smith')
      expect(data.birthSurname).toBe('Jones')
    })

    it('should create person with nickname', async () => {
      const mockEvent = createMockEvent(db, {
        request: new Request('http://localhost/api/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'Robert',
            lastName: 'Johnson',
            nickname: 'Bob'
          })
        })
      })

      const response = await POST(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.firstName).toBe('Robert')
      expect(data.lastName).toBe('Johnson')
      expect(data.nickname).toBe('Bob')
    })

    it('should create person with both birthSurname and nickname', async () => {
      const mockEvent = createMockEvent(db, {
        request: new Request('http://localhost/api/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'Jane',
            lastName: 'Smith',
            birthSurname: 'Jones',
            nickname: 'JJ'
          })
        })
      })

      const response = await POST(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.birthSurname).toBe('Jones')
      expect(data.nickname).toBe('JJ')
    })

    it('should create person without birthSurname (null)', async () => {
      const mockEvent = createMockEvent(db, {
        request: new Request('http://localhost/api/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'John',
            lastName: 'Doe'
          })
        })
      })

      const response = await POST(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.birthSurname).toBeNull()
      expect(data.nickname).toBeNull()
    })

    it('should handle special characters in birthSurname', async () => {
      const mockEvent = createMockEvent(db, {
        request: new Request('http://localhost/api/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'Jane',
            lastName: 'Smith',
            birthSurname: "O'Brien-Jones"
          })
        })
      })

      const response = await POST(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.birthSurname).toBe("O'Brien-Jones")
    })

    it('should handle special characters in nickname', async () => {
      const mockEvent = createMockEvent(db, {
        request: new Request('http://localhost/api/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'Robert',
            lastName: 'Johnson',
            nickname: 'J.J.'
          })
        })
      })

      const response = await POST(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.nickname).toBe('J.J.')
    })
  })

  describe('GET /api/people - List People', () => {
    it('should return people with birthSurname and nickname fields', async () => {
      // Create test person with both fields
      const createEvent = createMockEvent(db, {
        request: new Request('http://localhost/api/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'Jane',
            lastName: 'Smith',
            birthSurname: 'Jones',
            nickname: 'JJ'
          })
        })
      })
      await POST(createEvent)

      // Retrieve all people
      const mockEvent = createMockEvent(db, {
        request: new Request('http://localhost/api/people')
      })

      const response = await GET(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(1)
      expect(data[0].birthSurname).toBe('Jones')
      expect(data[0].nickname).toBe('JJ')
    })

    it('should return null for missing birthSurname and nickname', async () => {
      // Create test person without optional fields
      const createEvent = createMockEvent(db, {
        request: new Request('http://localhost/api/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'John',
            lastName: 'Doe'
          })
        })
      })
      await POST(createEvent)

      // Retrieve all people
      const mockEvent = createMockEvent(db, {
        request: new Request('http://localhost/api/people')
      })

      const response = await GET(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data[0].birthSurname).toBeNull()
      expect(data[0].nickname).toBeNull()
    })
  })

  describe('GET /api/people/[id] - Get Single Person', () => {
    it('should return person with birthSurname and nickname', async () => {
      // Create test person
      const createEvent = createMockEvent(db, {
        request: new Request('http://localhost/api/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'Jane',
            lastName: 'Smith',
            birthSurname: 'Jones',
            nickname: 'JJ'
          })
        })
      })
      const createResponse = await POST(createEvent)
      const created = await createResponse.json()

      // Get person by ID
      const mockEvent = createMockEvent(db, {
        request: new Request(`http://localhost/api/people/${created.id}`),
        params: { id: String(created.id) }
      })

      const response = await GET_BY_ID(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.birthSurname).toBe('Jones')
      expect(data.nickname).toBe('JJ')
    })
  })

  describe('PUT /api/people/[id] - Update Person', () => {
    it('should update person with birthSurname', async () => {
      // Create test person
      const createEvent = createMockEvent(db, {
        request: new Request('http://localhost/api/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'Jane',
            lastName: 'Smith'
          })
        })
      })
      const createResponse = await POST(createEvent)
      const created = await createResponse.json()

      // Update with birthSurname
      const mockEvent = createMockEvent(db, {
        request: new Request(`http://localhost/api/people/${created.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'Jane',
            lastName: 'Smith',
            birthSurname: 'Jones'
          })
        }),
        params: { id: String(created.id) }
      })

      const response = await PUT(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.birthSurname).toBe('Jones')
    })

    it('should update person with nickname', async () => {
      // Create test person
      const createEvent = createMockEvent(db, {
        request: new Request('http://localhost/api/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'Robert',
            lastName: 'Johnson'
          })
        })
      })
      const createResponse = await POST(createEvent)
      const created = await createResponse.json()

      // Update with nickname
      const mockEvent = createMockEvent(db, {
        request: new Request(`http://localhost/api/people/${created.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'Robert',
            lastName: 'Johnson',
            nickname: 'Bob'
          })
        }),
        params: { id: String(created.id) }
      })

      const response = await PUT(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.nickname).toBe('Bob')
    })

    it('should update person to remove birthSurname (set to null)', async () => {
      // Create test person with birthSurname
      const createEvent = createMockEvent(db, {
        request: new Request('http://localhost/api/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'Jane',
            lastName: 'Smith',
            birthSurname: 'Jones'
          })
        })
      })
      const createResponse = await POST(createEvent)
      const created = await createResponse.json()

      // Update to remove birthSurname
      const mockEvent = createMockEvent(db, {
        request: new Request(`http://localhost/api/people/${created.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'Jane',
            lastName: 'Smith',
            birthSurname: null
          })
        }),
        params: { id: String(created.id) }
      })

      const response = await PUT(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.birthSurname).toBeNull()
    })

    it('should update person to change birthSurname', async () => {
      // Create test person with birthSurname
      const createEvent = createMockEvent(db, {
        request: new Request('http://localhost/api/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'Jane',
            lastName: 'Smith',
            birthSurname: 'Jones'
          })
        })
      })
      const createResponse = await POST(createEvent)
      const created = await createResponse.json()

      // Update birthSurname
      const mockEvent = createMockEvent(db, {
        request: new Request(`http://localhost/api/people/${created.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'Jane',
            lastName: 'Smith',
            birthSurname: 'Williams'
          })
        }),
        params: { id: String(created.id) }
      })

      const response = await PUT(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.birthSurname).toBe('Williams')
    })

    it('should update both birthSurname and nickname together', async () => {
      // Create test person
      const createEvent = createMockEvent(db, {
        request: new Request('http://localhost/api/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'Jane',
            lastName: 'Smith'
          })
        })
      })
      const createResponse = await POST(createEvent)
      const created = await createResponse.json()

      // Update with both fields
      const mockEvent = createMockEvent(db, {
        request: new Request(`http://localhost/api/people/${created.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'Jane',
            lastName: 'Smith',
            birthSurname: 'Jones',
            nickname: 'JJ'
          })
        }),
        params: { id: String(created.id) }
      })

      const response = await PUT(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.birthSurname).toBe('Jones')
      expect(data.nickname).toBe('JJ')
    })
  })

  describe('Full CRUD Cycle', () => {
    it('should support full CRUD operations with birthSurname and nickname', async () => {
      // CREATE
      const createEvent = createMockEvent(db, {
        request: new Request('http://localhost/api/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'Jane',
            lastName: 'Smith',
            birthSurname: 'Jones',
            nickname: 'JJ'
          })
        })
      })
      const createResponse = await POST(createEvent)
      const created = await createResponse.json()
      expect(created.birthSurname).toBe('Jones')
      expect(created.nickname).toBe('JJ')

      // READ (single)
      const getEvent = createMockEvent(db, {
        request: new Request(`http://localhost/api/people/${created.id}`),
        params: { id: String(created.id) }
      })
      const getResponse = await GET_BY_ID(getEvent)
      const retrieved = await getResponse.json()
      expect(retrieved.birthSurname).toBe('Jones')
      expect(retrieved.nickname).toBe('JJ')

      // UPDATE
      const updateEvent = createMockEvent(db, {
        request: new Request(`http://localhost/api/people/${created.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: 'Jane',
            lastName: 'Smith',
            birthSurname: 'Williams',
            nickname: 'Janey'
          })
        }),
        params: { id: String(created.id) }
      })
      const updateResponse = await PUT(updateEvent)
      const updated = await updateResponse.json()
      expect(updated.birthSurname).toBe('Williams')
      expect(updated.nickname).toBe('Janey')

      // READ (list)
      const listEvent = createMockEvent(db, {
        request: new Request('http://localhost/api/people')
      })
      const listResponse = await GET(listEvent)
      const list = await listResponse.json()
      expect(list[0].birthSurname).toBe('Williams')
      expect(list[0].nickname).toBe('Janey')

      // DELETE (cleanup)
      const deleteEvent = createMockEvent(db, {
        request: new Request(`http://localhost/api/people/${created.id}`, {
          method: 'DELETE'
        }),
        params: { id: String(created.id) }
      })
      const deleteResponse = await DELETE(deleteEvent)
      expect(deleteResponse.status).toBe(204)
    })
  })
})
