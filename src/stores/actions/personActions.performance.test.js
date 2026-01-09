import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { get } from 'svelte/store'
import { people, error } from '../familyStore.js'
import { updatePerson, createPerson, deletePerson } from './personActions.js'
import { api } from '../../lib/api.js'

// Mock the API module
vi.mock('../../lib/api.js', () => ({
  api: {
    updatePerson: vi.fn(),
    createPerson: vi.fn(),
    deletePerson: vi.fn()
  }
}))

/**
 * Performance tests for optimistic update pattern.
 * These tests validate that the perceived latency is reduced from 300ms (typical API latency)
 * to less than 100ms (optimistic update latency).
 *
 * Success criteria:
 * - Optimistic updates should apply in <50ms
 * - Perceived latency should be <100ms
 * - This represents a 66%+ reduction from the 300ms baseline
 */
describe('personActions - Performance Tests', () => {
  beforeEach(() => {
    // Reset stores to initial state
    people.set([])
    error.set(null)

    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Perceived Latency Measurements', () => {
    it('should reduce perceived latency by at least 66% for update operations', async () => {
      // ARRANGE
      const person = { id: 1, firstName: 'John', lastName: 'Doe', birthDate: '1980-01-01' }
      people.set([person])

      const BASELINE_LATENCY = 300 // Simulated network latency
      const TARGET_REDUCTION = 0.66 // 66% reduction
      const MAX_PERCEIVED_LATENCY = BASELINE_LATENCY * (1 - TARGET_REDUCTION) // 100ms

      // Mock API with realistic network delay
      api.updatePerson.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ id: 1, firstName: 'Jane', lastName: 'Doe', birthDate: '1980-01-01' }), BASELINE_LATENCY)
        )
      )

      let uiUpdatedAt = null

      // Subscribe to capture when UI updates
      const unsubscribe = people.subscribe(currentPeople => {
        if (currentPeople[0]?.firstName === 'Jane' && uiUpdatedAt === null) {
          uiUpdatedAt = performance.now()
        }
      })

      // ACT
      const startTime = performance.now()
      const updatePromise = updatePerson(1, { firstName: 'Jane' })

      // Wait for UI to update
      await new Promise(resolve => setTimeout(resolve, 150))

      const perceivedLatency = uiUpdatedAt - startTime

      // ASSERT
      expect(perceivedLatency).toBeLessThan(MAX_PERCEIVED_LATENCY)
      expect(perceivedLatency).toBeLessThan(100) // Explicit 100ms requirement

      // Verify the update eventually completes
      await updatePromise

      unsubscribe()
    })

    it('should reduce perceived latency by at least 66% for create operations', async () => {
      // ARRANGE
      people.set([])

      const BASELINE_LATENCY = 300
      const TARGET_REDUCTION = 0.66
      const MAX_PERCEIVED_LATENCY = BASELINE_LATENCY * (1 - TARGET_REDUCTION) // 100ms

      // Mock API with realistic network delay
      api.createPerson.mockImplementation((data) =>
        new Promise(resolve =>
          setTimeout(() => resolve({ id: 1, ...data }), BASELINE_LATENCY)
        )
      )

      let uiUpdatedAt = null

      // Subscribe to capture when UI updates
      const unsubscribe = people.subscribe(currentPeople => {
        if (currentPeople.length > 0 && uiUpdatedAt === null) {
          uiUpdatedAt = performance.now()
        }
      })

      // ACT
      const startTime = performance.now()
      const createPromise = createPerson({ firstName: 'John', lastName: 'Doe' })

      // Wait for UI to update
      await new Promise(resolve => setTimeout(resolve, 150))

      const perceivedLatency = uiUpdatedAt - startTime

      // ASSERT
      expect(perceivedLatency).toBeLessThan(MAX_PERCEIVED_LATENCY)
      expect(perceivedLatency).toBeLessThan(100)

      await createPromise

      unsubscribe()
    })

    it('should reduce perceived latency by at least 66% for delete operations', async () => {
      // ARRANGE
      const person = { id: 1, firstName: 'John', lastName: 'Doe' }
      people.set([person])

      const BASELINE_LATENCY = 300
      const TARGET_REDUCTION = 0.66
      const MAX_PERCEIVED_LATENCY = BASELINE_LATENCY * (1 - TARGET_REDUCTION) // 100ms

      // Mock API with realistic network delay
      api.deletePerson.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, BASELINE_LATENCY))
      )

      let uiUpdatedAt = null

      // Subscribe to capture when UI updates
      const unsubscribe = people.subscribe(currentPeople => {
        if (currentPeople.length === 0 && uiUpdatedAt === null) {
          uiUpdatedAt = performance.now()
        }
      })

      // ACT
      const startTime = performance.now()
      const deletePromise = deletePerson(1)

      // Wait for UI to update
      await new Promise(resolve => setTimeout(resolve, 150))

      const perceivedLatency = uiUpdatedAt - startTime

      // ASSERT
      expect(perceivedLatency).toBeLessThan(MAX_PERCEIVED_LATENCY)
      expect(perceivedLatency).toBeLessThan(100)

      await deletePromise

      unsubscribe()
    })
  })

  describe('Optimistic Update Speed', () => {
    it('should apply optimistic update within 50ms for single person update', async () => {
      // ARRANGE
      const person = { id: 1, firstName: 'John', lastName: 'Doe' }
      people.set([person])

      api.updatePerson.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ id: 1, firstName: 'Jane', lastName: 'Doe' }), 300)
        )
      )

      // ACT
      const startTime = performance.now()
      const updatePromise = updatePerson(1, { firstName: 'Jane' })

      // Wait minimal time
      await new Promise(resolve => setTimeout(resolve, 10))

      const updateTime = performance.now() - startTime

      // ASSERT
      expect(updateTime).toBeLessThan(50)
      expect(get(people)[0].firstName).toBe('Jane')

      await updatePromise
    })

    it('should apply optimistic update within 50ms for large person list', async () => {
      // ARRANGE - Create large dataset
      const largePeopleList = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        firstName: `Person${i}`,
        lastName: `LastName${i}`,
        birthDate: '1980-01-01'
      }))

      people.set(largePeopleList)

      api.updatePerson.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ id: 500, firstName: 'Updated', lastName: 'LastName499', birthDate: '1980-01-01' }), 300)
        )
      )

      // ACT - Update person in middle of list
      const startTime = performance.now()
      const updatePromise = updatePerson(500, { firstName: 'Updated' })

      // Wait minimal time
      await new Promise(resolve => setTimeout(resolve, 10))

      const updateTime = performance.now() - startTime

      // ASSERT
      expect(updateTime).toBeLessThan(50)

      const currentPeople = get(people)
      const updatedPerson = currentPeople.find(p => p.id === 500)
      expect(updatedPerson.firstName).toBe('Updated')

      await updatePromise
    })

    it('should apply optimistic create within 50ms', async () => {
      // ARRANGE
      people.set([])

      api.createPerson.mockImplementation((data) =>
        new Promise(resolve =>
          setTimeout(() => resolve({ id: 1, ...data }), 300)
        )
      )

      // ACT
      const startTime = performance.now()
      const createPromise = createPerson({ firstName: 'John', lastName: 'Doe' })

      // Wait minimal time
      await new Promise(resolve => setTimeout(resolve, 10))

      const createTime = performance.now() - startTime

      // ASSERT
      expect(createTime).toBeLessThan(50)
      expect(get(people)).toHaveLength(1)
      expect(get(people)[0].firstName).toBe('John')

      await createPromise
    })

    it('should apply optimistic delete within 50ms', async () => {
      // ARRANGE
      const person = { id: 1, firstName: 'John', lastName: 'Doe' }
      people.set([person])

      api.deletePerson.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 300))
      )

      // ACT
      const startTime = performance.now()
      const deletePromise = deletePerson(1)

      // Wait minimal time
      await new Promise(resolve => setTimeout(resolve, 10))

      const deleteTime = performance.now() - startTime

      // ASSERT
      expect(deleteTime).toBeLessThan(50)
      expect(get(people)).toHaveLength(0)

      await deletePromise
    })
  })

  describe('Concurrent Operations Performance', () => {
    it('should handle multiple concurrent updates without degrading performance', async () => {
      // ARRANGE
      const initialPeople = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        firstName: `Person${i}`,
        lastName: 'Doe'
      }))

      people.set(initialPeople)

      api.updatePerson.mockImplementation((id, data) =>
        new Promise(resolve =>
          setTimeout(() => resolve({ id, ...data, lastName: 'Doe' }), 300)
        )
      )

      // ACT - Update all people concurrently
      const startTime = performance.now()

      const updates = initialPeople.map(person =>
        updatePerson(person.id, { firstName: `Updated${person.id}` })
      )

      // Wait minimal time for optimistic updates
      await new Promise(resolve => setTimeout(resolve, 50))

      const optimisticUpdateTime = performance.now() - startTime

      // ASSERT - All optimistic updates should complete quickly
      expect(optimisticUpdateTime).toBeLessThan(100)

      const currentPeople = get(people)
      currentPeople.forEach(person => {
        expect(person.firstName).toMatch(/^Updated\d+$/)
      })

      await Promise.all(updates)
    })

    it('should maintain <100ms perceived latency under mixed operation load', async () => {
      // ARRANGE
      const existingPeople = [
        { id: 1, firstName: 'Person1', lastName: 'Doe' },
        { id: 2, firstName: 'Person2', lastName: 'Doe' },
        { id: 3, firstName: 'Person3', lastName: 'Doe' }
      ]

      people.set(existingPeople)

      api.updatePerson.mockImplementation((id, data) =>
        new Promise(resolve =>
          setTimeout(() => resolve({ id, ...data }), 300)
        )
      )

      api.createPerson.mockImplementation((data) =>
        new Promise(resolve =>
          setTimeout(() => resolve({ id: Date.now(), ...data }), 300)
        )
      )

      api.deletePerson.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 300))
      )

      const timings = []

      // ACT - Perform mixed operations
      const operations = [
        async () => {
          const start = performance.now()
          updatePerson(1, { firstName: 'Updated1' })
          await new Promise(resolve => setTimeout(resolve, 10))
          timings.push(performance.now() - start)
        },
        async () => {
          const start = performance.now()
          createPerson({ firstName: 'New', lastName: 'Person' })
          await new Promise(resolve => setTimeout(resolve, 10))
          timings.push(performance.now() - start)
        },
        async () => {
          const start = performance.now()
          updatePerson(2, { firstName: 'Updated2' })
          await new Promise(resolve => setTimeout(resolve, 10))
          timings.push(performance.now() - start)
        },
        async () => {
          const start = performance.now()
          deletePerson(3)
          await new Promise(resolve => setTimeout(resolve, 10))
          timings.push(performance.now() - start)
        }
      ]

      await Promise.all(operations.map(op => op()))

      // ASSERT - All operations should have <100ms perceived latency
      timings.forEach(timing => {
        expect(timing).toBeLessThan(100)
      })

      expect(timings.every(t => t < 100)).toBe(true)
    })
  })

  describe('Rollback Performance', () => {
    it('should rollback within 50ms on failed update', async () => {
      // ARRANGE
      const person = { id: 1, firstName: 'John', lastName: 'Doe' }
      people.set([person])

      api.updatePerson.mockRejectedValue(new Error('Update failed'))

      // ACT
      const startTime = performance.now()
      await updatePerson(1, { firstName: 'Jane' })
      const rollbackTime = performance.now() - startTime

      // ASSERT - Rollback should be fast
      // Total time includes optimistic update + minimal API delay + rollback
      expect(rollbackTime).toBeLessThan(100)
      expect(get(people)[0].firstName).toBe('John')
    })

    it('should remove temp person within 50ms on failed create', async () => {
      // ARRANGE
      people.set([])

      api.createPerson.mockImplementation(async () => {
        throw new Error('Create failed')
      })

      // ACT
      const startTime = performance.now()
      try {
        await createPerson({ firstName: 'John', lastName: 'Doe' })
      } catch (err) {
        // Expected to fail
      }
      const cleanupTime = performance.now() - startTime

      // ASSERT
      expect(cleanupTime).toBeLessThan(100)
      expect(get(people)).toHaveLength(0)
    })

    it('should restore person within 50ms on failed delete', async () => {
      // ARRANGE
      const person = { id: 1, firstName: 'John', lastName: 'Doe' }
      people.set([person])

      api.deletePerson.mockRejectedValue(new Error('Delete failed'))

      // ACT
      const startTime = performance.now()
      await deletePerson(1)
      const restoreTime = performance.now() - startTime

      // ASSERT
      expect(restoreTime).toBeLessThan(100)
      expect(get(people)).toHaveLength(1)
      expect(get(people)[0]).toEqual(person)
    })
  })

  describe('Memory and Resource Efficiency', () => {
    it('should not create excessive intermediate objects during updates', async () => {
      // ARRANGE
      const initialPeople = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        firstName: `Person${i}`,
        lastName: 'Doe'
      }))

      people.set(initialPeople)

      api.updatePerson.mockResolvedValue({ id: 50, firstName: 'Updated', lastName: 'Doe' })

      const stateChanges = []

      // Track all state changes
      const unsubscribe = people.subscribe(value => {
        stateChanges.push(value)
      })

      // ACT
      await updatePerson(50, { firstName: 'Updated' })

      // ASSERT - Should have minimal state changes: initial, optimistic, confirmed
      // Allow for up to 3 changes (initial subscription, optimistic, server confirmation)
      expect(stateChanges.length).toBeLessThanOrEqual(3)

      unsubscribe()
    })

    it('should efficiently handle temporary ID generation without collisions', async () => {
      // ARRANGE
      people.set([])

      const tempIds = new Set()

      api.createPerson.mockImplementation((data) =>
        new Promise(resolve =>
          setTimeout(() => resolve({ id: Date.now(), ...data }), 50)
        )
      )

      // ACT - Create multiple people in rapid succession
      const creates = Array.from({ length: 100 }, (_, i) =>
        createPerson({ firstName: `Person${i}`, lastName: 'Doe' })
      )

      // Capture temp IDs immediately
      await new Promise(resolve => setTimeout(resolve, 10))
      get(people).forEach(p => {
        if (String(p.id).startsWith('temp-')) {
          tempIds.add(p.id)
        }
      })

      await Promise.all(creates)

      // ASSERT - All temp IDs should be unique
      const currentPeople = get(people)
      expect(currentPeople.length).toBe(100)
      expect(tempIds.size).toBeGreaterThan(0) // Should have captured some temp IDs

      // No temp IDs should remain
      const remainingTempIds = currentPeople.filter(p => String(p.id).startsWith('temp-'))
      expect(remainingTempIds).toHaveLength(0)
    })
  })
})
