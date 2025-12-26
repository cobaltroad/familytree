/**
 * Tests for relationship CRUD actions with optimistic update pattern.
 * Tests bidirectional spouse deletion and unidirectional parent/child deletion.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { get } from 'svelte/store'
import { relationships } from '../familyStore.js'
import { deleteRelationship } from './relationshipActions.js'
import { api } from '../../lib/api.js'
import * as notificationStore from '../notificationStore.js'

// Mock the API module
vi.mock('../../lib/api.js', () => ({
  api: {
    deleteRelationship: vi.fn()
  }
}))

// Mock the notification store
vi.mock('../notificationStore.js', () => ({
  success: vi.fn(),
  error: vi.fn()
}))

describe('relationshipActions - deleteRelationship', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()

    // Reset relationships store
    relationships.set([])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Unidirectional Parent/Child Relationship Deletion', () => {
    it('should delete a single parent-child relationship (mother)', async () => {
      const motherRelationship = {
        id: 1,
        person1Id: 10, // mother
        person2Id: 20, // child
        type: 'parentOf',
        parentRole: 'mother'
      }

      const otherRelationship = {
        id: 2,
        person1Id: 30,
        person2Id: 40,
        type: 'parentOf',
        parentRole: 'father'
      }

      relationships.set([motherRelationship, otherRelationship])

      // Mock successful API deletion
      api.deleteRelationship.mockResolvedValueOnce(undefined)

      await deleteRelationship(motherRelationship, 'Mother', { id: 20, firstName: 'Jane', lastName: 'Doe' })

      // Should only delete the one relationship
      const currentRelationships = get(relationships)
      expect(currentRelationships).toHaveLength(1)
      expect(currentRelationships[0]).toEqual(otherRelationship)

      // API should be called once
      expect(api.deleteRelationship).toHaveBeenCalledTimes(1)
      expect(api.deleteRelationship).toHaveBeenCalledWith(1)

      // Success notification should be shown
      expect(notificationStore.success).toHaveBeenCalledWith('Relationship removed successfully')
    })

    it('should delete a single parent-child relationship (father)', async () => {
      const fatherRelationship = {
        id: 3,
        person1Id: 11, // father
        person2Id: 21, // child
        type: 'parentOf',
        parentRole: 'father'
      }

      const otherRelationship = {
        id: 4,
        person1Id: 30,
        person2Id: 40,
        type: 'spouse',
        parentRole: null
      }

      relationships.set([fatherRelationship, otherRelationship])

      // Mock successful API deletion
      api.deleteRelationship.mockResolvedValueOnce(undefined)

      await deleteRelationship(fatherRelationship, 'Father', { id: 21, firstName: 'John', lastName: 'Smith' })

      // Should only delete the one relationship
      const currentRelationships = get(relationships)
      expect(currentRelationships).toHaveLength(1)
      expect(currentRelationships[0]).toEqual(otherRelationship)

      expect(api.deleteRelationship).toHaveBeenCalledTimes(1)
      expect(api.deleteRelationship).toHaveBeenCalledWith(3)
    })

    it('should delete a child relationship', async () => {
      const childRelationship = {
        id: 5,
        person1Id: 12, // parent
        person2Id: 22, // child
        type: 'parentOf',
        parentRole: 'mother'
      }

      relationships.set([childRelationship])

      api.deleteRelationship.mockResolvedValueOnce(undefined)

      await deleteRelationship(childRelationship, 'Child', { id: 22, firstName: 'Alice', lastName: 'Brown' })

      const currentRelationships = get(relationships)
      expect(currentRelationships).toHaveLength(0)

      expect(api.deleteRelationship).toHaveBeenCalledTimes(1)
      expect(api.deleteRelationship).toHaveBeenCalledWith(5)
    })
  })

  describe('Bidirectional Spouse Relationship Deletion', () => {
    it('should delete both spouse relationships (A→B and B→A)', async () => {
      const spouseRelationship1 = {
        id: 10,
        person1Id: 100, // Person A
        person2Id: 200, // Person B
        type: 'spouse',
        parentRole: null
      }

      const spouseRelationship2 = {
        id: 11,
        person1Id: 200, // Person B
        person2Id: 100, // Person A
        type: 'spouse',
        parentRole: null
      }

      const otherRelationship = {
        id: 12,
        person1Id: 300,
        person2Id: 400,
        type: 'parentOf',
        parentRole: 'mother'
      }

      relationships.set([spouseRelationship1, spouseRelationship2, otherRelationship])

      // Mock successful API deletions
      api.deleteRelationship.mockResolvedValueOnce(undefined)
      api.deleteRelationship.mockResolvedValueOnce(undefined)

      await deleteRelationship(spouseRelationship1, 'Spouse', { id: 200, firstName: 'Bob', lastName: 'Jones' })

      // Should delete both spouse relationships
      const currentRelationships = get(relationships)
      expect(currentRelationships).toHaveLength(1)
      expect(currentRelationships[0]).toEqual(otherRelationship)

      // API should be called twice
      expect(api.deleteRelationship).toHaveBeenCalledTimes(2)
      expect(api.deleteRelationship).toHaveBeenCalledWith(10)
      expect(api.deleteRelationship).toHaveBeenCalledWith(11)

      expect(notificationStore.success).toHaveBeenCalledWith('Relationship removed successfully')
    })

    it('should handle spouse deletion when initiated from the reverse relationship', async () => {
      const spouseRelationship1 = {
        id: 20,
        person1Id: 101,
        person2Id: 201,
        type: 'spouse',
        parentRole: null
      }

      const spouseRelationship2 = {
        id: 21,
        person1Id: 201, // Initiated from this side
        person2Id: 101,
        type: 'spouse',
        parentRole: null
      }

      relationships.set([spouseRelationship1, spouseRelationship2])

      api.deleteRelationship.mockResolvedValueOnce(undefined)
      api.deleteRelationship.mockResolvedValueOnce(undefined)

      // Delete initiated from spouseRelationship2 (B→A)
      await deleteRelationship(spouseRelationship2, 'Spouse', { id: 101, firstName: 'Alice', lastName: 'White' })

      const currentRelationships = get(relationships)
      expect(currentRelationships).toHaveLength(0)

      expect(api.deleteRelationship).toHaveBeenCalledTimes(2)
      expect(api.deleteRelationship).toHaveBeenCalledWith(21)
      expect(api.deleteRelationship).toHaveBeenCalledWith(20)
    })
  })

  describe('Optimistic Updates', () => {
    it('should remove relationship immediately (before API call)', async () => {
      const relationship = {
        id: 30,
        person1Id: 10,
        person2Id: 20,
        type: 'parentOf',
        parentRole: 'mother'
      }

      relationships.set([relationship])

      // Mock API call that takes time
      api.deleteRelationship.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      const deletePromise = deleteRelationship(relationship, 'Mother', { id: 20, firstName: 'Jane', lastName: 'Doe' })

      // Relationship should be removed immediately (optimistic update)
      const currentRelationships = get(relationships)
      expect(currentRelationships).toHaveLength(0)

      await deletePromise
    })

    it('should remove both spouse relationships immediately (before API calls)', async () => {
      const spouse1 = {
        id: 40,
        person1Id: 100,
        person2Id: 200,
        type: 'spouse',
        parentRole: null
      }

      const spouse2 = {
        id: 41,
        person1Id: 200,
        person2Id: 100,
        type: 'spouse',
        parentRole: null
      }

      relationships.set([spouse1, spouse2])

      api.deleteRelationship.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      const deletePromise = deleteRelationship(spouse1, 'Spouse', { id: 200, firstName: 'Bob', lastName: 'Smith' })

      // Both should be removed immediately
      const currentRelationships = get(relationships)
      expect(currentRelationships).toHaveLength(0)

      await deletePromise
    })
  })

  describe('Error Handling and Rollback', () => {
    it('should rollback unidirectional deletion if API call fails', async () => {
      const relationship = {
        id: 50,
        person1Id: 10,
        person2Id: 20,
        type: 'parentOf',
        parentRole: 'mother'
      }

      relationships.set([relationship])

      // Mock API failure
      api.deleteRelationship.mockRejectedValueOnce(new Error('Network error'))

      await deleteRelationship(relationship, 'Mother', { id: 20, firstName: 'Jane', lastName: 'Doe' })

      // Relationship should be restored
      const currentRelationships = get(relationships)
      expect(currentRelationships).toHaveLength(1)
      expect(currentRelationships[0]).toEqual(relationship)

      // Error notification should be shown
      expect(notificationStore.error).toHaveBeenCalledWith('Failed to remove relationship')
    })

    it('should rollback both spouse relationships if first API call fails', async () => {
      const spouse1 = {
        id: 60,
        person1Id: 100,
        person2Id: 200,
        type: 'spouse',
        parentRole: null
      }

      const spouse2 = {
        id: 61,
        person1Id: 200,
        person2Id: 100,
        type: 'spouse',
        parentRole: null
      }

      relationships.set([spouse1, spouse2])

      // Mock first API call failure
      api.deleteRelationship.mockRejectedValueOnce(new Error('Network error'))

      await deleteRelationship(spouse1, 'Spouse', { id: 200, firstName: 'Bob', lastName: 'Smith' })

      // Both relationships should be restored
      const currentRelationships = get(relationships)
      expect(currentRelationships).toHaveLength(2)
      expect(currentRelationships).toContainEqual(spouse1)
      expect(currentRelationships).toContainEqual(spouse2)

      // Only one API call should have been attempted
      expect(api.deleteRelationship).toHaveBeenCalledTimes(1)
      expect(notificationStore.error).toHaveBeenCalledWith('Failed to remove relationship')
    })

    it('should rollback both spouse relationships if second API call fails', async () => {
      const spouse1 = {
        id: 70,
        person1Id: 100,
        person2Id: 200,
        type: 'spouse',
        parentRole: null
      }

      const spouse2 = {
        id: 71,
        person1Id: 200,
        person2Id: 100,
        type: 'spouse',
        parentRole: null
      }

      relationships.set([spouse1, spouse2])

      // Mock first API call success, second failure
      api.deleteRelationship.mockResolvedValueOnce(undefined)
      api.deleteRelationship.mockRejectedValueOnce(new Error('Network error'))

      await deleteRelationship(spouse1, 'Spouse', { id: 200, firstName: 'Bob', lastName: 'Smith' })

      // Both relationships should be restored
      const currentRelationships = get(relationships)
      expect(currentRelationships).toHaveLength(2)
      expect(currentRelationships).toContainEqual(spouse1)
      expect(currentRelationships).toContainEqual(spouse2)

      // Both API calls should have been attempted
      expect(api.deleteRelationship).toHaveBeenCalledTimes(2)
      expect(notificationStore.error).toHaveBeenCalledWith('Failed to remove relationship')
    })
  })

  describe('Edge Cases', () => {
    it('should handle deletion when relationship not found in store', async () => {
      const relationship = {
        id: 999,
        person1Id: 10,
        person2Id: 20,
        type: 'parentOf',
        parentRole: 'mother'
      }

      relationships.set([])

      api.deleteRelationship.mockResolvedValueOnce(undefined)

      await deleteRelationship(relationship, 'Mother', { id: 20, firstName: 'Jane', lastName: 'Doe' })

      // Should still call API
      expect(api.deleteRelationship).toHaveBeenCalledTimes(1)
      expect(api.deleteRelationship).toHaveBeenCalledWith(999)

      // Store should remain empty
      const currentRelationships = get(relationships)
      expect(currentRelationships).toHaveLength(0)
    })

    it('should handle spouse deletion when only one side exists in store', async () => {
      const spouse1 = {
        id: 80,
        person1Id: 100,
        person2Id: 200,
        type: 'spouse',
        parentRole: null
      }

      // Only one side exists (data integrity issue)
      relationships.set([spouse1])

      api.deleteRelationship.mockResolvedValueOnce(undefined)

      await deleteRelationship(spouse1, 'Spouse', { id: 200, firstName: 'Bob', lastName: 'Smith' })

      // Should delete the one that exists
      const currentRelationships = get(relationships)
      expect(currentRelationships).toHaveLength(0)

      // Should only call API once (no reverse relationship found)
      expect(api.deleteRelationship).toHaveBeenCalledTimes(1)
      expect(api.deleteRelationship).toHaveBeenCalledWith(80)
    })

    it('should not delete non-spouse relationships bidirectionally', async () => {
      const siblingRelationship = {
        id: 90,
        person1Id: 100,
        person2Id: 200,
        type: 'sibling', // Not a spouse
        parentRole: null
      }

      relationships.set([siblingRelationship])

      api.deleteRelationship.mockResolvedValueOnce(undefined)

      await deleteRelationship(siblingRelationship, 'Sibling', { id: 200, firstName: 'Bob', lastName: 'Smith' })

      // Should only call API once (unidirectional)
      expect(api.deleteRelationship).toHaveBeenCalledTimes(1)
      expect(api.deleteRelationship).toHaveBeenCalledWith(90)
    })
  })
})
