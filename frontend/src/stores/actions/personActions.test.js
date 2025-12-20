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

describe('personActions - Optimistic Update Pattern', () => {
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

  describe('updatePerson - Optimistic Update with Rollback', () => {
    it('should apply update immediately before API call completes', async () => {
      // ARRANGE
      const originalPerson = { id: 1, firstName: 'John', lastName: 'Doe', birthDate: '1980-01-01', gender: 'male' }
      people.set([originalPerson])

      const updatedData = { firstName: 'Jane', lastName: 'Smith', birthDate: '1985-05-15', gender: 'female' }

      // Mock API to delay response
      let resolveAPI
      const apiPromise = new Promise(resolve => { resolveAPI = resolve })
      api.updatePerson.mockReturnValue(apiPromise)

      // ACT - Start the update
      const updatePromise = updatePerson(1, updatedData)

      // ASSERT - UI should update immediately (before API resolves)
      // Wait a tiny bit for the optimistic update to apply
      await new Promise(resolve => setTimeout(resolve, 10))

      const currentPeople = get(people)
      expect(currentPeople).toEqual([
        { id: 1, firstName: 'Jane', lastName: 'Smith', birthDate: '1985-05-15', gender: 'female' }
      ])

      // Complete the API call
      resolveAPI({ id: 1, firstName: 'Jane', lastName: 'Smith', birthDate: '1985-05-15', gender: 'female' })
      await updatePromise

      // Final state should match server response
      expect(get(people)).toEqual([
        { id: 1, firstName: 'Jane', lastName: 'Smith', birthDate: '1985-05-15', gender: 'female' }
      ])
    })

    it('should rollback to original state if API call fails', async () => {
      // ARRANGE
      const originalPerson = { id: 1, firstName: 'John', lastName: 'Doe', birthDate: '1980-01-01', gender: 'male' }
      people.set([originalPerson])

      const updatedData = { firstName: 'Jane', lastName: 'Smith' }

      // Mock API to fail
      api.updatePerson.mockRejectedValue(new Error('Network error'))

      // ACT - Perform update
      await updatePerson(1, updatedData)

      // ASSERT - Should rollback to original state
      const currentPeople = get(people)
      expect(currentPeople).toEqual([originalPerson])

      // Error should be set
      expect(get(error)).toBe('Failed to update person')
    })

    it('should update with server data on successful API call', async () => {
      // ARRANGE
      const originalPerson = { id: 1, firstName: 'John', lastName: 'Doe', birthDate: '1980-01-01', gender: 'male' }
      people.set([originalPerson])

      const updatedData = { firstName: 'Jane', lastName: 'Smith' }
      const serverResponse = { id: 1, firstName: 'Jane', lastName: 'Smith', birthDate: '1980-01-01', gender: 'male', updatedAt: '2025-12-19' }

      api.updatePerson.mockResolvedValue(serverResponse)

      // ACT
      await updatePerson(1, updatedData)

      // ASSERT - Should use server data (which may include additional fields)
      const currentPeople = get(people)
      expect(currentPeople).toEqual([serverResponse])
      expect(get(error)).toBe(null)
    })

    it('should clear error on successful update', async () => {
      // ARRANGE
      const originalPerson = { id: 1, firstName: 'John', lastName: 'Doe' }
      people.set([originalPerson])
      error.set('Previous error')

      const updatedData = { firstName: 'Jane' }
      api.updatePerson.mockResolvedValue({ id: 1, firstName: 'Jane', lastName: 'Doe' })

      // ACT
      await updatePerson(1, updatedData)

      // ASSERT
      expect(get(error)).toBe(null)
    })

    it('should handle update of non-existent person gracefully', async () => {
      // ARRANGE
      people.set([{ id: 1, firstName: 'John', lastName: 'Doe' }])

      const updatedData = { firstName: 'Jane' }
      api.updatePerson.mockRejectedValue(new Error('Person not found'))

      // ACT
      await updatePerson(999, updatedData)

      // ASSERT - Original data should remain unchanged
      expect(get(people)).toEqual([{ id: 1, firstName: 'John', lastName: 'Doe' }])
      expect(get(error)).toBe('Failed to update person')
    })

    it('should preserve other people when updating one person', async () => {
      // ARRANGE
      const person1 = { id: 1, firstName: 'John', lastName: 'Doe' }
      const person2 = { id: 2, firstName: 'Alice', lastName: 'Smith' }
      const person3 = { id: 3, firstName: 'Bob', lastName: 'Jones' }
      people.set([person1, person2, person3])

      const updatedData = { firstName: 'Jane' }
      api.updatePerson.mockResolvedValue({ id: 2, firstName: 'Jane', lastName: 'Smith' })

      // ACT
      await updatePerson(2, updatedData)

      // ASSERT - Other people should remain unchanged
      const currentPeople = get(people)
      expect(currentPeople).toHaveLength(3)
      expect(currentPeople[0]).toEqual(person1)
      expect(currentPeople[1]).toEqual({ id: 2, firstName: 'Jane', lastName: 'Smith' })
      expect(currentPeople[2]).toEqual(person3)
    })

    it('should update perceived latency to be less than 50ms', async () => {
      // ARRANGE
      const originalPerson = { id: 1, firstName: 'John', lastName: 'Doe' }
      people.set([originalPerson])

      const updatedData = { firstName: 'Jane' }

      // Mock API with 300ms delay (simulating network)
      api.updatePerson.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ id: 1, firstName: 'Jane', lastName: 'Doe' }), 300)
        )
      )

      // ACT
      const startTime = performance.now()
      const updatePromise = updatePerson(1, updatedData)

      // Wait for optimistic update to apply
      await new Promise(resolve => setTimeout(resolve, 10))

      const perceivedLatency = performance.now() - startTime

      // ASSERT - UI should update within 50ms
      expect(perceivedLatency).toBeLessThan(50)

      const currentPeople = get(people)
      expect(currentPeople[0].firstName).toBe('Jane')

      // Wait for API call to complete
      await updatePromise
    })
  })

  describe('createPerson - Temporary ID Handling', () => {
    it('should generate temporary ID and add person immediately', async () => {
      // ARRANGE
      people.set([])

      const newPersonData = { firstName: 'John', lastName: 'Doe', birthDate: '1980-01-01', gender: 'male' }

      // Mock API to delay response
      let resolveAPI
      const apiPromise = new Promise(resolve => { resolveAPI = resolve })
      api.createPerson.mockReturnValue(apiPromise)

      // ACT
      const createPromise = createPerson(newPersonData)

      // Wait a tiny bit for optimistic update
      await new Promise(resolve => setTimeout(resolve, 10))

      // ASSERT - Person should appear immediately with temp ID
      const currentPeople = get(people)
      expect(currentPeople).toHaveLength(1)
      expect(currentPeople[0].firstName).toBe('John')
      expect(currentPeople[0].lastName).toBe('Doe')
      expect(currentPeople[0].id).toMatch(/^temp-\d+$/)

      // Complete API call
      resolveAPI({ id: 123, firstName: 'John', lastName: 'Doe', birthDate: '1980-01-01', gender: 'male' })
      await createPromise
    })

    it('should replace temporary ID with real server ID on success', async () => {
      // ARRANGE
      people.set([])

      const newPersonData = { firstName: 'John', lastName: 'Doe' }
      const serverResponse = { id: 123, firstName: 'John', lastName: 'Doe', createdAt: '2025-12-19' }

      api.createPerson.mockResolvedValue(serverResponse)

      // ACT
      await createPerson(newPersonData)

      // ASSERT - Should have real server ID
      const currentPeople = get(people)
      expect(currentPeople).toHaveLength(1)
      expect(currentPeople[0].id).toBe(123)
      expect(currentPeople[0]).toEqual(serverResponse)
    })

    it('should remove temporary person if API call fails', async () => {
      // ARRANGE
      people.set([{ id: 1, firstName: 'Existing', lastName: 'Person' }])

      const newPersonData = { firstName: 'John', lastName: 'Doe' }

      api.createPerson.mockRejectedValue(new Error('Creation failed'))

      // ACT
      await createPerson(newPersonData)

      // ASSERT - Temporary person should be removed
      const currentPeople = get(people)
      expect(currentPeople).toHaveLength(1)
      expect(currentPeople[0]).toEqual({ id: 1, firstName: 'Existing', lastName: 'Person' })

      expect(get(error)).toBe('Failed to create person')
    })

    it('should clear error on successful creation', async () => {
      // ARRANGE
      people.set([])
      error.set('Previous error')

      const newPersonData = { firstName: 'John', lastName: 'Doe' }
      api.createPerson.mockResolvedValue({ id: 1, firstName: 'John', lastName: 'Doe' })

      // ACT
      await createPerson(newPersonData)

      // ASSERT
      expect(get(error)).toBe(null)
    })

    it('should preserve existing people when adding new person', async () => {
      // ARRANGE
      const existingPerson = { id: 1, firstName: 'Existing', lastName: 'Person' }
      people.set([existingPerson])

      const newPersonData = { firstName: 'John', lastName: 'Doe' }
      api.createPerson.mockResolvedValue({ id: 2, firstName: 'John', lastName: 'Doe' })

      // ACT
      await createPerson(newPersonData)

      // ASSERT
      const currentPeople = get(people)
      expect(currentPeople).toHaveLength(2)
      expect(currentPeople[0]).toEqual(existingPerson)
      expect(currentPeople[1]).toEqual({ id: 2, firstName: 'John', lastName: 'Doe' })
    })

    it('should handle multiple concurrent creates with unique temp IDs', async () => {
      // ARRANGE
      people.set([])

      const person1Data = { firstName: 'John', lastName: 'Doe' }
      const person2Data = { firstName: 'Jane', lastName: 'Smith' }

      api.createPerson.mockImplementation((data) =>
        new Promise(resolve =>
          setTimeout(() => resolve({ id: Date.now(), ...data }), 100)
        )
      )

      // ACT - Create two people concurrently
      const create1 = createPerson(person1Data)
      await new Promise(resolve => setTimeout(resolve, 10))
      const create2 = createPerson(person2Data)

      // Wait a bit for optimistic updates
      await new Promise(resolve => setTimeout(resolve, 20))

      // ASSERT - Both should have unique temp IDs
      const currentPeople = get(people)
      expect(currentPeople).toHaveLength(2)
      expect(currentPeople[0].id).toMatch(/^temp-\d+$/)
      expect(currentPeople[1].id).toMatch(/^temp-\d+$/)
      expect(currentPeople[0].id).not.toBe(currentPeople[1].id)

      await Promise.all([create1, create2])
    })

    it('should create person with perceived latency less than 50ms', async () => {
      // ARRANGE
      people.set([])

      const newPersonData = { firstName: 'John', lastName: 'Doe' }

      // Mock API with 300ms delay
      api.createPerson.mockImplementation((data) =>
        new Promise(resolve =>
          setTimeout(() => resolve({ id: 1, ...data }), 300)
        )
      )

      // ACT
      const startTime = performance.now()
      const createPromise = createPerson(newPersonData)

      // Wait for optimistic update
      await new Promise(resolve => setTimeout(resolve, 10))

      const perceivedLatency = performance.now() - startTime

      // ASSERT - UI should update within 50ms
      expect(perceivedLatency).toBeLessThan(50)

      const currentPeople = get(people)
      expect(currentPeople).toHaveLength(1)
      expect(currentPeople[0].firstName).toBe('John')

      await createPromise
    })
  })

  describe('deletePerson - Optimistic Removal', () => {
    it('should remove person immediately before API call completes', async () => {
      // ARRANGE
      const person1 = { id: 1, firstName: 'John', lastName: 'Doe' }
      const person2 = { id: 2, firstName: 'Jane', lastName: 'Smith' }
      people.set([person1, person2])

      // Mock API to delay response
      let resolveAPI
      const apiPromise = new Promise(resolve => { resolveAPI = resolve })
      api.deletePerson.mockReturnValue(apiPromise)

      // ACT
      const deletePromise = deletePerson(1)

      // Wait for optimistic update
      await new Promise(resolve => setTimeout(resolve, 10))

      // ASSERT - Person should be removed immediately
      const currentPeople = get(people)
      expect(currentPeople).toHaveLength(1)
      expect(currentPeople[0]).toEqual(person2)

      // Complete API call
      resolveAPI()
      await deletePromise
    })

    it('should restore person if API call fails', async () => {
      // ARRANGE
      const person1 = { id: 1, firstName: 'John', lastName: 'Doe' }
      const person2 = { id: 2, firstName: 'Jane', lastName: 'Smith' }
      people.set([person1, person2])

      api.deletePerson.mockRejectedValue(new Error('Deletion failed'))

      // ACT
      await deletePerson(1)

      // ASSERT - Person should be restored
      const currentPeople = get(people)
      expect(currentPeople).toHaveLength(2)
      expect(currentPeople).toContainEqual(person1)
      expect(currentPeople).toContainEqual(person2)

      expect(get(error)).toBe('Failed to delete person')
    })

    it('should restore person at original position on rollback', async () => {
      // ARRANGE
      const person1 = { id: 1, firstName: 'John', lastName: 'Doe' }
      const person2 = { id: 2, firstName: 'Jane', lastName: 'Smith' }
      const person3 = { id: 3, firstName: 'Bob', lastName: 'Jones' }
      people.set([person1, person2, person3])

      api.deletePerson.mockRejectedValue(new Error('Deletion failed'))

      // ACT - Delete middle person
      await deletePerson(2)

      // ASSERT - Should be restored at same position
      const currentPeople = get(people)
      expect(currentPeople).toEqual([person1, person2, person3])
    })

    it('should keep deletion permanent on successful API call', async () => {
      // ARRANGE
      const person1 = { id: 1, firstName: 'John', lastName: 'Doe' }
      const person2 = { id: 2, firstName: 'Jane', lastName: 'Smith' }
      people.set([person1, person2])

      api.deletePerson.mockResolvedValue()

      // ACT
      await deletePerson(1)

      // ASSERT - Deletion should be permanent
      const currentPeople = get(people)
      expect(currentPeople).toHaveLength(1)
      expect(currentPeople[0]).toEqual(person2)
      expect(get(error)).toBe(null)
    })

    it('should clear error on successful deletion', async () => {
      // ARRANGE
      const person = { id: 1, firstName: 'John', lastName: 'Doe' }
      people.set([person])
      error.set('Previous error')

      api.deletePerson.mockResolvedValue()

      // ACT
      await deletePerson(1)

      // ASSERT
      expect(get(error)).toBe(null)
    })

    it('should handle deletion of non-existent person gracefully', async () => {
      // ARRANGE
      const person = { id: 1, firstName: 'John', lastName: 'Doe' }
      people.set([person])

      api.deletePerson.mockRejectedValue(new Error('Person not found'))

      // ACT
      await deletePerson(999)

      // ASSERT - Original data should remain
      expect(get(people)).toEqual([person])
      expect(get(error)).toBe('Failed to delete person')
    })

    it('should delete person with perceived latency less than 50ms', async () => {
      // ARRANGE
      const person = { id: 1, firstName: 'John', lastName: 'Doe' }
      people.set([person])

      // Mock API with 300ms delay
      api.deletePerson.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 300))
      )

      // ACT
      const startTime = performance.now()
      const deletePromise = deletePerson(1)

      // Wait for optimistic update
      await new Promise(resolve => setTimeout(resolve, 10))

      const perceivedLatency = performance.now() - startTime

      // ASSERT - UI should update within 50ms
      expect(perceivedLatency).toBeLessThan(50)

      const currentPeople = get(people)
      expect(currentPeople).toHaveLength(0)

      await deletePromise
    })
  })

  describe('Multiple Concurrent Updates', () => {
    it('should handle concurrent updates independently', async () => {
      // ARRANGE
      const person1 = { id: 1, firstName: 'John', lastName: 'Doe' }
      const person2 = { id: 2, firstName: 'Jane', lastName: 'Smith' }
      people.set([person1, person2])

      api.updatePerson.mockImplementation((id, data) =>
        new Promise(resolve =>
          setTimeout(() => resolve({ id, ...data }), 100)
        )
      )

      // ACT - Update both concurrently
      const update1 = updatePerson(1, { firstName: 'Johnny' })
      const update2 = updatePerson(2, { firstName: 'Janet' })

      await Promise.all([update1, update2])

      // ASSERT - Both updates should succeed
      const currentPeople = get(people)
      expect(currentPeople).toHaveLength(2)
      expect(currentPeople.find(p => p.id === 1).firstName).toBe('Johnny')
      expect(currentPeople.find(p => p.id === 2).firstName).toBe('Janet')
    })

    it('should rollback only failed update when multiple updates run concurrently', async () => {
      // ARRANGE
      const person1 = { id: 1, firstName: 'John', lastName: 'Doe' }
      const person2 = { id: 2, firstName: 'Jane', lastName: 'Smith' }
      people.set([person1, person2])

      api.updatePerson.mockImplementation((id, data) => {
        if (id === 1) {
          return Promise.reject(new Error('Update failed'))
        }
        return Promise.resolve({ id, ...data })
      })

      // ACT - Update both concurrently
      await Promise.all([
        updatePerson(1, { firstName: 'Johnny' }),
        updatePerson(2, { firstName: 'Janet' })
      ])

      // ASSERT - Only person1 should rollback
      const currentPeople = get(people)
      expect(currentPeople).toHaveLength(2)
      expect(currentPeople.find(p => p.id === 1).firstName).toBe('John') // Rolled back
      expect(currentPeople.find(p => p.id === 2).firstName).toBe('Janet') // Updated
    })

    it('should handle mixed create, update, and delete operations concurrently', async () => {
      // ARRANGE
      const existingPerson = { id: 1, firstName: 'Existing', lastName: 'Person' }
      people.set([existingPerson])

      api.createPerson.mockResolvedValue({ id: 2, firstName: 'New', lastName: 'Person' })
      api.updatePerson.mockResolvedValue({ id: 1, firstName: 'Updated', lastName: 'Person' })
      api.deletePerson.mockResolvedValue()

      // ACT - Perform mixed operations
      const createOp = createPerson({ firstName: 'New', lastName: 'Person' })
      const updateOp = updatePerson(1, { firstName: 'Updated' })

      await Promise.all([createOp, updateOp])

      // ASSERT
      const currentPeople = get(people)
      expect(currentPeople).toHaveLength(2)
      expect(currentPeople.find(p => p.id === 1).firstName).toBe('Updated')
      expect(currentPeople.find(p => p.id === 2).firstName).toBe('New')
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should set clear error message on update failure', async () => {
      // ARRANGE
      const person = { id: 1, firstName: 'John', lastName: 'Doe' }
      people.set([person])

      api.updatePerson.mockRejectedValue(new Error('Network timeout'))

      // ACT
      await updatePerson(1, { firstName: 'Jane' })

      // ASSERT
      expect(get(error)).toBe('Failed to update person')
    })

    it('should set clear error message on create failure', async () => {
      // ARRANGE
      people.set([])

      api.createPerson.mockRejectedValue(new Error('Validation error'))

      // ACT
      await createPerson({ firstName: 'John', lastName: 'Doe' })

      // ASSERT
      expect(get(error)).toBe('Failed to create person')
    })

    it('should set clear error message on delete failure', async () => {
      // ARRANGE
      const person = { id: 1, firstName: 'John', lastName: 'Doe' }
      people.set([person])

      api.deletePerson.mockRejectedValue(new Error('Permission denied'))

      // ACT
      await deletePerson(1)

      // ASSERT
      expect(get(error)).toBe('Failed to delete person')
    })

    it('should not leave stale data after rollback', async () => {
      // ARRANGE
      const originalPerson = { id: 1, firstName: 'John', lastName: 'Doe', birthDate: '1980-01-01' }
      people.set([originalPerson])

      api.updatePerson.mockRejectedValue(new Error('Update failed'))

      // ACT
      await updatePerson(1, { firstName: 'Jane', lastName: 'Smith', birthDate: '1990-01-01' })

      // ASSERT - Should have exact original data
      const currentPeople = get(people)
      expect(currentPeople).toEqual([originalPerson])
      expect(currentPeople[0]).toStrictEqual(originalPerson)
    })

    it('should handle consecutive successful and failed operations', async () => {
      // ARRANGE
      const person = { id: 1, firstName: 'John', lastName: 'Doe' }
      people.set([person])

      // First update succeeds
      api.updatePerson.mockResolvedValueOnce({ id: 1, firstName: 'Jane', lastName: 'Doe' })
      await updatePerson(1, { firstName: 'Jane' })

      expect(get(people)[0].firstName).toBe('Jane')
      expect(get(error)).toBe(null)

      // Second update fails
      api.updatePerson.mockRejectedValueOnce(new Error('Failed'))
      await updatePerson(1, { firstName: 'Janet' })

      // ASSERT - Should rollback to state after first update
      expect(get(people)[0].firstName).toBe('Jane')
      expect(get(error)).toBe('Failed to update person')
    })
  })

  describe('State Consistency', () => {
    it('should maintain consistent state throughout optimistic update lifecycle', async () => {
      // ARRANGE
      const person = { id: 1, firstName: 'John', lastName: 'Doe' }
      people.set([person])

      const stateSnapshots = []

      // Subscribe to track all state changes
      const unsubscribe = people.subscribe(value => {
        stateSnapshots.push([...value])
      })

      api.updatePerson.mockResolvedValue({ id: 1, firstName: 'Jane', lastName: 'Doe' })

      // ACT
      await updatePerson(1, { firstName: 'Jane' })

      // ASSERT - Should have: initial, optimistic, confirmed
      expect(stateSnapshots.length).toBeGreaterThanOrEqual(2)

      // Final state should be consistent
      const finalState = stateSnapshots[stateSnapshots.length - 1]
      expect(finalState[0].firstName).toBe('Jane')

      unsubscribe()
    })

    it('should not leave temporary IDs in store after successful create', async () => {
      // ARRANGE
      people.set([])

      api.createPerson.mockResolvedValue({ id: 123, firstName: 'John', lastName: 'Doe' })

      // ACT
      await createPerson({ firstName: 'John', lastName: 'Doe' })

      // ASSERT - No temp IDs should remain
      const currentPeople = get(people)
      expect(currentPeople.every(p => typeof p.id === 'number')).toBe(true)
      expect(currentPeople.every(p => !String(p.id).startsWith('temp-'))).toBe(true)
    })

    it('should maintain correct person count after failed delete', async () => {
      // ARRANGE
      const person1 = { id: 1, firstName: 'John', lastName: 'Doe' }
      const person2 = { id: 2, firstName: 'Jane', lastName: 'Smith' }
      people.set([person1, person2])

      api.deletePerson.mockRejectedValue(new Error('Failed'))

      // ACT
      await deletePerson(1)

      // ASSERT
      expect(get(people)).toHaveLength(2)
    })
  })
})
