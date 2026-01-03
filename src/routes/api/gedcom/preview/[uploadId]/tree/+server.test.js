/**
 * GEDCOM Preview Tree API Endpoint - Integration Tests
 * Story #94: Preview GEDCOM Data Before Import
 *
 * Tests for GET /api/gedcom/preview/:uploadId/tree
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from './+server.js'
import { storePreviewData } from '$lib/server/gedcomPreview.js'

describe('GET /api/gedcom/preview/:uploadId/tree', () => {
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

  it('should return tree structure with individuals and relationships', async () => {
    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/tree')
    const mockParams = { uploadId }

    const response = await GET({
      request: mockRequest,
      locals: mockLocals,
      params: mockParams
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.individuals).toBeDefined()
    expect(data.relationships).toBeDefined()
    expect(Array.isArray(data.individuals)).toBe(true)
    expect(Array.isArray(data.relationships)).toBe(true)
  })

  it('should include all individuals from GEDCOM data', async () => {
    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/tree')
    const mockParams = { uploadId }

    const response = await GET({
      request: mockRequest,
      locals: mockLocals,
      params: mockParams
    })

    const data = await response.json()
    expect(data.individuals).toHaveLength(3)

    const ids = data.individuals.map(p => p.gedcomId)
    expect(ids).toContain('@I001@')
    expect(ids).toContain('@I002@')
    expect(ids).toContain('@I003@')
  })

  it('should convert family structures to parent-child relationships', async () => {
    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/tree')
    const mockParams = { uploadId }

    const response = await GET({
      request: mockRequest,
      locals: mockLocals,
      params: mockParams
    })

    const data = await response.json()

    const parentRels = data.relationships.filter(r => r.type === 'parent')
    expect(parentRels.length).toBeGreaterThan(0)

    // Alice should have John and Mary as parents
    const aliceParents = parentRels.filter(r => r.child === '@I003@')
    expect(aliceParents).toHaveLength(2)

    const parentIds = aliceParents.map(r => r.parent)
    expect(parentIds).toContain('@I001@') // John (father)
    expect(parentIds).toContain('@I002@') // Mary (mother)
  })

  it('should include parent role in parent-child relationships', async () => {
    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/tree')
    const mockParams = { uploadId }

    const response = await GET({
      request: mockRequest,
      locals: mockLocals,
      params: mockParams
    })

    const data = await response.json()

    const parentRels = data.relationships.filter(r => r.type === 'parent')

    // Check that parent roles are specified
    const fatherRels = parentRels.filter(r => r.parentRole === 'father')
    const motherRels = parentRels.filter(r => r.parentRole === 'mother')

    expect(fatherRels.length).toBeGreaterThan(0)
    expect(motherRels.length).toBeGreaterThan(0)
  })

  it('should convert family structures to spouse relationships', async () => {
    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/tree')
    const mockParams = { uploadId }

    const response = await GET({
      request: mockRequest,
      locals: mockLocals,
      params: mockParams
    })

    const data = await response.json()

    const spouseRels = data.relationships.filter(r => r.type === 'spouse')
    expect(spouseRels.length).toBeGreaterThan(0)

    // Should have John and Mary as spouses
    const johnMarySpouse = spouseRels.find(
      r => (r.person1 === '@I001@' && r.person2 === '@I002@') ||
           (r.person1 === '@I002@' && r.person2 === '@I001@')
    )
    expect(johnMarySpouse).toBeDefined()
  })

  it('should not include internal _original field in individuals', async () => {
    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/tree')
    const mockParams = { uploadId }

    const response = await GET({
      request: mockRequest,
      locals: mockLocals,
      params: mockParams
    })

    const data = await response.json()

    for (const individual of data.individuals) {
      expect(individual._original).toBeUndefined()
    }
  })

  it('should return 404 if preview data does not exist', async () => {
    const mockRequest = new Request('http://localhost/api/gedcom/preview/nonexistent/tree')
    const mockParams = { uploadId: 'nonexistent' }

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

    const mockRequest = new Request('http://localhost/api/gedcom/preview/test-upload-123/tree')
    const mockParams = { uploadId }

    const response = await GET({
      request: mockRequest,
      locals: unauthenticatedLocals,
      params: mockParams
    })

    expect(response.status).toBe(401)
  })
})
