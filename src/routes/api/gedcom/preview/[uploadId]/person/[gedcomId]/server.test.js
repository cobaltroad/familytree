/**
 * GEDCOM Preview Person Detail API Endpoint - Integration Tests
 * Story #94: Preview GEDCOM Data Before Import
 *
 * Tests for GET /api/gedcom/preview/:uploadId/person/:gedcomId
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from './+server.js'
import { storePreviewData } from '$lib/server/gedcomPreview.js'

describe('GET /api/gedcom/preview/:uploadId/person/:gedcomId', () => {
  let mockLocals
  const uploadId = 'test-upload-123'
  const userId = 1

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
        childOfFamily: '@F001@',
        spouseFamilies: ['@F002@']
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
        spouseFamilies: ['@F002@']
      },
      {
        id: '@I003@',
        name: 'Alice Smith',
        firstName: 'Alice',
        lastName: 'Smith',
        sex: 'F',
        birthDate: '1975-07-08',
        deathDate: null,
        childOfFamily: '@F002@',
        spouseFamilies: []
      },
      {
        id: '@I004@',
        name: 'Robert Smith',
        firstName: 'Robert',
        lastName: 'Smith',
        sex: 'M',
        birthDate: '1920-03-10',
        deathDate: '1990-06-15',
        childOfFamily: null,
        spouseFamilies: ['@F001@']
      },
      {
        id: '@I005@',
        name: 'Jane Doe',
        firstName: 'Jane',
        lastName: 'Doe',
        sex: 'F',
        birthDate: '1925-08-22',
        deathDate: '1995-12-01',
        childOfFamily: null,
        spouseFamilies: ['@F001@']
      }
    ],
    families: [
      {
        id: '@F001@',
        husband: '@I004@',
        wife: '@I005@',
        children: ['@I001@']
      },
      {
        id: '@F002@',
        husband: '@I001@',
        wife: '@I002@',
        children: ['@I003@']
      }
    ]
  }

  beforeEach(async () => {
    mockLocals = {
      getSession: vi.fn(() =>
        Promise.resolve({
          user: {
            id: userId,
            email: 'test@example.com'
          }
        })
      )
    }

    await storePreviewData(uploadId, userId, mockParsedData, [])
  })

  it('should return person details with relationships', async () => {
    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/person/@I001@')
    const mockParams = { uploadId, gedcomId: '@I001@' }

    const response = await GET({
      request: mockRequest,
      locals: mockLocals,
      params: mockParams
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.person).toBeDefined()
    expect(data.person.gedcomId).toBe('@I001@')
    expect(data.person.name).toBe('John Smith')
    expect(data.relationships).toBeDefined()
  })

  it('should include parents in relationships', async () => {
    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/person/@I001@')
    const mockParams = { uploadId, gedcomId: '@I001@' }

    const response = await GET({
      request: mockRequest,
      locals: mockLocals,
      params: mockParams
    })

    const data = await response.json()
    expect(data.relationships.parents).toBeDefined()
    expect(data.relationships.parents).toHaveLength(2)

    const parentIds = data.relationships.parents.map(p => p.gedcomId)
    expect(parentIds).toContain('@I004@') // Father
    expect(parentIds).toContain('@I005@') // Mother
  })

  it('should include spouses in relationships', async () => {
    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/person/@I001@')
    const mockParams = { uploadId, gedcomId: '@I001@' }

    const response = await GET({
      request: mockRequest,
      locals: mockLocals,
      params: mockParams
    })

    const data = await response.json()
    expect(data.relationships.spouses).toBeDefined()
    expect(data.relationships.spouses).toHaveLength(1)
    expect(data.relationships.spouses[0].gedcomId).toBe('@I002@')
    expect(data.relationships.spouses[0].name).toBe('Mary Johnson')
  })

  it('should include children in relationships', async () => {
    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/person/@I001@')
    const mockParams = { uploadId, gedcomId: '@I001@' }

    const response = await GET({
      request: mockRequest,
      locals: mockLocals,
      params: mockParams
    })

    const data = await response.json()
    expect(data.relationships.children).toBeDefined()
    expect(data.relationships.children).toHaveLength(1)
    expect(data.relationships.children[0].gedcomId).toBe('@I003@')
    expect(data.relationships.children[0].name).toBe('Alice Smith')
  })

  it('should handle person with no relationships', async () => {
    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/person/@I004@')
    const mockParams = { uploadId, gedcomId: '@I004@' }

    const response = await GET({
      request: mockRequest,
      locals: mockLocals,
      params: mockParams
    })

    const data = await response.json()
    expect(data.relationships.parents).toHaveLength(0)
    expect(data.relationships.children).toHaveLength(1) // Has one child
    expect(data.relationships.spouses).toHaveLength(1) // Has spouse
  })

  it('should return 404 if person does not exist', async () => {
    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/person/@I999@')
    const mockParams = { uploadId, gedcomId: '@I999@' }

    const response = await GET({
      request: mockRequest,
      locals: mockLocals,
      params: mockParams
    })

    expect(response.status).toBe(404)
  })

  it('should return 404 if preview data does not exist', async () => {
    const mockRequest = new Request('http://localhost/api/gedcom/preview/nonexistent/person/@I001@')
    const mockParams = { uploadId: 'nonexistent', gedcomId: '@I001@' }

    const response = await GET({
      request: mockRequest,
      locals: mockLocals,
      params: mockParams
    })

    expect(response.status).toBe(404)
  })

  it('should require authentication', async () => {
    const unauthenticatedLocals = {
      getSession: vi.fn(() => Promise.resolve(null))
    }

    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/person/@I001@')
    const mockParams = { uploadId, gedcomId: '@I001@' }

    const response = await GET({
      request: mockRequest,
      locals: unauthenticatedLocals,
      params: mockParams
    })

    expect(response.status).toBe(401)
  })
})
