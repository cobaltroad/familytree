/**
 * Integration tests for API client with SvelteKit routes
 * Story 5: Frontend Integration with SvelteKit API Routes
 * Issue #64: https://github.com/cobaltroad/familytree/issues/64
 *
 * These tests verify that the API client is correctly configured to use
 * relative paths (/api) instead of absolute URLs (http://localhost:8080/api).
 *
 * We test the API contract by verifying the client makes the right requests
 * to the right endpoints. The API routes themselves are tested separately
 * in their respective +server.test.js files.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { api } from './api.js'

describe('API Client Configuration', () => {
  let fetchMock

  beforeEach(() => {
    // Mock global fetch to intercept API calls
    fetchMock = vi.fn()
    global.fetch = fetchMock
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('API Base URL', () => {
    it('should use relative path /api/people for getAllPeople', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => []
      })

      await api.getAllPeople()

      expect(fetchMock).toHaveBeenCalledWith('/api/people')
    })

    it('should use relative path /api/people/:id for getPerson', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, firstName: 'Test' })
      })

      await api.getPerson(1)

      expect(fetchMock).toHaveBeenCalledWith('/api/people/1')
    })

    it('should use relative path /api/people for createPerson', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: 1, firstName: 'Test' })
      })

      await api.createPerson({ firstName: 'Test', lastName: 'Person' })

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/people',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      )
    })

    it('should use relative path /api/people/:id for updatePerson', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, firstName: 'Updated' })
      })

      await api.updatePerson(1, { firstName: 'Updated' })

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/people/1',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' }
        })
      )
    })

    it('should use relative path /api/people/:id for deletePerson', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 204
      })

      await api.deletePerson(1)

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/people/1',
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })

    it('should use relative path /api/relationships for getAllRelationships', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => []
      })

      await api.getAllRelationships()

      expect(fetchMock).toHaveBeenCalledWith('/api/relationships')
    })

    it('should use relative path /api/relationships for createRelationship', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: 1, type: 'parentOf' })
      })

      await api.createRelationship({
        person1_id: 1,
        person2_id: 2,
        type: 'mother'
      })

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/relationships',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      )
    })

    it('should use relative path /api/relationships/:id for deleteRelationship', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 204
      })

      await api.deleteRelationship(1)

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/relationships/1',
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })

    it('should NOT use absolute URLs (http://localhost:8080)', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => []
      })

      await api.getAllPeople()

      // Verify fetch was NOT called with absolute URL
      expect(fetchMock).not.toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:8080')
      )
      // Verify it was called with relative path
      expect(fetchMock).toHaveBeenCalledWith('/api/people')
    })
  })

  describe('Request Payload Formatting', () => {
    it('should send person data as JSON in createPerson', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: 1 })
      })

      const personData = {
        firstName: 'John',
        lastName: 'Doe',
        gender: 'male',
        birthDate: '1990-01-01'
      }

      await api.createPerson(personData)

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/people',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(personData)
        })
      )
    })

    it('should send relationship data as JSON in createRelationship', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: 1 })
      })

      const relationshipData = {
        person1_id: 1,
        person2_id: 2,
        type: 'mother'
      }

      await api.createRelationship(relationshipData)

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/relationships',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(relationshipData)
        })
      )
    })

    it('should send update data as JSON in updatePerson', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 1 })
      })

      const updates = {
        firstName: 'Jane',
        lastName: 'Smith'
      }

      await api.updatePerson(1, updates)

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/people/1',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should throw error when response is not ok for getAllPeople', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500
      })

      await expect(api.getAllPeople()).rejects.toThrow('Failed to fetch people')
    })

    it('should throw error when response is not ok for getPerson', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404
      })

      await expect(api.getPerson(1)).rejects.toThrow('Failed to fetch person')
    })

    it('should throw error when response is not ok for createPerson', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400
      })

      await expect(api.createPerson({})).rejects.toThrow('Failed to create person')
    })

    it('should throw error when response is not ok for updatePerson', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404
      })

      await expect(api.updatePerson(1, {})).rejects.toThrow('Failed to update person')
    })

    it('should throw error when response is not ok for deletePerson', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404
      })

      await expect(api.deletePerson(1)).rejects.toThrow('Failed to delete person')
    })

    it('should throw error when response is not ok for getAllRelationships', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500
      })

      await expect(api.getAllRelationships()).rejects.toThrow('Failed to fetch relationships')
    })

    it('should throw error when response is not ok for createRelationship', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400
      })

      await expect(api.createRelationship({})).rejects.toThrow('Failed to create relationship')
    })

    it('should throw error when response is not ok for deleteRelationship', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404
      })

      await expect(api.deleteRelationship(1)).rejects.toThrow('Failed to delete relationship')
    })
  })

  describe('Response Parsing', () => {
    it('should parse JSON response from getAllPeople', async () => {
      const mockPeople = [
        { id: 1, firstName: 'John', lastName: 'Doe' },
        { id: 2, firstName: 'Jane', lastName: 'Smith' }
      ]

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPeople
      })

      const result = await api.getAllPeople()

      expect(result).toEqual(mockPeople)
    })

    it('should parse JSON response from getPerson', async () => {
      const mockPerson = { id: 1, firstName: 'John', lastName: 'Doe' }

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPerson
      })

      const result = await api.getPerson(1)

      expect(result).toEqual(mockPerson)
    })

    it('should parse JSON response from createPerson', async () => {
      const mockPerson = { id: 1, firstName: 'John', lastName: 'Doe' }

      fetchMock.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => mockPerson
      })

      const result = await api.createPerson({ firstName: 'John', lastName: 'Doe' })

      expect(result).toEqual(mockPerson)
    })

    it('should parse JSON response from getAllRelationships', async () => {
      const mockRelationships = [
        { id: 1, person1_id: 1, person2_id: 2, type: 'parentOf', parent_role: 'mother' }
      ]

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockRelationships
      })

      const result = await api.getAllRelationships()

      expect(result).toEqual(mockRelationships)
    })

    it('should parse JSON response from createRelationship', async () => {
      const mockRelationship = {
        id: 1,
        person1_id: 1,
        person2_id: 2,
        type: 'parentOf',
        parent_role: 'mother'
      }

      fetchMock.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => mockRelationship
      })

      const result = await api.createRelationship({
        person1_id: 1,
        person2_id: 2,
        type: 'mother'
      })

      expect(result).toEqual(mockRelationship)
    })
  })
})
