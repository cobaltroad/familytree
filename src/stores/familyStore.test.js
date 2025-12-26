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

  describe('subscription behavior - unsubscribe', () => {
    beforeEach(() => {
      people.set([])
      relationships.set([])
      loading.set(false)
      error.set(null)
    })

    it('should stop receiving updates after unsubscribe', () => {
      let capturedValue = null
      let updateCount = 0

      const unsubscribe = people.subscribe(value => {
        capturedValue = value
        updateCount++
      })

      // Initial subscription triggers callback (updateCount = 1)
      expect(updateCount).toBe(1)
      expect(capturedValue).toEqual([])

      // First update
      people.set([{ id: 1, firstName: 'John' }])
      expect(updateCount).toBe(2)
      expect(capturedValue).toEqual([{ id: 1, firstName: 'John' }])

      // Unsubscribe
      unsubscribe()

      // Further updates should NOT trigger callback
      people.set([{ id: 2, firstName: 'Jane' }])
      expect(updateCount).toBe(2) // Should still be 2, not 3
      expect(capturedValue).toEqual([{ id: 1, firstName: 'John' }]) // Should still have old value
    })

    it('should stop receiving updates for loading store after unsubscribe', () => {
      let capturedValue = null
      let updateCount = 0

      const unsubscribe = loading.subscribe(value => {
        capturedValue = value
        updateCount++
      })

      // Initial subscription
      expect(updateCount).toBe(1)
      expect(capturedValue).toBe(false)

      // Update
      loading.set(true)
      expect(updateCount).toBe(2)
      expect(capturedValue).toBe(true)

      // Unsubscribe
      unsubscribe()

      // Further updates should NOT trigger callback
      loading.set(false)
      expect(updateCount).toBe(2)
      expect(capturedValue).toBe(true) // Old value
    })

    it('should stop receiving updates for error store after unsubscribe', () => {
      let capturedValue = null
      let updateCount = 0

      const unsubscribe = error.subscribe(value => {
        capturedValue = value
        updateCount++
      })

      // Initial subscription
      expect(updateCount).toBe(1)
      expect(capturedValue).toBe(null)

      // Update
      error.set('Error occurred')
      expect(updateCount).toBe(2)
      expect(capturedValue).toBe('Error occurred')

      // Unsubscribe
      unsubscribe()

      // Further updates should NOT trigger callback
      error.set('New error')
      expect(updateCount).toBe(2)
      expect(capturedValue).toBe('Error occurred') // Old value
    })
  })

  describe('multiple subscribers', () => {
    beforeEach(() => {
      people.set([])
      relationships.set([])
      loading.set(false)
      error.set(null)
    })

    it('should allow multiple subscribers to the same store', () => {
      let subscriber1Value = null
      let subscriber2Value = null
      let subscriber3Value = null

      const unsub1 = people.subscribe(value => { subscriber1Value = value })
      const unsub2 = people.subscribe(value => { subscriber2Value = value })
      const unsub3 = people.subscribe(value => { subscriber3Value = value })

      // All subscribers receive initial value
      expect(subscriber1Value).toEqual([])
      expect(subscriber2Value).toEqual([])
      expect(subscriber3Value).toEqual([])

      // Update store
      const testData = [{ id: 1, firstName: 'John' }]
      people.set(testData)

      // All subscribers receive the same update
      expect(subscriber1Value).toEqual(testData)
      expect(subscriber2Value).toEqual(testData)
      expect(subscriber3Value).toEqual(testData)

      unsub1()
      unsub2()
      unsub3()
    })

    it('should not affect other subscribers when one unsubscribes', () => {
      let subscriber1Value = null
      let subscriber2Value = null
      let subscriber1Count = 0
      let subscriber2Count = 0

      const unsub1 = people.subscribe(value => {
        subscriber1Value = value
        subscriber1Count++
      })
      const unsub2 = people.subscribe(value => {
        subscriber2Value = value
        subscriber2Count++
      })

      // Both receive initial value
      expect(subscriber1Count).toBe(1)
      expect(subscriber2Count).toBe(1)

      // Both receive first update
      people.set([{ id: 1, firstName: 'John' }])
      expect(subscriber1Count).toBe(2)
      expect(subscriber2Count).toBe(2)
      expect(subscriber1Value).toEqual([{ id: 1, firstName: 'John' }])
      expect(subscriber2Value).toEqual([{ id: 1, firstName: 'John' }])

      // Unsubscribe first subscriber
      unsub1()

      // Only second subscriber receives update
      people.set([{ id: 2, firstName: 'Jane' }])
      expect(subscriber1Count).toBe(2) // No change
      expect(subscriber2Count).toBe(3) // Incremented
      expect(subscriber1Value).toEqual([{ id: 1, firstName: 'John' }]) // Old value
      expect(subscriber2Value).toEqual([{ id: 2, firstName: 'Jane' }]) // New value

      unsub2()
    })

    it('should execute subscribers in order of subscription', () => {
      const executionOrder = []

      const unsub1 = people.subscribe(() => { executionOrder.push('subscriber1') })
      const unsub2 = people.subscribe(() => { executionOrder.push('subscriber2') })
      const unsub3 = people.subscribe(() => { executionOrder.push('subscriber3') })

      // Clear initial execution order
      executionOrder.length = 0

      // Trigger update
      people.set([{ id: 1, firstName: 'Test' }])

      // Subscribers should execute in subscription order
      expect(executionOrder).toEqual(['subscriber1', 'subscriber2', 'subscriber3'])

      unsub1()
      unsub2()
      unsub3()
    })

    it('should handle subscribers added during store update', () => {
      let subscriber1Value = null
      let subscriber2Value = null

      const unsub1 = people.subscribe(value => {
        subscriber1Value = value
      })

      // First update
      people.set([{ id: 1, firstName: 'John' }])
      expect(subscriber1Value).toEqual([{ id: 1, firstName: 'John' }])

      // Add second subscriber after first update
      const unsub2 = people.subscribe(value => {
        subscriber2Value = value
      })

      // Second subscriber gets current value immediately
      expect(subscriber2Value).toEqual([{ id: 1, firstName: 'John' }])

      // Both receive next update
      people.set([{ id: 2, firstName: 'Jane' }])
      expect(subscriber1Value).toEqual([{ id: 2, firstName: 'Jane' }])
      expect(subscriber2Value).toEqual([{ id: 2, firstName: 'Jane' }])

      unsub1()
      unsub2()
    })

    it('should handle all subscribers unsubscribing', () => {
      let count1 = 0
      let count2 = 0

      const unsub1 = people.subscribe(() => { count1++ })
      const unsub2 = people.subscribe(() => { count2++ })

      // Initial subscriptions
      expect(count1).toBe(1)
      expect(count2).toBe(1)

      // Update with subscribers
      people.set([{ id: 1, firstName: 'John' }])
      expect(count1).toBe(2)
      expect(count2).toBe(2)

      // Unsubscribe all
      unsub1()
      unsub2()

      // Update with no subscribers (should not error)
      people.set([{ id: 2, firstName: 'Jane' }])
      expect(count1).toBe(2) // No change
      expect(count2).toBe(2) // No change
    })
  })
})
