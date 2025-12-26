/**
 * Tests for store test utilities.
 * Validates that test helper functions work correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { get } from 'svelte/store'
import { people, relationships, loading, error } from '../stores/familyStore.js'
import {
  mockStore,
  resetStores,
  captureStoreUpdates,
  createStoreSpy,
  waitForStoreValue,
  createTestFixture
} from './storeTestUtils.js'

describe('storeTestUtils', () => {
  beforeEach(() => {
    resetStores()
  })

  describe('mockStore', () => {
    it('should create a writable store with initial value', () => {
      const store = mockStore([])
      expect(get(store)).toEqual([])
    })

    it('should allow setting values', () => {
      const store = mockStore(0)
      store.set(42)
      expect(get(store)).toBe(42)
    })

    it('should allow updating values', () => {
      const store = mockStore([1, 2])
      store.update(arr => [...arr, 3])
      expect(get(store)).toEqual([1, 2, 3])
    })

    it('should allow subscribing to changes', () => {
      const store = mockStore('initial')
      let capturedValue = null

      const unsub = store.subscribe(value => {
        capturedValue = value
      })

      expect(capturedValue).toBe('initial')

      store.set('updated')
      expect(capturedValue).toBe('updated')

      unsub()
    })
  })

  describe('resetStores', () => {
    it('should reset all stores to initial state', () => {
      // Set stores to non-initial values
      people.set([{ id: 1, firstName: 'John' }])
      relationships.set([{ id: 1, person1Id: 1, person2Id: 2, type: 'spouse' }])
      loading.set(true)
      error.set('Error occurred')

      // Reset
      resetStores()

      // Verify all stores are reset
      expect(get(people)).toEqual([])
      expect(get(relationships)).toEqual([])
      expect(get(loading)).toBe(false)
      expect(get(error)).toBe(null)
    })

    it('should be idempotent (can be called multiple times)', () => {
      people.set([{ id: 1, firstName: 'John' }])

      resetStores()
      expect(get(people)).toEqual([])

      resetStores()
      expect(get(people)).toEqual([])

      resetStores()
      expect(get(people)).toEqual([])
    })
  })

  describe('captureStoreUpdates', () => {
    it('should capture initial value', () => {
      const { updates, unsubscribe } = captureStoreUpdates(people)

      expect(updates.length).toBe(1)
      expect(updates[0]).toEqual([])

      unsubscribe()
    })

    it('should capture all updates', () => {
      const { updates, unsubscribe } = captureStoreUpdates(people)

      people.set([{ id: 1, firstName: 'John' }])
      people.set([{ id: 2, firstName: 'Jane' }])

      expect(updates.length).toBe(3) // Initial + 2 updates
      expect(updates[0]).toEqual([])
      expect(updates[1]).toEqual([{ id: 1, firstName: 'John' }])
      expect(updates[2]).toEqual([{ id: 2, firstName: 'Jane' }])

      unsubscribe()
    })

    it('should stop capturing after unsubscribe', () => {
      const { updates, unsubscribe } = captureStoreUpdates(people)

      people.set([{ id: 1, firstName: 'John' }])
      expect(updates.length).toBe(2)

      unsubscribe()

      people.set([{ id: 2, firstName: 'Jane' }])
      expect(updates.length).toBe(2) // Should not increase
    })

    it('should work with multiple stores simultaneously', () => {
      const peopleCapture = captureStoreUpdates(people)
      const loadingCapture = captureStoreUpdates(loading)

      people.set([{ id: 1, firstName: 'John' }])
      loading.set(true)

      expect(peopleCapture.updates.length).toBe(2)
      expect(loadingCapture.updates.length).toBe(2)

      peopleCapture.unsubscribe()
      loadingCapture.unsubscribe()
    })
  })

  describe('createStoreSpy', () => {
    it('should track initial call', () => {
      const spy = createStoreSpy(people)

      expect(spy.callCount).toBe(1)
      expect(spy.values.length).toBe(1)
      expect(spy.values[0]).toEqual([])

      spy.unsubscribe()
    })

    it('should track all calls', () => {
      const spy = createStoreSpy(people)

      people.set([{ id: 1, firstName: 'John' }])
      people.set([{ id: 2, firstName: 'Jane' }])

      expect(spy.callCount).toBe(3)
      expect(spy.values[1]).toEqual([{ id: 1, firstName: 'John' }])
      expect(spy.values[2]).toEqual([{ id: 2, firstName: 'Jane' }])

      spy.unsubscribe()
    })

    it('should stop tracking after unsubscribe', () => {
      const spy = createStoreSpy(people)

      people.set([{ id: 1, firstName: 'John' }])
      expect(spy.callCount).toBe(2)

      spy.unsubscribe()

      people.set([{ id: 2, firstName: 'Jane' }])
      expect(spy.callCount).toBe(2) // Should not increase
    })
  })

  describe('waitForStoreValue', () => {
    it('should resolve when value matches', async () => {
      // Set value in next tick
      setTimeout(() => {
        loading.set(true)
      }, 10)

      await waitForStoreValue(loading, true)
      expect(get(loading)).toBe(true)
    })

    it('should resolve immediately if value already matches', async () => {
      people.set([{ id: 1, firstName: 'John' }])

      await waitForStoreValue(people, [{ id: 1, firstName: 'John' }])
      expect(get(people)).toEqual([{ id: 1, firstName: 'John' }])
    })

    it('should reject on timeout', async () => {
      let timedOut = false

      try {
        await waitForStoreValue(loading, true, 100) // Will timeout
      } catch (err) {
        timedOut = true
        expect(err.message).toContain('Timeout')
      }

      expect(timedOut).toBe(true)
    })

    it('should handle complex object values', async () => {
      const testData = [
        { id: 1, firstName: 'John', lastName: 'Doe' },
        { id: 2, firstName: 'Jane', lastName: 'Smith' }
      ]

      setTimeout(() => {
        people.set(testData)
      }, 10)

      await waitForStoreValue(people, testData)
      expect(get(people)).toEqual(testData)
    })
  })

  describe('createTestFixture', () => {
    it('should set up stores with provided data', () => {
      const testPeople = [{ id: 1, firstName: 'John' }]
      const testRelationships = [{ id: 1, person1Id: 1, person2Id: 2, type: 'spouse' }]

      createTestFixture({
        people: testPeople,
        relationships: testRelationships,
        loading: true,
        error: 'Test error'
      })

      expect(get(people)).toEqual(testPeople)
      expect(get(relationships)).toEqual(testRelationships)
      expect(get(loading)).toBe(true)
      expect(get(error)).toBe('Test error')
    })

    it('should use default values when options not provided', () => {
      createTestFixture()

      expect(get(people)).toEqual([])
      expect(get(relationships)).toEqual([])
      expect(get(loading)).toBe(false)
      expect(get(error)).toBe(null)
    })

    it('should allow partial configuration', () => {
      createTestFixture({
        people: [{ id: 1, firstName: 'John' }],
        loading: true
        // relationships and error will use defaults
      })

      expect(get(people)).toEqual([{ id: 1, firstName: 'John' }])
      expect(get(relationships)).toEqual([])
      expect(get(loading)).toBe(true)
      expect(get(error)).toBe(null)
    })

    it('should overwrite existing store values', () => {
      people.set([{ id: 99, firstName: 'Old' }])
      loading.set(true)

      createTestFixture({
        people: [{ id: 1, firstName: 'New' }],
        loading: false
      })

      expect(get(people)).toEqual([{ id: 1, firstName: 'New' }])
      expect(get(loading)).toBe(false)
    })
  })

  describe('integration - using multiple utilities together', () => {
    it('should work well together in test scenarios', () => {
      // This test may be affected by async operations from previous tests
      // Wait a bit for any pending subscriptions to complete
      return new Promise((resolve) => {
        setTimeout(() => {
          // Reset stores
          resetStores()

          // Capture updates first (before setting fixture data)
          const { updates, unsubscribe } = captureStoreUpdates(people)

          // Initial capture should have empty array
          expect(updates.length).toBe(1)
          expect(updates[0]).toEqual([])

          // Create test fixture
          createTestFixture({
            people: [{ id: 1, firstName: 'John' }],
            loading: true
          })

          // Verify fixture was set
          expect(updates.length).toBe(2)
          expect(updates[1]).toEqual([{ id: 1, firstName: 'John' }])

          // Make changes
          people.update(p => [...p, { id: 2, firstName: 'Jane' }])

          // Verify - should have initial + fixture set + update
          expect(updates.length).toBe(3)
          expect(updates[2]).toEqual([
            { id: 1, firstName: 'John' },
            { id: 2, firstName: 'Jane' }
          ])
          expect(get(loading)).toBe(true)

          // Cleanup
          unsubscribe()
          resetStores()
          expect(get(people)).toEqual([])

          resolve()
        }, 50)
      })
    })
  })
})
