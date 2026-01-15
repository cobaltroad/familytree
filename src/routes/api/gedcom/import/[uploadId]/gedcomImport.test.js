/**
 * GEDCOM Import API Authentication Tests
 *
 * Tests authentication requirements for the GEDCOM import endpoint.
 * This test suite verifies that:
 * - Unauthenticated requests return 401
 * - Authenticated requests succeed
 * - Edge cases are handled properly (missing session, invalid user)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from './+server.js'

describe('GEDCOM Import Authentication', () => {
  let mockRequest
  let mockParams
  let mockLocals

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()

    // Mock params
    mockParams = {
      uploadId: '994_1767878928237_72910f3582e651d0'
    }

    // Mock request body
    mockRequest = {
      json: vi.fn().mockResolvedValue({
        importAll: true
      })
    }
  })

  describe('Unauthenticated Requests', () => {
    it('should return 401 when session is missing', async () => {
      // Arrange: No session in locals
      mockLocals = {
        getSession: vi.fn().mockResolvedValue(null)
      }

      // Act
      const response = await POST({
        request: mockRequest,
        params: mockParams,
        locals: mockLocals
      })

      // Assert
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body).toHaveProperty('error')
      expect(body.error).toContain('Authentication required')
    })

    it('should return 401 when session exists but user is missing', async () => {
      // Arrange: Session without user object
      mockLocals = {
        getSession: vi.fn().mockResolvedValue({
          // Session exists but no user
        })
      }

      // Act
      const response = await POST({
        request: mockRequest,
        params: mockParams,
        locals: mockLocals
      })

      // Assert
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body).toHaveProperty('error')
      expect(body.error).toContain('Authentication required')
    })

    it('should return 401 when user exists but id is missing', async () => {
      // Arrange: Session with user but no id
      mockLocals = {
        getSession: vi.fn().mockResolvedValue({
          user: {
            email: 'test@example.com',
            name: 'Test User'
            // Missing: id
          }
        })
      }

      // Act
      const response = await POST({
        request: mockRequest,
        params: mockParams,
        locals: mockLocals
      })

      // Assert
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body).toHaveProperty('error')
      expect(body.error).toContain('Authentication required')
    })

    it('should handle getSession errors gracefully', async () => {
      // Arrange: getSession throws error
      mockLocals = {
        getSession: vi.fn().mockRejectedValue(new Error('Session error'))
      }

      // Act
      const response = await POST({
        request: mockRequest,
        params: mockParams,
        locals: mockLocals
      })

      // Assert: When getSession throws, it's caught as a general error (500)
      // This is acceptable behavior - the system couldn't determine auth status
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body).toHaveProperty('error')
    })
  })

  describe('Authenticated Requests', () => {
    it('should accept request when session is valid with user.id', async () => {
      // Arrange: Valid session with user.id
      const mockUserId = 123
      mockLocals = {
        getSession: vi.fn().mockResolvedValue({
          user: {
            id: mockUserId,
            email: 'test@example.com',
            name: 'Test User'
          }
        })
      }

      // Mock getPreviewData to return valid data
      const { getPreviewData, getResolutionDecisions } = await import('$lib/server/gedcomPreview.js')
      vi.mocked(getPreviewData).mockResolvedValue({
        uploadId: mockParams.uploadId,
        individuals: [],
        families: []
      })
      vi.mocked(getResolutionDecisions).mockResolvedValue([])

      // Mock prepareImportData
      const { prepareImportData } = await import('$lib/server/gedcomImporter.js')
      vi.mocked(prepareImportData).mockReturnValue({
        personsToInsert: [],
        personsToUpdate: [],
        individualsToImport: []
      })

      // Act
      const response = await POST({
        request: mockRequest,
        params: mockParams,
        locals: mockLocals
      })

      // Assert: Should NOT return 401
      expect(response.status).not.toBe(401)

      // Should call getPreviewData with correct userId
      expect(getPreviewData).toHaveBeenCalledWith(
        mockParams.uploadId,
        mockUserId
      )
    })

    it('should use requireAuth helper for consistency', async () => {
      // Arrange: Valid session
      const mockUserId = 456
      mockLocals = {
        getSession: vi.fn().mockResolvedValue({
          user: {
            id: mockUserId,
            email: 'admin@example.com',
            name: 'Admin User'
          }
        })
      }

      // Mock preview data
      const { getPreviewData, getResolutionDecisions } = await import('$lib/server/gedcomPreview.js')
      vi.mocked(getPreviewData).mockResolvedValue({
        uploadId: mockParams.uploadId,
        individuals: [],
        families: []
      })
      vi.mocked(getResolutionDecisions).mockResolvedValue([])

      // Mock import data
      const { prepareImportData } = await import('$lib/server/gedcomImporter.js')
      vi.mocked(prepareImportData).mockReturnValue({
        personsToInsert: [],
        personsToUpdate: [],
        individualsToImport: []
      })

      // Act
      const response = await POST({
        request: mockRequest,
        params: mockParams,
        locals: mockLocals
      })

      // Assert: Should proceed with import (not return 401)
      expect(response.status).not.toBe(401)

      // Verify getSession was called (used by requireAuth)
      expect(mockLocals.getSession).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined locals gracefully', async () => {
      // Act
      const response = await POST({
        request: mockRequest,
        params: mockParams,
        locals: undefined
      })

      // Assert
      expect(response.status).toBe(401)
    })

    it('should handle locals without getSession method', async () => {
      // Arrange: locals object but no getSession
      mockLocals = {}

      // Act
      const response = await POST({
        request: mockRequest,
        params: mockParams,
        locals: mockLocals
      })

      // Assert
      expect(response.status).toBe(401)
    })

    it('should return 401 before processing request body for unauthenticated requests', async () => {
      // Arrange: No session
      mockLocals = {
        getSession: vi.fn().mockResolvedValue(null)
      }

      // Mock request.json to track if it's called
      const jsonSpy = vi.fn()
      mockRequest.json = jsonSpy

      // Act
      await POST({
        request: mockRequest,
        params: mockParams,
        locals: mockLocals
      })

      // Assert: Should NOT parse request body if not authenticated
      // (Authentication should be checked first for security)
      expect(jsonSpy).not.toHaveBeenCalled()
    })
  })
})

// Mock the GEDCOM modules
vi.mock('$lib/server/gedcomPreview.js', () => ({
  getPreviewData: vi.fn(),
  getResolutionDecisions: vi.fn()
}))

vi.mock('$lib/server/gedcomImporter.js', () => ({
  prepareImportData: vi.fn(),
  buildRelationshipsAfterInsertion: vi.fn().mockReturnValue([]),
  mapGedcomPersonToSchema: vi.fn()
}))

vi.mock('$lib/server/userSync.js', () => ({
  getUserById: vi.fn().mockResolvedValue({
    id: 1,
    email: 'test@example.com',
    name: 'Test User'
  })
}))

vi.mock('$lib/db/client.js', () => ({
  db: {
    transaction: vi.fn((callback) => {
      // Execute the callback synchronously
      return callback()
    })
  }
}))
