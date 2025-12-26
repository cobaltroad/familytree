import { describe, it, expect, vi, beforeEach } from 'vitest'
import { get } from 'svelte/store'
import { people, relationships, loading, error } from './familyStore.js'

/**
 * Integration tests for App.svelte store synchronization.
 * These tests verify that stores are properly synchronized when App.svelte
 * updates its local state.
 */

describe('App.svelte Store Synchronization', () => {
  beforeEach(() => {
    // Reset all stores to initial state
    people.set([])
    relationships.set([])
    loading.set(false)
    error.set(null)
  })

  describe('people store synchronization', () => {
    it('should sync when people array is set', () => {
      const testPeople = [
        { id: 1, firstName: 'John', lastName: 'Doe', birthDate: '1990-01-01', deathDate: null, gender: 'male' },
        { id: 2, firstName: 'Jane', lastName: 'Smith', birthDate: '1992-05-15', deathDate: null, gender: 'female' }
      ]

      // Simulate App.svelte setting people
      people.set(testPeople)

      const currentPeople = get(people)
      expect(currentPeople).toEqual(testPeople)
      expect(currentPeople.length).toBe(2)
    })

    it('should sync when a new person is added', () => {
      const initialPeople = [
        { id: 1, firstName: 'John', lastName: 'Doe' }
      ]
      people.set(initialPeople)

      // Simulate App.svelte adding a person
      const newPerson = { id: 2, firstName: 'Jane', lastName: 'Smith' }
      people.update(current => [...current, newPerson])

      const currentPeople = get(people)
      expect(currentPeople.length).toBe(2)
      expect(currentPeople[1]).toEqual(newPerson)
    })

    it('should sync when a person is updated', () => {
      const initialPeople = [
        { id: 1, firstName: 'John', lastName: 'Doe' },
        { id: 2, firstName: 'Jane', lastName: 'Smith' }
      ]
      people.set(initialPeople)

      // Simulate App.svelte updating a person
      const updatedPerson = { id: 1, firstName: 'John', lastName: 'Updated' }
      people.update(current => current.map(p => p.id === updatedPerson.id ? updatedPerson : p))

      const currentPeople = get(people)
      expect(currentPeople[0].lastName).toBe('Updated')
      expect(currentPeople[1].lastName).toBe('Smith')
    })

    it('should sync when a person is deleted', () => {
      const initialPeople = [
        { id: 1, firstName: 'John', lastName: 'Doe' },
        { id: 2, firstName: 'Jane', lastName: 'Smith' }
      ]
      people.set(initialPeople)

      // Simulate App.svelte deleting a person
      people.update(current => current.filter(p => p.id !== 1))

      const currentPeople = get(people)
      expect(currentPeople.length).toBe(1)
      expect(currentPeople[0].id).toBe(2)
    })
  })

  describe('relationships store synchronization', () => {
    it('should sync when relationships array is set', () => {
      const testRelationships = [
        { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' },
        { id: 2, person1Id: 3, person2Id: 2, type: 'parentOf', parentRole: 'father' }
      ]

      // Simulate App.svelte setting relationships
      relationships.set(testRelationships)

      const currentRelationships = get(relationships)
      expect(currentRelationships).toEqual(testRelationships)
      expect(currentRelationships.length).toBe(2)
    })

    it('should sync when a new relationship is added', () => {
      const initialRelationships = [
        { id: 1, person1Id: 1, person2Id: 2, type: 'spouse' }
      ]
      relationships.set(initialRelationships)

      // Simulate App.svelte adding a relationship
      const newRelationship = { id: 2, person1Id: 3, person2Id: 4, type: 'parentOf', parentRole: 'father' }
      relationships.update(current => [...current, newRelationship])

      const currentRelationships = get(relationships)
      expect(currentRelationships.length).toBe(2)
      expect(currentRelationships[1]).toEqual(newRelationship)
    })

    it('should sync when a relationship is deleted', () => {
      const initialRelationships = [
        { id: 1, person1Id: 1, person2Id: 2, type: 'spouse' },
        { id: 2, person1Id: 3, person2Id: 4, type: 'parentOf', parentRole: 'father' }
      ]
      relationships.set(initialRelationships)

      // Simulate App.svelte deleting a relationship
      relationships.update(current => current.filter(r => r.id !== 1))

      const currentRelationships = get(relationships)
      expect(currentRelationships.length).toBe(1)
      expect(currentRelationships[0].id).toBe(2)
    })

    it('should sync when relationships are filtered by person deletion', () => {
      const initialRelationships = [
        { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' },
        { id: 2, person1Id: 3, person2Id: 2, type: 'parentOf', parentRole: 'father' },
        { id: 3, person1Id: 4, person2Id: 5, type: 'spouse' }
      ]
      relationships.set(initialRelationships)

      const personIdToDelete = 2

      // Simulate App.svelte filtering relationships when person is deleted
      relationships.update(current => current.filter(r =>
        r.person1Id !== personIdToDelete && r.person2Id !== personIdToDelete
      ))

      const currentRelationships = get(relationships)
      expect(currentRelationships.length).toBe(1)
      expect(currentRelationships[0].id).toBe(3)
    })
  })

  describe('loading and error store synchronization', () => {
    it('should sync loading state during data fetch', () => {
      // Simulate App.svelte starting data load
      loading.set(true)
      expect(get(loading)).toBe(true)

      // Simulate App.svelte finishing data load
      loading.set(false)
      expect(get(loading)).toBe(false)
    })

    it('should sync error state when error occurs', () => {
      // Simulate App.svelte encountering an error
      error.set('Failed to load data')
      expect(get(error)).toBe('Failed to load data')

      // Simulate App.svelte clearing error
      error.set(null)
      expect(get(error)).toBe(null)
    })

    it('should sync both loading and error during error scenario', () => {
      // Simulate error scenario in App.svelte
      loading.set(true)
      error.set(null)

      expect(get(loading)).toBe(true)
      expect(get(error)).toBe(null)

      // Error occurs
      loading.set(false)
      error.set('Network error')

      expect(get(loading)).toBe(false)
      expect(get(error)).toBe('Network error')
    })
  })

  describe('multiple store updates in sequence', () => {
    it('should maintain consistency across multiple updates', () => {
      // Simulate loading data
      loading.set(true)
      expect(get(loading)).toBe(true)

      // Simulate receiving data
      const testPeople = [{ id: 1, firstName: 'John', lastName: 'Doe' }]
      const testRelationships = [{ id: 1, person1Id: 1, person2Id: 2, type: 'spouse' }]

      people.set(testPeople)
      relationships.set(testRelationships)
      loading.set(false)

      expect(get(people)).toEqual(testPeople)
      expect(get(relationships)).toEqual(testRelationships)
      expect(get(loading)).toBe(false)
      expect(get(error)).toBe(null)

      // Simulate adding a person
      const newPerson = { id: 2, firstName: 'Jane', lastName: 'Smith' }
      people.update(current => [...current, newPerson])

      expect(get(people).length).toBe(2)
      expect(get(relationships)).toEqual(testRelationships) // Should remain unchanged
    })
  })

  describe('store subscription behavior', () => {
    it('should notify subscribers when stores are updated', () => {
      const peopleUpdates = []
      const relationshipsUpdates = []
      const loadingUpdates = []
      const errorUpdates = []

      const unsubPeople = people.subscribe(value => peopleUpdates.push(value))
      const unsubRelationships = relationships.subscribe(value => relationshipsUpdates.push(value))
      const unsubLoading = loading.subscribe(value => loadingUpdates.push(value))
      const unsubError = error.subscribe(value => errorUpdates.push(value))

      // Make some updates
      people.set([{ id: 1, firstName: 'Test' }])
      relationships.set([{ id: 1, person1Id: 1, person2Id: 2, type: 'spouse' }])
      loading.set(true)
      error.set('Test error')

      // Each subscription should have received initial value + update
      expect(peopleUpdates.length).toBe(2) // Initial empty array + update
      expect(relationshipsUpdates.length).toBe(2)
      expect(loadingUpdates.length).toBe(2) // Initial false + update
      expect(errorUpdates.length).toBe(2) // Initial null + update

      unsubPeople()
      unsubRelationships()
      unsubLoading()
      unsubError()
    })
  })
})
