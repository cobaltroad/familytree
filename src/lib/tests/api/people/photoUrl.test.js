import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { GET, POST } from '../../../../routes/api/people/+server.js'
import { GET as GET_ONE, PUT, DELETE } from '../../../../routes/api/people/[id]/+server.js'
import { setupTestDatabase, createMockAuthenticatedEvent } from '$lib/server/testHelpers.js'

/**
 * Test suite for Photo URL support in Person API
 * Story #77: Add Photo Storage to Person Model
 *
 * Tests photoUrl field in:
 * - GET /api/people (collection)
 * - POST /api/people (create)
 * - GET /api/people/[id] (get one)
 * - PUT /api/people/[id] (update)
 */
describe('Story #77: Photo URL Support', () => {
  let db
  let sqlite
  let userId

  beforeEach(async () => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)
    userId = await setupTestDatabase(sqlite, db)
  })

  afterEach(() => {
    sqlite.close()
  })

  describe('GET /api/people - photoUrl in collection', () => {
    it('should return photoUrl when person has a photo', async () => {
      // Arrange: Insert person with photo URL
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, photo_url, user_id)
        VALUES (?, ?, ?, ?)
      `).run('John', 'Doe', 'https://example.com/photos/john.jpg', userId)

      // Act
      const event = createMockAuthenticatedEvent(db)
      const response = await GET(event)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data[0]).toMatchObject({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        photoUrl: 'https://example.com/photos/john.jpg'
      })
    })

    it('should return photoUrl as null when person has no photo', async () => {
      // Arrange: Insert person without photo URL
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, photo_url, user_id)
        VALUES (?, ?, ?, ?)
      `).run('Jane', 'Smith', null, userId)

      // Act
      const event = createMockAuthenticatedEvent(db)
      const response = await GET(event)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data[0]).toMatchObject({
        firstName: 'Jane',
        lastName: 'Smith',
        photoUrl: null
      })
    })

    it('should handle multiple people with different photo URLs', async () => {
      // Arrange
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, photo_url, user_id)
        VALUES (?, ?, ?, ?)
      `).run('John', 'Doe', 'https://example.com/john.jpg', userId)

      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, photo_url, user_id)
        VALUES (?, ?, ?, ?)
      `).run('Jane', 'Smith', null, userId)

      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, photo_url, user_id)
        VALUES (?, ?, ?, ?)
      `).run('Bob', 'Jones', 'https://cdn.example.org/bob.png', userId)

      // Act
      const event = createMockAuthenticatedEvent(db)
      const response = await GET(event)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveLength(3)
      expect(data[0].photoUrl).toBe('https://example.com/john.jpg')
      expect(data[1].photoUrl).toBe(null)
      expect(data[2].photoUrl).toBe('https://cdn.example.org/bob.png')
    })
  })

  describe('POST /api/people - creating person with photoUrl', () => {
    it('should create person with photoUrl and return it in response', async () => {
      // Arrange
      const requestData = {
        firstName: 'John',
        lastName: 'Doe',
        photoUrl: 'https://example.com/photos/john.jpg'
      }

      const request = {
        json: async () => requestData
      }

      // Act
      const event = createMockAuthenticatedEvent(db, null, { request })
      const response = await POST(event)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data).toMatchObject({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        photoUrl: 'https://example.com/photos/john.jpg'
      })

      // Verify in database
      const person = sqlite.prepare('SELECT * FROM people WHERE id = ?').get(1)
      expect(person.photo_url).toBe('https://example.com/photos/john.jpg')
    })

    it('should create person without photoUrl (null)', async () => {
      // Arrange
      const requestData = {
        firstName: 'Jane',
        lastName: 'Smith',
        photoUrl: null
      }

      const request = {
        json: async () => requestData
      }

      // Act
      const event = createMockAuthenticatedEvent(db, null, { request })
      const response = await POST(event)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.photoUrl).toBe(null)

      // Verify in database
      const person = sqlite.prepare('SELECT * FROM people WHERE id = ?').get(1)
      expect(person.photo_url).toBe(null)
    })

    it('should create person when photoUrl is omitted (defaults to null)', async () => {
      // Arrange
      const requestData = {
        firstName: 'Bob',
        lastName: 'Jones'
        // photoUrl omitted
      }

      const request = {
        json: async () => requestData
      }

      // Act
      const event = createMockAuthenticatedEvent(db, null, { request })
      const response = await POST(event)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.photoUrl).toBe(null)
    })

    it('should validate photoUrl is a string when provided', async () => {
      // Arrange
      const requestData = {
        firstName: 'John',
        lastName: 'Doe',
        photoUrl: 12345 // Invalid: not a string
      }

      const request = {
        json: async () => requestData
      }

      // Act
      const event = createMockAuthenticatedEvent(db, null, { request })
      const response = await POST(event)

      // Assert
      expect(response.status).toBe(400)
      const errorText = await response.text()
      expect(errorText).toContain('photoUrl must be a string')
    })

    it('should accept various URL formats', async () => {
      const testCases = [
        'https://example.com/photo.jpg',
        'http://example.com/photo.png',
        'https://cdn.cloudinary.com/v1/image/upload/photo.webp',
        'https://graph.facebook.com/v12.0/123456789/picture',
        'data:image/png;base64,iVBORw0KGgoAAAANS...' // data URL
      ]

      for (const photoUrl of testCases) {
        const requestData = {
          firstName: 'Test',
          lastName: 'User',
          photoUrl
        }

        const request = {
          json: async () => requestData
        }

        // Act
        const event = createMockAuthenticatedEvent(db, null, { request })
        const response = await POST(event)
        const data = await response.json()

        // Assert
        expect(response.status).toBe(201)
        expect(data.photoUrl).toBe(photoUrl)
      }
    })
  })

  describe('GET /api/people/[id] - retrieving person with photoUrl', () => {
    it('should return photoUrl when person has a photo', async () => {
      // Arrange
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, photo_url, user_id)
        VALUES (?, ?, ?, ?)
      `).run('John', 'Doe', 'https://example.com/john.jpg', userId)

      // Act
      const event = createMockAuthenticatedEvent(db, null, { params: { id: '1' } })
      const response = await GET_ONE(event)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.photoUrl).toBe('https://example.com/john.jpg')
    })

    it('should return photoUrl as null when person has no photo', async () => {
      // Arrange
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, photo_url, user_id)
        VALUES (?, ?, ?, ?)
      `).run('Jane', 'Smith', null, userId)

      // Act
      const event = createMockAuthenticatedEvent(db, null, { params: { id: '1' } })
      const response = await GET_ONE(event)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.photoUrl).toBe(null)
    })
  })

  describe('PUT /api/people/[id] - updating photoUrl', () => {
    it('should update photoUrl when provided', async () => {
      // Arrange: Create person without photo
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, photo_url, user_id)
        VALUES (?, ?, ?, ?)
      `).run('John', 'Doe', null, userId)

      const requestData = {
        firstName: 'John',
        lastName: 'Doe',
        photoUrl: 'https://example.com/new-photo.jpg'
      }

      const request = {
        json: async () => requestData
      }

      // Act
      const event = createMockAuthenticatedEvent(db, null, { params: { id: '1' }, request })
      const response = await PUT(event)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.photoUrl).toBe('https://example.com/new-photo.jpg')

      // Verify in database
      const person = sqlite.prepare('SELECT * FROM people WHERE id = ?').get(1)
      expect(person.photo_url).toBe('https://example.com/new-photo.jpg')
    })

    it('should remove photoUrl when set to null', async () => {
      // Arrange: Create person with photo
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, photo_url, user_id)
        VALUES (?, ?, ?, ?)
      `).run('John', 'Doe', 'https://example.com/old-photo.jpg', userId)

      const requestData = {
        firstName: 'John',
        lastName: 'Doe',
        photoUrl: null
      }

      const request = {
        json: async () => requestData
      }

      // Act
      const event = createMockAuthenticatedEvent(db, null, { params: { id: '1' }, request })
      const response = await PUT(event)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.photoUrl).toBe(null)

      // Verify in database
      const person = sqlite.prepare('SELECT * FROM people WHERE id = ?').get(1)
      expect(person.photo_url).toBe(null)
    })

    it('should preserve existing photoUrl when not included in update', async () => {
      // Arrange: Create person with photo
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, photo_url, user_id)
        VALUES (?, ?, ?, ?)
      `).run('John', 'Doe', 'https://example.com/photo.jpg', userId)

      const requestData = {
        firstName: 'Johnny',
        lastName: 'Doe'
        // photoUrl not included - should preserve existing
      }

      const request = {
        json: async () => requestData
      }

      // Act
      const event = createMockAuthenticatedEvent(db, null, { params: { id: '1' }, request })
      const response = await PUT(event)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.firstName).toBe('Johnny')
      expect(data.photoUrl).toBe('https://example.com/photo.jpg') // Preserved

      // Verify in database
      const person = sqlite.prepare('SELECT * FROM people WHERE id = ?').get(1)
      expect(person.photo_url).toBe('https://example.com/photo.jpg')
    })

    it('should validate photoUrl is a string when updating', async () => {
      // Arrange
      sqlite.prepare(`
        INSERT INTO people (first_name, last_name, photo_url, user_id)
        VALUES (?, ?, ?, ?)
      `).run('John', 'Doe', null, userId)

      const requestData = {
        firstName: 'John',
        lastName: 'Doe',
        photoUrl: 12345 // Invalid: not a string
      }

      const request = {
        json: async () => requestData
      }

      // Act
      const event = createMockAuthenticatedEvent(db, null, { params: { id: '1' }, request })
      const response = await PUT(event)

      // Assert
      expect(response.status).toBe(400)
      const errorText = await response.text()
      expect(errorText).toContain('photoUrl must be a string')
    })
  })
})
