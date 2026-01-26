/**
 * GEDCOM Preview Duplicates API Endpoint Tests
 * Story #106: GEDCOM Duplicate Resolution UI
 *
 * GET /api/gedcom/preview/:uploadId/duplicates
 *
 * Tests the endpoint that returns duplicate individuals with comparison data
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from './+server.js'

// Mock the gedcomPreview module
vi.mock('$lib/server/gedcomPreview.js', () => ({
  getPreviewData: vi.fn()
}))

import { getPreviewData } from '$lib/server/gedcomPreview.js'

describe('GET /api/gedcom/preview/:uploadId/duplicates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 if preview data not found', async () => {
    // Arrange
    getPreviewData.mockResolvedValue(null)

    const request = new Request('http://localhost/api/gedcom/preview/upload-123/duplicates')
    const event = {
      request,
      locals: {},
      params: { uploadId: 'upload-123' }
    }

    // Act
    const response = await GET(event)

    // Assert
    expect(response.status).toBe(404)
    const text = await response.text()
    expect(text).toBe('Preview data not found')
    expect(getPreviewData).toHaveBeenCalledWith('upload-123')
  })

  it('returns empty array when no duplicates exist', async () => {
    // Arrange
    getPreviewData.mockResolvedValue({
      duplicates: [],
      individuals: []
    })

    const request = new Request('http://localhost/api/gedcom/preview/upload-123/duplicates')
    const event = {
      request,
      locals: {},
      params: { uploadId: 'upload-123' }
    }

    // Act
    const response = await GET(event)

    // Assert
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toEqual({ duplicates: [] })
  })

  it('returns duplicates with formatted comparison data', async () => {
    // Arrange
    const mockPreviewData = {
      duplicates: [
        {
          gedcomPerson: {
            id: '@I001@',
            firstName: 'John',
            lastName: 'Smith',
            birthDate: '1950-01-15',
            birthPlace: 'New York, NY',
            deathDate: '2020-05-10',
            deathPlace: 'Boston, MA',
            sex: 'M'
          },
          existingPerson: {
            id: 42,
            firstName: 'John',
            lastName: 'Smith',
            birthDate: '1950-01-15',
            birthPlace: 'New York, NY',
            deathDate: null,
            deathPlace: null,
            gender: 'male',
            photoUrl: 'https://example.com/photo.jpg'
          },
          confidence: 95,
          matchingFields: {
            name: true,
            birthDate: true,
            birthPlace: true
          }
        }
      ],
      individuals: []
    }

    getPreviewData.mockResolvedValue(mockPreviewData)

    const request = new Request('http://localhost/api/gedcom/preview/upload-123/duplicates')
    const event = {
      request,
      locals: {},
      params: { uploadId: 'upload-123' }
    }

    // Act
    const response = await GET(event)

    // Assert
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.duplicates).toHaveLength(1)

    const duplicate = data.duplicates[0]
    expect(duplicate.gedcomPerson).toEqual({
      gedcomId: '@I001@',
      firstName: 'John',
      lastName: 'Smith',
      name: 'John Smith',
      birthDate: '1950-01-15',
      birthPlace: 'New York, NY',
      deathDate: '2020-05-10',
      deathPlace: 'Boston, MA',
      gender: 'male',
      photoUrl: null
    })

    expect(duplicate.existingPerson).toEqual({
      id: 42,
      firstName: 'John',
      lastName: 'Smith',
      name: 'John Smith',
      birthDate: '1950-01-15',
      birthPlace: 'New York, NY',
      deathDate: null,
      deathPlace: null,
      gender: 'male',
      photoUrl: 'https://example.com/photo.jpg'
    })

    expect(duplicate.confidence).toBe(95)
    expect(duplicate.matchingFields).toEqual({
      name: true,
      birthDate: true,
      birthPlace: true,
      deathDate: false,
      deathPlace: false,
      gender: true
    })
  })

  it('handles multiple duplicates correctly', async () => {
    // Arrange
    const mockPreviewData = {
      duplicates: [
        {
          gedcomPerson: { id: '@I001@', firstName: 'John', lastName: 'Smith', sex: 'M' },
          existingPerson: { id: 42, firstName: 'John', lastName: 'Smith', gender: 'male' },
          confidence: 95,
          matchingFields: { name: true }
        },
        {
          gedcomPerson: { id: '@I002@', firstName: 'Jane', lastName: 'Doe', sex: 'F' },
          existingPerson: { id: 43, firstName: 'Jane', lastName: 'Doe', gender: 'female' },
          confidence: 85,
          matchingFields: { name: true, birthDate: false }
        }
      ],
      individuals: []
    }

    getPreviewData.mockResolvedValue(mockPreviewData)

    const request = new Request('http://localhost/api/gedcom/preview/upload-123/duplicates')
    const event = {
      request,
      locals: {},
      params: { uploadId: 'upload-123' }
    }

    // Act
    const response = await GET(event)

    // Assert
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.duplicates).toHaveLength(2)
    expect(data.duplicates[0].gedcomPerson.gedcomId).toBe('@I001@')
    expect(data.duplicates[1].gedcomPerson.gedcomId).toBe('@I002@')
  })

  it('converts GEDCOM sex values to gender values', async () => {
    // Arrange
    const mockPreviewData = {
      duplicates: [
        {
          gedcomPerson: { id: '@I001@', firstName: 'Test', lastName: 'User', sex: 'M' },
          existingPerson: { id: 42, firstName: 'Test', lastName: 'User', gender: 'male' },
          confidence: 90,
          matchingFields: {}
        },
        {
          gedcomPerson: { id: '@I002@', firstName: 'Test', lastName: 'User2', sex: 'F' },
          existingPerson: { id: 43, firstName: 'Test', lastName: 'User2', gender: 'female' },
          confidence: 90,
          matchingFields: {}
        },
        {
          gedcomPerson: { id: '@I003@', firstName: 'Test', lastName: 'User3', sex: 'U' },
          existingPerson: { id: 44, firstName: 'Test', lastName: 'User3', gender: 'other' },
          confidence: 90,
          matchingFields: {}
        }
      ],
      individuals: []
    }

    getPreviewData.mockResolvedValue(mockPreviewData)

    const request = new Request('http://localhost/api/gedcom/preview/upload-123/duplicates')
    const event = {
      request,
      locals: {},
      params: { uploadId: 'upload-123' }
    }

    // Act
    const response = await GET(event)

    // Assert
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.duplicates[0].gedcomPerson.gender).toBe('male')
    expect(data.duplicates[1].gedcomPerson.gender).toBe('female')
    expect(data.duplicates[2].gedcomPerson.gender).toBe('other')
  })

  it('handles missing optional fields gracefully', async () => {
    // Arrange
    const mockPreviewData = {
      duplicates: [
        {
          gedcomPerson: {
            id: '@I001@',
            firstName: 'John',
            lastName: 'Smith'
            // Missing: birthDate, deathDate, places, sex, photoUrl
          },
          existingPerson: {
            id: 42,
            firstName: 'John',
            lastName: 'Smith'
            // Missing: birthDate, deathDate, places, gender, photoUrl
          },
          confidence: 75,
          matchingFields: { name: true }
        }
      ],
      individuals: []
    }

    getPreviewData.mockResolvedValue(mockPreviewData)

    const request = new Request('http://localhost/api/gedcom/preview/upload-123/duplicates')
    const event = {
      request,
      locals: {},
      params: { uploadId: 'upload-123' }
    }

    // Act
    const response = await GET(event)

    // Assert
    expect(response.status).toBe(200)
    const data = await response.json()
    const duplicate = data.duplicates[0]

    expect(duplicate.gedcomPerson.birthDate).toBeNull()
    expect(duplicate.gedcomPerson.deathDate).toBeNull()
    expect(duplicate.gedcomPerson.birthPlace).toBeNull()
    expect(duplicate.gedcomPerson.deathPlace).toBeNull()
    expect(duplicate.gedcomPerson.gender).toBeNull()
    expect(duplicate.gedcomPerson.photoUrl).toBeNull()

    expect(duplicate.existingPerson.birthDate).toBeUndefined()
    expect(duplicate.existingPerson.deathDate).toBeUndefined()
  })

  it('returns 500 on unexpected errors', async () => {
    // Arrange
    getPreviewData.mockRejectedValue(new Error('Database error'))

    const request = new Request('http://localhost/api/gedcom/preview/upload-123/duplicates')
    const event = {
      request,
      locals: {},
      params: { uploadId: 'upload-123' }
    }

    // Act
    const response = await GET(event)

    // Assert
    expect(response.status).toBe(500)
    const text = await response.text()
    expect(text).toBe('Internal Server Error')
  })
})
