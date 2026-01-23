/**
 * Integration Tests for Static Data Loader (Story #148)
 *
 * Tests the integration between the API client and static JSON data loading.
 * Component-level integration tests are deferred to manual testing due to
 * environment variable reactivity limitations in the test environment.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { get } from 'svelte/store'
import * as familyStore from '../stores/familyStore.js'
import { api } from './api.js'

describe('Static Data Loader - API Integration', () => {
  beforeEach(() => {
    // Reset stores
    familyStore.people.set([])
    familyStore.relationships.set([])
    familyStore.loading.set(false)
    familyStore.error.set(null)

    // Mock fetch for static data
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    delete import.meta.env.VITE_VIEWER_MODE
    vi.unstubAllGlobals()
  })

  it('should use API endpoints when viewer mode is disabled', async () => {
    import.meta.env.VITE_VIEWER_MODE = 'false'

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    })

    await api.getAllPeople()

    expect(global.fetch).toHaveBeenCalledWith('/api/people')
    expect(global.fetch).not.toHaveBeenCalledWith('/data/people.json')
  })

  it('should use static files when viewer mode is enabled', async () => {
    import.meta.env.VITE_VIEWER_MODE = 'true'

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    })

    await api.getAllPeople()

    expect(global.fetch).toHaveBeenCalledWith('/data/people.json')
    expect(global.fetch).not.toHaveBeenCalledWith('/api/people')
  })

  it('should fetch both people and relationships in parallel', async () => {
    import.meta.env.VITE_VIEWER_MODE = 'true'

    const mockPeople = [
      { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male' }
    ]

    const mockRelationships = [
      { id: 1, person1Id: 1, person2Id: 2, type: 'spouse', parentRole: null }
    ]

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPeople
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRelationships
      })

    const [people, relationships] = await Promise.all([
      api.getAllPeople(),
      api.getAllRelationships()
    ])

    expect(people).toEqual(mockPeople)
    expect(relationships).toEqual(mockRelationships)
    expect(global.fetch).toHaveBeenCalledWith('/data/people.json')
    expect(global.fetch).toHaveBeenCalledWith('/data/relationships.json')
  })

  it('should populate stores with static data', async () => {
    import.meta.env.VITE_VIEWER_MODE = 'true'

    const mockPeople = [
      { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male' },
      { id: 2, firstName: 'Jane', lastName: 'Smith', gender: 'female' }
    ]

    const mockRelationships = [
      { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'father' }
    ]

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPeople
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRelationships
      })

    // Simulate App.svelte loadData() function
    familyStore.loading.set(true)
    try {
      const [peopleData, relationshipsData] = await Promise.all([
        api.getAllPeople(),
        api.getAllRelationships()
      ])
      familyStore.people.set(peopleData || [])
      familyStore.relationships.set(relationshipsData || [])
    } finally {
      familyStore.loading.set(false)
    }

    // Verify stores are populated
    expect(get(familyStore.people)).toEqual(mockPeople)
    expect(get(familyStore.relationships)).toEqual(mockRelationships)
    expect(get(familyStore.loading)).toBe(false)
  })

  it('should handle errors and populate error store', async () => {
    import.meta.env.VITE_VIEWER_MODE = 'true'

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Not Found'
    })

    // Simulate App.svelte loadData() function with error handling
    familyStore.loading.set(true)
    familyStore.error.set(null)
    try {
      await api.getAllPeople()
    } catch (err) {
      familyStore.error.set(err.message)
    } finally {
      familyStore.loading.set(false)
    }

    // Verify error store is populated
    expect(get(familyStore.error)).toBeTruthy()
    expect(get(familyStore.error)).toContain('people.json not found')
    expect(get(familyStore.loading)).toBe(false)
  })

  it('should maintain reactive stores after data load', async () => {
    import.meta.env.VITE_VIEWER_MODE = 'true'

    const mockPeople = [
      { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male' }
    ]

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPeople
    })

    const people = await api.getAllPeople()
    familyStore.people.set(people)

    // Manually update store (simulating reactive behavior)
    const newPerson = { id: 2, firstName: 'Jane', lastName: 'Smith', gender: 'female' }
    familyStore.people.update(p => [...p, newPerson])

    // Verify reactive update worked
    expect(get(familyStore.people)).toHaveLength(2)
    expect(get(familyStore.people)[1]).toEqual(newPerson)
  })

  it('should handle null/undefined optional fields from static JSON', async () => {
    import.meta.env.VITE_VIEWER_MODE = 'true'

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

    const people = await api.getAllPeople()

    expect(people[0].birthDate).toBeNull()
    expect(people[0].deathDate).toBeNull()
    expect(people[0].photoUrl).toBeNull()
  })

  it('should handle all relationship types from static JSON', async () => {
    import.meta.env.VITE_VIEWER_MODE = 'true'

    const mockRelationships = [
      { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' },
      { id: 2, person1Id: 3, person2Id: 2, type: 'parentOf', parentRole: 'father' },
      { id: 3, person1Id: 1, person2Id: 3, type: 'spouse', parentRole: null }
    ]

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRelationships
    })

    const relationships = await api.getAllRelationships()

    expect(relationships).toHaveLength(3)
    expect(relationships[0].type).toBe('parentOf')
    expect(relationships[0].parentRole).toBe('mother')
    expect(relationships[1].parentRole).toBe('father')
    expect(relationships[2].type).toBe('spouse')
    expect(relationships[2].parentRole).toBeNull()
  })
})
