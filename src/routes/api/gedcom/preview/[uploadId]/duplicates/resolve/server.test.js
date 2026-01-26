/**
 * GEDCOM Preview Duplicate Resolution API Endpoint - Integration Tests
 * Story #94: Preview GEDCOM Data Before Import
 *
 * Tests for POST /api/gedcom/preview/:uploadId/duplicates/resolve
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { POST } from './+server.js'
import { storePreviewData, getResolutionDecisions } from '$lib/server/gedcomPreview.js'

describe('POST /api/gedcom/preview/:uploadId/duplicates/resolve', () => {
  const uploadId = 'test-upload-123'

  const mockParsedData = {
    individuals: [
      {
        id: '@I001@',
        name: 'John Smith',
        firstName: 'John',
        lastName: 'Smith',
        sex: 'M',
        birthDate: '1950-01-15',
        deathDate: null,
        childOfFamily: null,
        spouseFamilies: []
      },
      {
        id: '@I002@',
        name: 'Mary Johnson',
        firstName: 'Mary',
        lastName: 'Johnson',
        sex: 'F',
        birthDate: '1952-03-20',
        deathDate: '2020-05-10',
        childOfFamily: null,
        spouseFamilies: []
      }
    ],
    families: []
  }

  const mockDuplicates = [
    {
      gedcomPerson: {
        id: '@I001@',
        name: 'John Smith',
        birthDate: '1950-01-15'
      },
      existingPerson: {
        id: 42,
        name: 'John Smith',
        birthDate: '1950-01-15'
      },
      confidence: 95,
      matchingFields: ['name', 'birthDate']
    }
  ]

  beforeEach(async () => {
    await storePreviewData(uploadId, mockParsedData, mockDuplicates)
  })

  it('should save resolution decisions for duplicates', async () => {
    const decisions = [
      {
        gedcomId: '@I001@',
        resolution: 'merge'
      }
    ]

    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/duplicates/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ decisions })
    })

    const mockParams = { uploadId }

    const response = await POST({
      request: mockRequest,
      locals: {},
      params: mockParams
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.saved).toBe(1)

    // Verify decisions were saved
    const savedDecisions = await getResolutionDecisions(uploadId)
    expect(savedDecisions).toHaveLength(1)
    expect(savedDecisions[0].gedcomId).toBe('@I001@')
    expect(savedDecisions[0].resolution).toBe('merge')
  })

  it('should accept merge resolution', async () => {
    const decisions = [
      { gedcomId: '@I001@', resolution: 'merge' }
    ]

    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/duplicates/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ decisions })
    })

    const mockParams = { uploadId }

    const response = await POST({
      request: mockRequest,
      locals: {},
      params: mockParams
    })

    expect(response.status).toBe(200)
  })

  it('should accept import_as_new resolution', async () => {
    const decisions = [
      { gedcomId: '@I001@', resolution: 'import_as_new' }
    ]

    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/duplicates/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ decisions })
    })

    const mockParams = { uploadId }

    const response = await POST({
      request: mockRequest,
      locals: {},
      params: mockParams
    })

    expect(response.status).toBe(200)
  })

  it('should accept skip resolution', async () => {
    const decisions = [
      { gedcomId: '@I001@', resolution: 'skip' }
    ]

    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/duplicates/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ decisions })
    })

    const mockParams = { uploadId }

    const response = await POST({
      request: mockRequest,
      locals: {},
      params: mockParams
    })

    expect(response.status).toBe(200)
  })

  it('should handle multiple resolution decisions', async () => {
    const decisions = [
      { gedcomId: '@I001@', resolution: 'merge' },
      { gedcomId: '@I002@', resolution: 'import_as_new' }
    ]

    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/duplicates/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ decisions })
    })

    const mockParams = { uploadId }

    const response = await POST({
      request: mockRequest,
      locals: {},
      params: mockParams
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.saved).toBe(2)
  })

  it('should return 400 for invalid resolution option', async () => {
    const decisions = [
      { gedcomId: '@I001@', resolution: 'invalid_option' }
    ]

    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/duplicates/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ decisions })
    })

    const mockParams = { uploadId }

    const response = await POST({
      request: mockRequest,
      locals: {},
      params: mockParams
    })

    expect(response.status).toBe(400)
  })

  it('should return 400 if decisions array is missing', async () => {
    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/duplicates/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })

    const mockParams = { uploadId }

    const response = await POST({
      request: mockRequest,
      locals: {},
      params: mockParams
    })

    expect(response.status).toBe(400)
  })

  it('should return 404 if preview data does not exist', async () => {
    const decisions = [
      { gedcomId: '@I001@', resolution: 'merge' }
    ]

    const mockRequest = new Request('http://localhost/api/gedcom/preview/nonexistent/duplicates/resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ decisions })
    })

    const mockParams = { uploadId: 'nonexistent' }

    const response = await POST({
      request: mockRequest,
      locals: {},
      params: mockParams
    })

    expect(response.status).toBe(404)
  })
})
