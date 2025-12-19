import { describe, it, expect, beforeEach } from 'vitest'
import { get } from 'svelte/store'
import { people, relationships, loading, error } from './familyStore.js'

describe('familyStore', () => {
  describe('people store', () => {
    beforeEach(() => {
      // Reset store to initial state
      people.set([])
    })

    it('should initialize as an empty array', () => {
      const value = get(people)
      expect(value).toEqual([])
      expect(Array.isArray(value)).toBe(true)
    })

    it('should allow setting people array', () => {
      const testPeople = [
        { id: 1, firstName: 'John', lastName: 'Doe' },
        { id: 2, firstName: 'Jane', lastName: 'Smith' }
      ]

      people.set(testPeople)

      const value = get(people)
      expect(value).toEqual(testPeople)
      expect(value.length).toBe(2)
    })

    it('should allow updating people array', () => {
      const initial = [{ id: 1, firstName: 'John', lastName: 'Doe' }]
      people.set(initial)

      people.update(current => [...current, { id: 2, firstName: 'Jane', lastName: 'Smith' }])

      const value = get(people)
      expect(value.length).toBe(2)
      expect(value[1].firstName).toBe('Jane')
    })

    it('should allow subscribing to changes', () => {
      let capturedValue
      const unsubscribe = people.subscribe(value => {
        capturedValue = value
      })

      people.set([{ id: 1, firstName: 'Test', lastName: 'Person' }])

      expect(capturedValue).toEqual([{ id: 1, firstName: 'Test', lastName: 'Person' }])

      unsubscribe()
    })
  })

  describe('relationships store', () => {
    beforeEach(() => {
      relationships.set([])
    })

    it('should initialize as an empty array', () => {
      const value = get(relationships)
      expect(value).toEqual([])
      expect(Array.isArray(value)).toBe(true)
    })

    it('should allow setting relationships array', () => {
      const testRelationships = [
        { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' },
        { id: 2, person1Id: 3, person2Id: 2, type: 'parentOf', parentRole: 'father' }
      ]

      relationships.set(testRelationships)

      const value = get(relationships)
      expect(value).toEqual(testRelationships)
      expect(value.length).toBe(2)
    })

    it('should allow updating relationships array', () => {
      const initial = [{ id: 1, person1Id: 1, person2Id: 2, type: 'spouse' }]
      relationships.set(initial)

      relationships.update(current => [...current, { id: 2, person1Id: 3, person2Id: 4, type: 'parentOf', parentRole: 'father' }])

      const value = get(relationships)
      expect(value.length).toBe(2)
      expect(value[1].type).toBe('parentOf')
    })

    it('should allow subscribing to changes', () => {
      let capturedValue
      const unsubscribe = relationships.subscribe(value => {
        capturedValue = value
      })

      relationships.set([{ id: 1, person1Id: 1, person2Id: 2, type: 'spouse' }])

      expect(capturedValue).toEqual([{ id: 1, person1Id: 1, person2Id: 2, type: 'spouse' }])

      unsubscribe()
    })
  })

  describe('loading store', () => {
    beforeEach(() => {
      loading.set(false)
    })

    it('should initialize as false', () => {
      const value = get(loading)
      expect(value).toBe(false)
    })

    it('should allow setting to true', () => {
      loading.set(true)
      expect(get(loading)).toBe(true)
    })

    it('should allow setting to false', () => {
      loading.set(true)
      loading.set(false)
      expect(get(loading)).toBe(false)
    })

    it('should allow subscribing to changes', () => {
      let capturedValue
      const unsubscribe = loading.subscribe(value => {
        capturedValue = value
      })

      loading.set(true)
      expect(capturedValue).toBe(true)

      loading.set(false)
      expect(capturedValue).toBe(false)

      unsubscribe()
    })
  })

  describe('error store', () => {
    beforeEach(() => {
      error.set(null)
    })

    it('should initialize as null', () => {
      const value = get(error)
      expect(value).toBe(null)
    })

    it('should allow setting error message', () => {
      error.set('Something went wrong')
      expect(get(error)).toBe('Something went wrong')
    })

    it('should allow clearing error by setting to null', () => {
      error.set('Error message')
      error.set(null)
      expect(get(error)).toBe(null)
    })

    it('should allow subscribing to changes', () => {
      let capturedValue
      const unsubscribe = error.subscribe(value => {
        capturedValue = value
      })

      error.set('Test error')
      expect(capturedValue).toBe('Test error')

      error.set(null)
      expect(capturedValue).toBe(null)

      unsubscribe()
    })
  })

  describe('store independence', () => {
    beforeEach(() => {
      // Reset all stores to initial state
      people.set([])
      relationships.set([])
      loading.set(false)
      error.set(null)
    })

    it('should maintain separate state for each store', () => {
      people.set([{ id: 1, firstName: 'John' }])
      relationships.set([{ id: 1, person1Id: 1, person2Id: 2, type: 'spouse' }])
      loading.set(true)
      error.set('Test error')

      expect(get(people)).toEqual([{ id: 1, firstName: 'John' }])
      expect(get(relationships)).toEqual([{ id: 1, person1Id: 1, person2Id: 2, type: 'spouse' }])
      expect(get(loading)).toBe(true)
      expect(get(error)).toBe('Test error')
    })

    it('should not affect other stores when one is updated', () => {
      people.set([{ id: 1, firstName: 'John' }])
      relationships.set([{ id: 1, person1Id: 1, person2Id: 2, type: 'spouse' }])

      // Update one store
      people.set([{ id: 2, firstName: 'Jane' }])

      // Other stores should remain unchanged
      expect(get(relationships)).toEqual([{ id: 1, person1Id: 1, person2Id: 2, type: 'spouse' }])
      expect(get(loading)).toBe(false)
      expect(get(error)).toBe(null)
    })
  })
})
