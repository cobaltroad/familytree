import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Test Suite: API Authentication Error Handling
 *
 * Tests that the API client properly handles authentication errors (401)
 * and surfaces them with appropriate error properties for the UI to handle.
 *
 * TDD Red Phase: These tests demonstrate the expected behavior
 */
describe('API - Authentication Error Handling', () => {
  // Mock fetch globally
  const originalFetch = global.fetch

  beforeEach(() => {
    // Reset fetch before each test
    global.fetch = originalFetch
  })

  describe('401 Unauthorized Responses', () => {
    it('should throw error with status 401 when API returns unauthorized', async () => {
      // Arrange: Mock fetch to return 401
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Authentication required'
      })

      // Act & Assert: Import fresh API and call it
      const { api } = await import('$lib/api.js')

      try {
        await api.getAllPeople()
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error.status).toBe(401)
        expect(error.message).toContain('Authentication required')
      }
    })

    it('should throw error with status 401 when fetching relationships without auth', async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Authentication required'
      })

      // Act & Assert
      const { api } = await import('$lib/api.js')

      try {
        await api.getAllRelationships()
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error.status).toBe(401)
        expect(error.message).toContain('Authentication required')
      }
    })

    it('should throw error with status 401 when creating person without auth', async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Authentication required'
      })

      // Act & Assert
      const { api } = await import('$lib/api.js')
      const personData = {
        firstName: 'John',
        lastName: 'Doe'
      }

      try {
        await api.createPerson(personData)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error.status).toBe(401)
        expect(error.message).toContain('Authentication required')
      }
    })
  })

  describe('Other HTTP Errors', () => {
    it('should throw error with appropriate status for 500 errors', async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Internal Server Error'
      })

      // Act & Assert
      const { api } = await import('$lib/api.js')

      try {
        await api.getAllPeople()
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error.status).toBe(500)
        expect(error.message).toContain('Internal Server Error')
      }
    })

    it('should throw error with appropriate status for 403 errors', async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'Forbidden: You do not have access to this resource'
      })

      // Act & Assert
      const { api } = await import('$lib/api.js')

      try {
        await api.getPerson(1)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error.status).toBe(403)
        expect(error.message).toContain('Forbidden')
      }
    })
  })

  describe('Successful Responses', () => {
    it('should return data for successful requests', async () => {
      // Arrange
      const mockData = [{ id: 1, firstName: 'John', lastName: 'Doe' }]
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData
      })

      // Act
      const { api } = await import('$lib/api.js')
      const result = await api.getAllPeople()

      // Assert
      expect(result).toEqual(mockData)
    })
  })
})
