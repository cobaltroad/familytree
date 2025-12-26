import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { get } from 'svelte/store'
import { people } from '../familyStore.js'
import { notifications } from '../notificationStore.js'
import { peopleById, relationshipsByPerson } from '../derivedStores.js'
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

describe('personActions - Integration Tests', () => {
  beforeEach(() => {
    // Reset stores to initial state
    people.set([])
    notifications.set([])

    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Integration with Derived Stores', () => {
    it('should update peopleById derived store immediately on optimistic update', async () => {
      // ARRANGE
      const person1 = { id: 1, firstName: 'John', lastName: 'Doe' }
      const person2 = { id: 2, firstName: 'Jane', lastName: 'Smith' }
      people.set([person1, person2])

      api.updatePerson.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ id: 1, firstName: 'Johnny', lastName: 'Doe' }), 100))
      )

      // ACT
      const updatePromise = updatePerson(1, { firstName: 'Johnny' })

      // Wait for optimistic update
      await new Promise(resolve => setTimeout(resolve, 10))

      // ASSERT - Derived store should reflect optimistic update
      const byId = get(peopleById)
      expect(byId.get(1).firstName).toBe('Johnny')

      await updatePromise
    })

    it('should add person to peopleById immediately on optimistic create', async () => {
      // ARRANGE
      people.set([{ id: 1, firstName: 'Existing', lastName: 'Person' }])

      api.createPerson.mockImplementation((data) =>
        new Promise(resolve =>
          setTimeout(() => resolve({ id: 2, ...data }), 100)
        )
      )

      // ACT
      const createPromise = createPerson({ firstName: 'New', lastName: 'Person' })

      // Wait for optimistic update
      await new Promise(resolve => setTimeout(resolve, 10))

      // ASSERT - Derived store should contain new person with temp ID
      const byId = get(peopleById)
      const allPeople = get(people)

      expect(allPeople).toHaveLength(2)

      const newPerson = allPeople.find(p => String(p.id).startsWith('temp-'))
      expect(newPerson).toBeDefined()
      expect(newPerson.firstName).toBe('New')
      expect(byId.get(newPerson.id)).toEqual(newPerson)

      await createPromise
    })

    it('should remove person from peopleById immediately on optimistic delete', async () => {
      // ARRANGE
      const person1 = { id: 1, firstName: 'John', lastName: 'Doe' }
      const person2 = { id: 2, firstName: 'Jane', lastName: 'Smith' }
      people.set([person1, person2])

      api.deletePerson.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      )

      // ACT
      const deletePromise = deletePerson(1)

      // Wait for optimistic update
      await new Promise(resolve => setTimeout(resolve, 10))

      // ASSERT - Derived store should not contain deleted person
      const byId = get(peopleById)
      expect(byId.get(1)).toBeUndefined()
      expect(byId.get(2)).toBeDefined()

      await deletePromise
    })

    it('should restore person to peopleById on failed delete', async () => {
      // ARRANGE
      const person1 = { id: 1, firstName: 'John', lastName: 'Doe' }
      const person2 = { id: 2, firstName: 'Jane', lastName: 'Smith' }
      people.set([person1, person2])

      api.deletePerson.mockRejectedValue(new Error('Deletion failed'))

      // ACT
      await deletePerson(1)

      // ASSERT - Derived store should contain restored person
      const byId = get(peopleById)
      expect(byId.get(1)).toEqual(person1)
      expect(byId.get(2)).toEqual(person2)
    })
  })

  describe('Immediate UI Feedback', () => {
    it('should provide immediate feedback within 50ms for update operations', async () => {
      // ARRANGE
      const person = { id: 1, firstName: 'John', lastName: 'Doe' }
      people.set([person])

      const feedbackReceived = { time: null, data: null }

      // Subscribe to capture immediate feedback
      const unsubscribe = people.subscribe(currentPeople => {
        if (currentPeople[0]?.firstName === 'Jane' && feedbackReceived.time === null) {
          feedbackReceived.time = performance.now()
          feedbackReceived.data = currentPeople[0]
        }
      })

      // Mock API with significant delay
      api.updatePerson.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ id: 1, firstName: 'Jane', lastName: 'Doe' }), 300)
        )
      )

      // ACT
      const startTime = performance.now()
      const updatePromise = updatePerson(1, { firstName: 'Jane' })

      // Wait for feedback
      await new Promise(resolve => setTimeout(resolve, 60))

      // ASSERT
      expect(feedbackReceived.time).not.toBeNull()
      expect(feedbackReceived.time - startTime).toBeLessThan(50)
      expect(feedbackReceived.data.firstName).toBe('Jane')

      await updatePromise
      unsubscribe()
    })

    it('should provide immediate feedback within 50ms for create operations', async () => {
      // ARRANGE
      people.set([])

      const feedbackReceived = { time: null, personCount: null }

      // Subscribe to capture immediate feedback
      const unsubscribe = people.subscribe(currentPeople => {
        if (currentPeople.length > 0 && feedbackReceived.time === null) {
          feedbackReceived.time = performance.now()
          feedbackReceived.personCount = currentPeople.length
        }
      })

      // Mock API with significant delay
      api.createPerson.mockImplementation((data) =>
        new Promise(resolve =>
          setTimeout(() => resolve({ id: 1, ...data }), 300)
        )
      )

      // ACT
      const startTime = performance.now()
      const createPromise = createPerson({ firstName: 'John', lastName: 'Doe' })

      // Wait for feedback
      await new Promise(resolve => setTimeout(resolve, 60))

      // ASSERT
      expect(feedbackReceived.time).not.toBeNull()
      expect(feedbackReceived.time - startTime).toBeLessThan(50)
      expect(feedbackReceived.personCount).toBe(1)

      await createPromise
      unsubscribe()
    })

    it('should provide immediate feedback within 50ms for delete operations', async () => {
      // ARRANGE
      const person = { id: 1, firstName: 'John', lastName: 'Doe' }
      people.set([person])

      const feedbackReceived = { time: null, isEmpty: null }

      // Subscribe to capture immediate feedback
      const unsubscribe = people.subscribe(currentPeople => {
        if (currentPeople.length === 0 && feedbackReceived.time === null) {
          feedbackReceived.time = performance.now()
          feedbackReceived.isEmpty = true
        }
      })

      // Mock API with significant delay
      api.deletePerson.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 300))
      )

      // ACT
      const startTime = performance.now()
      const deletePromise = deletePerson(1)

      // Wait for feedback
      await new Promise(resolve => setTimeout(resolve, 60))

      // ASSERT
      expect(feedbackReceived.time).not.toBeNull()
      expect(feedbackReceived.time - startTime).toBeLessThan(50)
      expect(feedbackReceived.isEmpty).toBe(true)

      await deletePromise
      unsubscribe()
    })
  })

  describe('User Workflow Scenarios', () => {
    it('should allow user to make multiple edits while API calls are pending', async () => {
      // ARRANGE
      const person = { id: 1, firstName: 'John', lastName: 'Doe', birthDate: '1980-01-01' }
      people.set([person])

      const apiCalls = []

      api.updatePerson.mockImplementation((id, data) => {
        const call = new Promise(resolve =>
          setTimeout(() => {
            apiCalls.push({ id, data })
            resolve({ id, ...person, ...data })
          }, 100)
        )
        return call
      })

      // ACT - User makes rapid edits
      const update1 = updatePerson(1, { firstName: 'Jane' })
      await new Promise(resolve => setTimeout(resolve, 20))

      const update2 = updatePerson(1, { lastName: 'Smith' })
      await new Promise(resolve => setTimeout(resolve, 20))

      const update3 = updatePerson(1, { birthDate: '1985-01-01' })

      // ASSERT - UI should reflect latest edit immediately
      await new Promise(resolve => setTimeout(resolve, 10))
      const currentPeople = get(people)
      expect(currentPeople[0].birthDate).toBe('1985-01-01')

      await Promise.all([update1, update2, update3])

      // All API calls should have been made
      expect(apiCalls.length).toBe(3)
    })

    it('should allow user to continue working after create while API call is pending', async () => {
      // ARRANGE
      people.set([{ id: 1, firstName: 'Existing', lastName: 'Person' }])

      api.createPerson.mockImplementation((data) =>
        new Promise(resolve =>
          setTimeout(() => resolve({ id: 2, ...data }), 200)
        )
      )

      api.updatePerson.mockResolvedValue({ id: 1, firstName: 'Updated', lastName: 'Person' })

      // ACT - Create person, then immediately update another
      const createPromise = createPerson({ firstName: 'New', lastName: 'Person' })

      await new Promise(resolve => setTimeout(resolve, 20))

      // User can immediately interact with existing person
      await updatePerson(1, { firstName: 'Updated' })

      // ASSERT - Both operations should succeed
      await createPromise

      const currentPeople = get(people)
      expect(currentPeople).toHaveLength(2)
      expect(currentPeople.find(p => p.id === 1).firstName).toBe('Updated')
      expect(currentPeople.find(p => p.id === 2).firstName).toBe('New')
    })

    it('should handle rapid create-delete workflow gracefully', async () => {
      // ARRANGE
      people.set([])

      api.createPerson.mockImplementation((data) =>
        new Promise(resolve =>
          setTimeout(() => resolve({ id: 1, ...data }), 100)
        )
      )

      api.deletePerson.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      )

      // ACT - Create person then immediately delete
      const createPromise = createPerson({ firstName: 'John', lastName: 'Doe' })

      await new Promise(resolve => setTimeout(resolve, 20))

      // Get the temp ID
      let tempPerson = get(people)[0]
      expect(String(tempPerson.id).startsWith('temp-')).toBe(true)

      // Wait for create to complete
      await createPromise

      // Now person has real ID
      const realPerson = get(people)[0]
      expect(typeof realPerson.id).toBe('number')

      // Delete the person
      await deletePerson(realPerson.id)

      // ASSERT
      expect(get(people)).toHaveLength(0)
    })
  })

  describe('Error Recovery Scenarios', () => {
    it('should allow retry after failed update', async () => {
      // ARRANGE
      const person = { id: 1, firstName: 'John', lastName: 'Doe' }
      people.set([person])

      // First attempt fails
      api.updatePerson.mockRejectedValueOnce(new Error('Network error'))

      // ACT - First attempt
      await updatePerson(1, { firstName: 'Jane' })

      // ASSERT - Should rollback
      expect(get(people)[0].firstName).toBe('John')
      // Error notification should be created
      const errorNotifications = get(notifications).filter(n => n.type === 'error')
      expect(errorNotifications.length).toBe(1)
      expect(errorNotifications[0].message).toBe('Failed to update person')

      // Second attempt succeeds
      api.updatePerson.mockResolvedValueOnce({ id: 1, firstName: 'Jane', lastName: 'Doe' })

      await updatePerson(1, { firstName: 'Jane' })

      // ASSERT - Should succeed
      expect(get(people)[0].firstName).toBe('Jane')
      // Previous error notification should still be there (notifications persist until auto-dismissed)
      // But no NEW error notification should be added
      const finalErrorNotifications = get(notifications).filter(n => n.type === 'error')
      expect(finalErrorNotifications.length).toBe(1)
      expect(finalErrorNotifications[0].message).toBe('Failed to update person')
    })

    it('should allow retry after failed create', async () => {
      // ARRANGE
      people.set([])

      // First attempt fails
      api.createPerson.mockRejectedValueOnce(new Error('Validation error'))

      // ACT - First attempt
      await createPerson({ firstName: 'John', lastName: 'Doe' })

      // ASSERT - Temp person should be removed
      expect(get(people)).toHaveLength(0)
      // Error notification should be created
      const errorNotifications = get(notifications).filter(n => n.type === 'error')
      expect(errorNotifications.length).toBe(1)
      expect(errorNotifications[0].message).toBe('Failed to create person')

      // Second attempt succeeds
      api.createPerson.mockResolvedValueOnce({ id: 1, firstName: 'John', lastName: 'Doe' })

      await createPerson({ firstName: 'John', lastName: 'Doe' })

      // ASSERT - Should succeed
      expect(get(people)).toHaveLength(1)
      expect(get(people)[0].id).toBe(1)
      // Previous error notification should still be there (notifications persist until auto-dismissed)
      // But no NEW error notification should be added
      const finalErrorNotifications = get(notifications).filter(n => n.type === 'error')
      expect(finalErrorNotifications.length).toBe(1)
      expect(finalErrorNotifications[0].message).toBe('Failed to create person')
    })

    it('should allow retry after failed delete', async () => {
      // ARRANGE
      const person = { id: 1, firstName: 'John', lastName: 'Doe' }
      people.set([person])

      // First attempt fails
      api.deletePerson.mockRejectedValueOnce(new Error('Permission denied'))

      // ACT - First attempt
      await deletePerson(1)

      // ASSERT - Person should be restored
      expect(get(people)).toHaveLength(1)
      // Error notification should be created
      const errorNotifications = get(notifications).filter(n => n.type === 'error')
      expect(errorNotifications.length).toBe(1)
      expect(errorNotifications[0].message).toBe('Failed to delete person')

      // Second attempt succeeds
      api.deletePerson.mockResolvedValueOnce()

      await deletePerson(1)

      // ASSERT - Should succeed
      expect(get(people)).toHaveLength(0)
      // Previous error notification should still be there (notifications persist until auto-dismissed)
      // But no NEW error notification should be added
      const finalErrorNotifications = get(notifications).filter(n => n.type === 'error')
      expect(finalErrorNotifications.length).toBe(1)
      expect(finalErrorNotifications[0].message).toBe('Failed to delete person')
    })
  })

  describe('Data Consistency', () => {
    it('should maintain data integrity during concurrent optimistic updates', async () => {
      // ARRANGE
      const person1 = { id: 1, firstName: 'John', lastName: 'Doe', birthDate: '1980-01-01' }
      const person2 = { id: 2, firstName: 'Jane', lastName: 'Smith', birthDate: '1985-01-01' }
      people.set([person1, person2])

      api.updatePerson.mockImplementation((id, data) =>
        new Promise(resolve =>
          setTimeout(() => resolve({ id, ...get(people).find(p => p.id === id), ...data }), 50)
        )
      )

      // ACT - Concurrent updates to different people
      await Promise.all([
        updatePerson(1, { firstName: 'Johnny' }),
        updatePerson(2, { firstName: 'Janet' })
      ])

      // ASSERT - Both updates should be preserved
      const finalPeople = get(people)
      expect(finalPeople.find(p => p.id === 1).firstName).toBe('Johnny')
      expect(finalPeople.find(p => p.id === 1).lastName).toBe('Doe')
      expect(finalPeople.find(p => p.id === 2).firstName).toBe('Janet')
      expect(finalPeople.find(p => p.id === 2).lastName).toBe('Smith')
    })

    it('should maintain correct order of people in array', async () => {
      // ARRANGE
      const person1 = { id: 1, firstName: 'A', lastName: 'First' }
      const person2 = { id: 2, firstName: 'B', lastName: 'Second' }
      const person3 = { id: 3, firstName: 'C', lastName: 'Third' }
      people.set([person1, person2, person3])

      api.updatePerson.mockImplementation((id, data) =>
        new Promise(resolve =>
          setTimeout(() => resolve({ id, ...data }), 50)
        )
      )

      // ACT - Update middle person
      await updatePerson(2, { firstName: 'Updated' })

      // ASSERT - Order should be preserved
      const finalPeople = get(people)
      expect(finalPeople[0].id).toBe(1)
      expect(finalPeople[1].id).toBe(2)
      expect(finalPeople[1].firstName).toBe('Updated')
      expect(finalPeople[2].id).toBe(3)
    })
  })
})
