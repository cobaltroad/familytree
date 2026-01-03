/**
 * Tests for GEDCOM Parse Status API Endpoint
 * Story #103: GEDCOM Parsing Results Display
 *
 * GET /api/gedcom/parse/:uploadId/status
 * Returns parsing status for progress polling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './+server.js'

// Mock dependencies
vi.mock('$lib/server/session.js', () => ({
  requireAuth: vi.fn()
}))

vi.mock('$lib/server/gedcomStorage.js', () => ({
  getTempFileInfo: vi.fn()
}))

import { requireAuth } from '$lib/server/session.js'
import { getTempFileInfo } from '$lib/server/gedcomStorage.js'

describe('GET /api/gedcom/parse/:uploadId/status', () => {
  let mockRequest
  let mockLocals
  let mockEvent

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequest = new Request('http://localhost/api/gedcom/parse/upload-123/status')
    mockLocals = {}
    mockEvent = {
      request: mockRequest,
      locals: mockLocals,
      params: { uploadId: 'upload-123' }
    }

    // Default auth mock
    requireAuth.mockResolvedValue({
      user: { id: 1, email: 'test@example.com' }
    })
  })

  describe('Authentication', () => {
    it('should require authentication', async () => {
      requireAuth.mockRejectedValue({
        name: 'AuthenticationError',
        message: 'Not authenticated',
        status: 401
      })

      const response = await GET(mockEvent)

      expect(response.status).toBe(401)
      expect(await response.text()).toBe('Not authenticated')
    })
  })

  describe('Status Response', () => {
    it('should return complete status for existing upload', async () => {
      getTempFileInfo.mockResolvedValue({
        exists: true,
        filePath: '/tmp/upload-123.ged',
        fileName: 'family.ged',
        fileSize: 1024
      })

      const response = await GET(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        status: 'complete',
        uploadId: 'upload-123'
      })
    })

    it('should return 404 for non-existent upload', async () => {
      getTempFileInfo.mockResolvedValue({
        exists: false
      })

      const response = await GET(mockEvent)

      expect(response.status).toBe(404)
      expect(await response.text()).toBe('Upload not found')
    })

    it('should handle storage errors gracefully', async () => {
      getTempFileInfo.mockRejectedValue(new Error('Storage error'))

      const response = await GET(mockEvent)

      expect(response.status).toBe(500)
      expect(await response.text()).toBe('Internal Server Error')
    })
  })

  describe('Upload ID Validation', () => {
    it('should handle different upload ID formats', async () => {
      const testCases = [
        'upload-123',
        'upload-abc-def',
        'test-upload-2023'
      ]

      for (const uploadId of testCases) {
        getTempFileInfo.mockResolvedValue({ exists: true })

        const event = {
          ...mockEvent,
          params: { uploadId }
        }

        const response = await GET(event)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.uploadId).toBe(uploadId)
      }
    })
  })
})
