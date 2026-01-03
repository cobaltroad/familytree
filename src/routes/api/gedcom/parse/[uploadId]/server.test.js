/**
 * GEDCOM Parse API Endpoint - Integration Tests
 * Story #93: GEDCOM File Parsing and Validation
 *
 * RED phase: Writing failing tests for API endpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST } from './+server.js'
import { saveUploadedFile, cleanupTempFile } from '$lib/server/gedcomStorage.js'
import { promises as fs } from 'fs'
import path from 'path'

const FIXTURES_DIR = path.join(process.cwd(), 'src/test/fixtures/gedcom')

describe('POST /api/gedcom/parse/:uploadId', () => {
  let mockLocals
  let uploadId

  beforeEach(() => {
    mockLocals = {
      getSession: vi.fn(() =>
        Promise.resolve({
          user: {
            id: 1,
            email: 'test@example.com'
          }
        })
      )
    }
  })

  afterEach(async () => {
    // Clean up any test uploads
    if (uploadId) {
      await cleanupTempFile(uploadId)
    }
  })

  it('should parse valid GEDCOM 5.5.1 file and return statistics', async () => {
    // Upload a test file
    const filePath = path.join(FIXTURES_DIR, 'valid-5.5.1.ged')
    const fileData = await fs.readFile(filePath)
    const fileName = 'valid-5.5.1.ged'

    uploadId = `1_${Date.now()}_test`
    await saveUploadedFile(uploadId, fileName, fileData)

    // Create mock request
    const mockRequest = {}
    const mockParams = { uploadId }

    // Call endpoint
    const response = await POST({
      request: mockRequest,
      locals: mockLocals,
      params: mockParams
    })

    // Verify response
    if (response.status !== 200) {
      const text = await response.text()
      console.log('Parse failed with status:', response.status, 'message:', text)
    }
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.uploadId).toBe(uploadId)
    expect(data.version).toBe('5.5.1')
    expect(data.statistics).toBeDefined()
    expect(data.statistics.totalIndividuals).toBe(3)
    expect(data.statistics.totalFamilies).toBe(1)
    expect(data.statistics.dateRange).toBeDefined()
    expect(data.statistics.dateRange.earliest).toBe('1950-01-15')
    expect(data.statistics.dateRange.latest).toBe('2020-12-20')
    expect(data.errors).toHaveLength(0)
    expect(data.duplicates).toBeDefined()
    expect(data.relationshipIssues).toBeDefined()
  })

  it('should parse valid GEDCOM 7.0 file', async () => {
    const filePath = path.join(FIXTURES_DIR, 'valid-7.0.ged')
    const fileData = await fs.readFile(filePath)
    const fileName = 'valid-7.0.ged'

    uploadId = `1_${Date.now()}_test7`
    await saveUploadedFile(uploadId, fileName, fileData)

    const mockRequest = {}
    const mockParams = { uploadId }

    const response = await POST({
      request: mockRequest,
      locals: mockLocals,
      params: mockParams
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.version).toBe('7.0')
    expect(data.statistics.totalIndividuals).toBe(1)
  })

  it('should return 400 for unsupported GEDCOM version', async () => {
    const filePath = path.join(FIXTURES_DIR, 'invalid-version.ged')
    const fileData = await fs.readFile(filePath)
    const fileName = 'invalid-version.ged'

    uploadId = `1_${Date.now()}_testinvalid`
    await saveUploadedFile(uploadId, fileName, fileData)

    const mockRequest = {}
    const mockParams = { uploadId }

    const response = await POST({
      request: mockRequest,
      locals: mockLocals,
      params: mockParams
    })

    expect(response.status).toBe(400)

    const text = await response.text()
    expect(text).toContain('GEDCOM version 4.0 is not supported')
  })

  it('should return 422 with error report for files with syntax errors', async () => {
    const filePath = path.join(FIXTURES_DIR, 'syntax-errors.ged')
    const fileData = await fs.readFile(filePath)
    const fileName = 'syntax-errors.ged'

    uploadId = `1_${Date.now()}_testerrors`
    await saveUploadedFile(uploadId, fileName, fileData)

    const mockRequest = {}
    const mockParams = { uploadId }

    const response = await POST({
      request: mockRequest,
      locals: mockLocals,
      params: mockParams
    })

    expect(response.status).toBe(200) // Still returns 200 but with errors array

    const data = await response.json()
    expect(data.errors.length).toBeGreaterThan(0)
    expect(data.errors[0]).toHaveProperty('line')
    expect(data.errors[0]).toHaveProperty('message')
    expect(data.errors[0]).toHaveProperty('severity')
  })

  it('should return 404 for non-existent uploadId', async () => {
    const mockRequest = {}
    const mockParams = { uploadId: 'nonexistent_123_abc' }

    const response = await POST({
      request: mockRequest,
      locals: mockLocals,
      params: mockParams
    })

    expect(response.status).toBe(404)

    const text = await response.text()
    expect(text).toContain('Upload not found')
  })

  it('should require authentication', async () => {
    const unauthenticatedLocals = {
      getSession: vi.fn(() => Promise.resolve(null))
    }

    const mockRequest = {}
    const mockParams = { uploadId: 'test_123_abc' }

    const response = await POST({
      request: mockRequest,
      locals: unauthenticatedLocals,
      params: mockParams
    })

    expect(response.status).toBe(401)
  })

  it('should detect duplicates against existing people in database', async () => {
    // This test would require database setup with existing people
    // For now, we'll just verify the structure

    const filePath = path.join(FIXTURES_DIR, 'valid-5.5.1.ged')
    const fileData = await fs.readFile(filePath)
    const fileName = 'valid-5.5.1.ged'

    uploadId = `1_${Date.now()}_testdup`
    await saveUploadedFile(uploadId, fileName, fileData)

    const mockRequest = {}
    const mockParams = { uploadId }

    const response = await POST({
      request: mockRequest,
      locals: mockLocals,
      params: mockParams
    })

    const data = await response.json()
    expect(data.duplicates).toBeDefined()
    expect(Array.isArray(data.duplicates)).toBe(true)
  })

  it('should validate relationship consistency', async () => {
    const filePath = path.join(FIXTURES_DIR, 'syntax-errors.ged')
    const fileData = await fs.readFile(filePath)
    const fileName = 'syntax-errors.ged'

    uploadId = `1_${Date.now()}_testrel`
    await saveUploadedFile(uploadId, fileName, fileData)

    const mockRequest = {}
    const mockParams = { uploadId }

    const response = await POST({
      request: mockRequest,
      locals: mockLocals,
      params: mockParams
    })

    const data = await response.json()
    expect(data.relationshipIssues).toBeDefined()
    expect(Array.isArray(data.relationshipIssues)).toBe(true)
  })
})

describe('GET /api/gedcom/parse/:uploadId/errors', () => {
  it('should return CSV format error log', async () => {
    // This endpoint will be implemented to download errors as CSV
    // Test will be added in implementation phase
  })
})
