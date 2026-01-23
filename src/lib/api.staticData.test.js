/**
 * Tests for Static Data Loader (Story #148)
 *
 * Tests the conditional logic for loading data from static JSON files
 * instead of API endpoints when running in viewer mode.
 *
 * Test Strategy:
 * - Unit tests for mode detection
 * - Unit tests for static file loading with valid/invalid JSON
 * - Unit tests for error handling (404, malformed JSON)
 * - Integration tests for full data loading flow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { api } from './api.js'

describe('Static Data Loader - Mode Detection', () => {
  let originalEnv

  beforeEach(() => {
    originalEnv = import.meta.env.VITE_VIEWER_MODE
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    import.meta.env.VITE_VIEWER_MODE = originalEnv
    vi.unstubAllGlobals()
  })

  it('should detect viewer mode when VITE_VIEWER_MODE is "true"', async () => {
    import.meta.env.VITE_VIEWER_MODE = 'true'

    // Mock successful static file fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    })

    await api.getAllPeople()

    // Should fetch from static file, not API endpoint
    expect(global.fetch).toHaveBeenCalledWith('/data/people.json')
    expect(global.fetch).not.toHaveBeenCalledWith('/api/people')
  })

  it('should use API mode when VITE_VIEWER_MODE is not set', async () => {
    delete import.meta.env.VITE_VIEWER_MODE

    // Mock successful API fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    })

    await api.getAllPeople()

    // Should fetch from API endpoint, not static file
    expect(global.fetch).toHaveBeenCalledWith('/api/people')
    expect(global.fetch).not.toHaveBeenCalledWith('/data/people.json')
  })

  it('should use API mode when VITE_VIEWER_MODE is "false"', async () => {
    import.meta.env.VITE_VIEWER_MODE = 'false'

    // Mock successful API fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    })

    await api.getAllPeople()

    // Should fetch from API endpoint
    expect(global.fetch).toHaveBeenCalledWith('/api/people')
  })
})

describe('Static Data Loader - getAllPeople()', () => {
  beforeEach(() => {
    import.meta.env.VITE_VIEWER_MODE = 'true'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    delete import.meta.env.VITE_VIEWER_MODE
    vi.unstubAllGlobals()
  })

  it('should load people from static JSON file', async () => {
    const mockPeople = [
      { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male' },
      { id: 2, firstName: 'Jane', lastName: 'Doe', gender: 'female' }
    ]

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPeople
    })

    const result = await api.getAllPeople()

    expect(result).toEqual(mockPeople)
    expect(global.fetch).toHaveBeenCalledWith('/data/people.json')
  })

  it('should handle empty people array', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    })

    const result = await api.getAllPeople()

    expect(result).toEqual([])
  })

  it('should throw error when people.json is not found (404)', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Not Found'
    })

    await expect(api.getAllPeople()).rejects.toThrow('Failed to load static data: people.json not found')
  })

  it('should throw error when people.json contains invalid JSON', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token')
      }
    })

    await expect(api.getAllPeople()).rejects.toThrow('Invalid JSON format in people.json')
  })

  it('should throw error on network failure', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'))

    await expect(api.getAllPeople()).rejects.toThrow('Failed to fetch people.json: Network error')
  })

  it('should preserve all person fields from JSON', async () => {
    const mockPeople = [
      {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1950-01-15',
        deathDate: '2020-06-30',
        gender: 'male',
        photoUrl: 'https://example.com/photo.jpg',
        birthSurname: 'Smith',
        nickname: 'Johnny'
      }
    ]

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPeople
    })

    const result = await api.getAllPeople()

    expect(result[0]).toEqual(mockPeople[0])
  })
})

describe('Static Data Loader - getAllRelationships()', () => {
  beforeEach(() => {
    import.meta.env.VITE_VIEWER_MODE = 'true'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    delete import.meta.env.VITE_VIEWER_MODE
    vi.unstubAllGlobals()
  })

  it('should load relationships from static JSON file', async () => {
    const mockRelationships = [
      { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'father' },
      { id: 2, person1Id: 3, person2Id: 4, type: 'spouse', parentRole: null }
    ]

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRelationships
    })

    const result = await api.getAllRelationships()

    expect(result).toEqual(mockRelationships)
    expect(global.fetch).toHaveBeenCalledWith('/data/relationships.json')
  })

  it('should handle empty relationships array', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    })

    const result = await api.getAllRelationships()

    expect(result).toEqual([])
  })

  it('should throw error when relationships.json is not found (404)', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Not Found'
    })

    await expect(api.getAllRelationships()).rejects.toThrow('Failed to load static data: relationships.json not found')
  })

  it('should throw error when relationships.json contains invalid JSON', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token')
      }
    })

    await expect(api.getAllRelationships()).rejects.toThrow('Invalid JSON format in relationships.json')
  })

  it('should preserve all relationship fields from JSON', async () => {
    const mockRelationships = [
      {
        id: 1,
        person1Id: 1,
        person2Id: 2,
        type: 'parentOf',
        parentRole: 'mother'
      }
    ]

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRelationships
    })

    const result = await api.getAllRelationships()

    expect(result[0]).toEqual(mockRelationships[0])
  })
})

describe('Static Data Loader - Write Operations', () => {
  beforeEach(() => {
    import.meta.env.VITE_VIEWER_MODE = 'true'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    delete import.meta.env.VITE_VIEWER_MODE
    vi.unstubAllGlobals()
  })

  it('should throw error when attempting to create person in viewer mode', async () => {
    const newPerson = { firstName: 'Alice', lastName: 'Smith' }

    await expect(api.createPerson(newPerson)).rejects.toThrow(
      'Cannot create person in viewer mode (read-only)'
    )
  })

  it('should throw error when attempting to update person in viewer mode', async () => {
    const updates = { firstName: 'Alice' }

    await expect(api.updatePerson(1, updates)).rejects.toThrow(
      'Cannot update person in viewer mode (read-only)'
    )
  })

  it('should throw error when attempting to delete person in viewer mode', async () => {
    await expect(api.deletePerson(1)).rejects.toThrow(
      'Cannot delete person in viewer mode (read-only)'
    )
  })

  it('should throw error when attempting to create relationship in viewer mode', async () => {
    const newRelationship = { person1Id: 1, person2Id: 2, type: 'spouse' }

    await expect(api.createRelationship(newRelationship)).rejects.toThrow(
      'Cannot create relationship in viewer mode (read-only)'
    )
  })

  it('should throw error when attempting to delete relationship in viewer mode', async () => {
    await expect(api.deleteRelationship(1)).rejects.toThrow(
      'Cannot delete relationship in viewer mode (read-only)'
    )
  })
})

describe('Static Data Loader - Performance', () => {
  beforeEach(() => {
    import.meta.env.VITE_VIEWER_MODE = 'true'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    delete import.meta.env.VITE_VIEWER_MODE
    vi.unstubAllGlobals()
  })

  it('should load 100 people in under 500ms', async () => {
    // Generate 100-person dataset
    const mockPeople = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      firstName: `Person${i + 1}`,
      lastName: 'Test',
      gender: i % 2 === 0 ? 'male' : 'female'
    }))

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPeople
    })

    const startTime = performance.now()
    const result = await api.getAllPeople()
    const endTime = performance.now()

    expect(result).toHaveLength(100)
    expect(endTime - startTime).toBeLessThan(500)
  })
})

describe('Static Data Loader - Data Format Compatibility', () => {
  beforeEach(() => {
    import.meta.env.VITE_VIEWER_MODE = 'true'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    delete import.meta.env.VITE_VIEWER_MODE
    vi.unstubAllGlobals()
  })

  it('should handle all relationship types correctly', async () => {
    const mockRelationships = [
      { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' },
      { id: 2, person1Id: 3, person2Id: 2, type: 'parentOf', parentRole: 'father' },
      { id: 3, person1Id: 1, person2Id: 3, type: 'spouse', parentRole: null }
    ]

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRelationships
    })

    const result = await api.getAllRelationships()

    expect(result).toHaveLength(3)
    expect(result[0].type).toBe('parentOf')
    expect(result[0].parentRole).toBe('mother')
    expect(result[1].parentRole).toBe('father')
    expect(result[2].type).toBe('spouse')
    expect(result[2].parentRole).toBeNull()
  })

  it('should handle null/undefined optional fields', async () => {
    const mockPeople = [
      {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        birthDate: null,
        deathDate: null,
        gender: 'unspecified',
        photoUrl: null,
        birthSurname: null,
        nickname: null
      }
    ]

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPeople
    })

    const result = await api.getAllPeople()

    expect(result[0].birthDate).toBeNull()
    expect(result[0].deathDate).toBeNull()
    expect(result[0].photoUrl).toBeNull()
  })
})
