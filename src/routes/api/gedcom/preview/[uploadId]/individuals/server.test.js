/**
 * GEDCOM Preview Individuals API Endpoint - Integration Tests
 * Story #94: Preview GEDCOM Data Before Import
 *
 * Tests for GET /api/gedcom/preview/:uploadId/individuals
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { GET } from './+server.js'
import { storePreviewData } from '$lib/server/gedcomPreview.js'

describe('GET /api/gedcom/preview/:uploadId/individuals', () => {
  const uploadId = 'test-upload-123'

  const mockParsedData = {
    individuals: Array.from({ length: 100 }, (_, i) => ({
      id: `@I${String(i + 1).padStart(3, '0')}@`,
      name: `Person ${i + 1}`,
      firstName: `First${i + 1}`,
      lastName: `Last${i + 1}`,
      sex: i % 2 === 0 ? 'M' : 'F',
      birthDate: `${1950 + i}-01-01`,
      deathDate: i < 50 ? `${2000 + i}-01-01` : null,
      childOfFamily: null,
      spouseFamilies: []
    })),
    families: []
  }

  beforeEach(async () => {
    // Store preview data
    await storePreviewData(uploadId, mockParsedData, [])
  })

  it('should return paginated individuals (default page 1, limit 50)', async () => {
    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/individuals')
    const mockParams = { uploadId }

    const response = await GET({
      request: mockRequest,
      locals: {},
      params: mockParams,
      url: new URL('http://localhost/api/gedcom/preview/test-upload-123/individuals')
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.individuals).toHaveLength(50)
    expect(data.pagination.page).toBe(1)
    expect(data.pagination.limit).toBe(50)
    expect(data.pagination.total).toBe(100)
    expect(data.pagination.totalPages).toBe(2)
  })

  it('should support custom page and limit via query parameters', async () => {
    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/individuals?page=2&limit=25')
    const mockParams = { uploadId }

    const response = await GET({
      request: mockRequest,
      locals: {},
      params: mockParams,
      url: new URL('http://localhost/api/gedcom/preview/test-upload-123/individuals?page=2&limit=25')
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.individuals).toHaveLength(25)
    expect(data.pagination.page).toBe(2)
    expect(data.pagination.limit).toBe(25)
  })

  it('should support sorting by name (ascending)', async () => {
    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/individuals?sortBy=name&sortOrder=asc')
    const mockParams = { uploadId }

    const response = await GET({
      request: mockRequest,
      locals: {},
      params: mockParams,
      url: new URL('http://localhost/api/gedcom/preview/test-upload-123/individuals?sortBy=name&sortOrder=asc')
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.individuals[0].name).toBe('Person 1')
    expect(data.individuals[1].name).toBe('Person 10')
  })

  it('should support sorting by birthDate (descending)', async () => {
    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/individuals?sortBy=birthDate&sortOrder=desc')
    const mockParams = { uploadId }

    const response = await GET({
      request: mockRequest,
      locals: {},
      params: mockParams,
      url: new URL('http://localhost/api/gedcom/preview/test-upload-123/individuals?sortBy=birthDate&sortOrder=desc')
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    // Most recent first
    expect(data.individuals[0].birthDate).toBe('2049-01-01')
  })

  it('should support search/filter by name', async () => {
    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/individuals?search=Person%201')
    const mockParams = { uploadId }

    const response = await GET({
      request: mockRequest,
      locals: {},
      params: mockParams,
      url: new URL('http://localhost/api/gedcom/preview/test-upload-123/individuals?search=Person%201')
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    // Should find "Person 1", "Person 10", "Person 11", etc.
    expect(data.individuals.length).toBeGreaterThan(0)
    expect(data.individuals.every(p => p.name.includes('Person 1'))).toBe(true)
  })

  it('should return 404 if preview data does not exist', async () => {
    const mockRequest = new Request('http://localhost/api/gedcom/preview/nonexistent/individuals')
    const mockParams = { uploadId: 'nonexistent' }

    const response = await GET({
      request: mockRequest,
      locals: {},
      params: mockParams,
      url: new URL('http://localhost/api/gedcom/preview/nonexistent/individuals')
    })

    expect(response.status).toBe(404)
  })

  it('should include individual status (new/duplicate/existing) in response', async () => {
    // Create data with a duplicate
    const dataWithDuplicate = {
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
        }
      ],
      families: []
    }

    const duplicates = [
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

    await storePreviewData('test-dup-123', dataWithDuplicate, duplicates)

    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-dup-123/individuals')
    const mockParams = { uploadId: 'test-dup-123' }

    const response = await GET({
      request: mockRequest,
      locals: {},
      params: mockParams,
      url: new URL('http://localhost/api/gedcom/preview/test-dup-123/individuals')
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.individuals[0].status).toBe('duplicate')
    expect(data.individuals[0].duplicateMatch).toBeDefined()
    expect(data.individuals[0].duplicateMatch.existingPersonId).toBe(42)
  })
})
