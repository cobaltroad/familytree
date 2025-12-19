/**
 * Integration tests for Quick Add Child functionality
 *
 * These tests verify:
 * 1. Combined person + relationship creation (atomic transaction)
 * 2. Error handling and rollback scenarios
 * 3. State updates after successful creation
 * 4. Multiple children creation workflow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { addChildWithRelationship } from './quickAddChildUtils.js'

describe('Quick Add Child - Integration Tests', () => {
  let mockApi

  beforeEach(() => {
    // Create fresh mock API for each test
    mockApi = {
      createPerson: vi.fn(),
      createRelationship: vi.fn(),
      deletePerson: vi.fn()
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Successful Child Creation', () => {
    it('should create child and relationship atomically', async () => {
      const childData = {
        firstName: 'Alice',
        lastName: 'Smith',
        birthDate: '2020-05-15',
        deathDate: null,
        gender: 'female'
      }

      const createdPerson = {
        id: 10,
        ...childData
      }

      const createdRelationship = {
        id: 20,
        person1Id: 1,
        person2Id: 10,
        type: 'mother',
        parentRole: 'mother'
      }

      mockApi.createPerson.mockResolvedValue(createdPerson)
      mockApi.createRelationship.mockResolvedValue(createdRelationship)

      const result = await addChildWithRelationship(mockApi, childData, 1, 'mother')

      expect(result.success).toBe(true)
      expect(result.person).toEqual(createdPerson)
      expect(result.relationship).toEqual(createdRelationship)
      expect(mockApi.createPerson).toHaveBeenCalledOnce()
      expect(mockApi.createPerson).toHaveBeenCalledWith(childData)
      expect(mockApi.createRelationship).toHaveBeenCalledOnce()
      expect(mockApi.deletePerson).not.toHaveBeenCalled()
    })

    it('should create child with father relationship', async () => {
      const childData = {
        firstName: 'Bob',
        lastName: 'Johnson',
        birthDate: '2018-03-20',
        deathDate: null,
        gender: 'male'
      }

      const createdPerson = { id: 15, ...childData }
      const createdRelationship = {
        id: 25,
        person1Id: 5,
        person2Id: 15,
        type: 'father',
        parentRole: 'father'
      }

      mockApi.createPerson.mockResolvedValue(createdPerson)
      mockApi.createRelationship.mockResolvedValue(createdRelationship)

      const result = await addChildWithRelationship(mockApi, childData, 5, 'father')

      expect(result.success).toBe(true)
      expect(result.relationship.type).toBe('father')
      expect(result.relationship.parentRole).toBe('father')
    })

    it('should preserve all child data fields', async () => {
      const childData = {
        firstName: 'Charlie',
        lastName: 'Brown',
        birthDate: '2015-12-01',
        deathDate: null,
        gender: 'other'
      }

      const createdPerson = { id: 20, ...childData }
      const createdRelationship = { id: 30, person1Id: 3, person2Id: 20, type: 'mother', parentRole: 'mother' }

      mockApi.createPerson.mockResolvedValue(createdPerson)
      mockApi.createRelationship.mockResolvedValue(createdRelationship)

      const result = await addChildWithRelationship(mockApi, childData, 3, 'mother')

      expect(result.person.firstName).toBe('Charlie')
      expect(result.person.lastName).toBe('Brown')
      expect(result.person.birthDate).toBe('2015-12-01')
      expect(result.person.gender).toBe('other')
    })
  })

  describe('Error Handling and Rollback', () => {
    it('should rollback person creation if relationship creation fails', async () => {
      const childData = {
        firstName: 'Failed',
        lastName: 'Child',
        birthDate: '2020-01-01',
        deathDate: null,
        gender: 'male'
      }

      const createdPerson = { id: 100, ...childData }

      mockApi.createPerson.mockResolvedValue(createdPerson)
      mockApi.createRelationship.mockRejectedValue(new Error('Database error'))
      mockApi.deletePerson.mockResolvedValue(undefined)

      const result = await addChildWithRelationship(mockApi, childData, 1, 'father')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
      expect(result.person).toBeNull()
      expect(result.relationship).toBeNull()

      // Verify rollback occurred
      expect(mockApi.deletePerson).toHaveBeenCalledOnce()
      expect(mockApi.deletePerson).toHaveBeenCalledWith(100)
    })

    it('should handle person creation failure', async () => {
      const childData = {
        firstName: 'Invalid',
        lastName: '',
        birthDate: '',
        deathDate: null,
        gender: ''
      }

      mockApi.createPerson.mockRejectedValue(new Error('Invalid data'))

      const result = await addChildWithRelationship(mockApi, childData, 1, 'mother')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid data')
      expect(mockApi.createRelationship).not.toHaveBeenCalled()
      expect(mockApi.deletePerson).not.toHaveBeenCalled()
    })

    it('should handle rollback failure gracefully', async () => {
      const childData = {
        firstName: 'Rollback',
        lastName: 'Fail',
        birthDate: '2020-01-01',
        deathDate: null,
        gender: 'female'
      }

      const createdPerson = { id: 200, ...childData }

      mockApi.createPerson.mockResolvedValue(createdPerson)
      mockApi.createRelationship.mockRejectedValue(new Error('Relationship error'))
      mockApi.deletePerson.mockRejectedValue(new Error('Rollback failed'))

      const result = await addChildWithRelationship(mockApi, childData, 1, 'mother')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Relationship error')

      // Even if rollback fails, we should still return error state
      expect(mockApi.deletePerson).toHaveBeenCalled()
    })

    it('should handle network timeout during creation', async () => {
      const childData = {
        firstName: 'Timeout',
        lastName: 'Test',
        birthDate: '2020-01-01',
        deathDate: null,
        gender: 'male'
      }

      mockApi.createPerson.mockRejectedValue(new Error('Network timeout'))

      const result = await addChildWithRelationship(mockApi, childData, 1, 'father')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network timeout')
    })
  })

  describe('Multiple Children Creation', () => {
    it('should support creating multiple children sequentially', async () => {
      const child1Data = {
        firstName: 'First',
        lastName: 'Child',
        birthDate: '2018-01-01',
        deathDate: null,
        gender: 'female'
      }

      const child2Data = {
        firstName: 'Second',
        lastName: 'Child',
        birthDate: '2020-01-01',
        deathDate: null,
        gender: 'male'
      }

      mockApi.createPerson
        .mockResolvedValueOnce({ id: 101, ...child1Data })
        .mockResolvedValueOnce({ id: 102, ...child2Data })

      mockApi.createRelationship
        .mockResolvedValueOnce({ id: 201, person1Id: 1, person2Id: 101, type: 'mother', parentRole: 'mother' })
        .mockResolvedValueOnce({ id: 202, person1Id: 1, person2Id: 102, type: 'mother', parentRole: 'mother' })

      const result1 = await addChildWithRelationship(mockApi, child1Data, 1, 'mother')
      const result2 = await addChildWithRelationship(mockApi, child2Data, 1, 'mother')

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result1.person.id).toBe(101)
      expect(result2.person.id).toBe(102)
      expect(mockApi.createPerson).toHaveBeenCalledTimes(2)
      expect(mockApi.createRelationship).toHaveBeenCalledTimes(2)
    })

    it('should handle partial failure in multiple children creation', async () => {
      const child1Data = {
        firstName: 'Success',
        lastName: 'Child',
        birthDate: '2018-01-01',
        deathDate: null,
        gender: 'female'
      }

      const child2Data = {
        firstName: 'Fail',
        lastName: 'Child',
        birthDate: '2020-01-01',
        deathDate: null,
        gender: 'male'
      }

      mockApi.createPerson
        .mockResolvedValueOnce({ id: 101, ...child1Data })
        .mockRejectedValueOnce(new Error('Duplicate name'))

      mockApi.createRelationship
        .mockResolvedValueOnce({ id: 201, person1Id: 1, person2Id: 101, type: 'mother', parentRole: 'mother' })

      const result1 = await addChildWithRelationship(mockApi, child1Data, 1, 'mother')
      const result2 = await addChildWithRelationship(mockApi, child2Data, 1, 'mother')

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(false)
      expect(result2.error).toBe('Duplicate name')
    })
  })

  describe('Data Validation', () => {
    it('should pass through all required child data fields', async () => {
      const childData = {
        firstName: 'Complete',
        lastName: 'Data',
        birthDate: '2019-06-15',
        deathDate: null,
        gender: 'female'
      }

      const createdPerson = { id: 300, ...childData }
      const createdRelationship = { id: 400, person1Id: 10, person2Id: 300, type: 'father', parentRole: 'father' }

      mockApi.createPerson.mockResolvedValue(createdPerson)
      mockApi.createRelationship.mockResolvedValue(createdRelationship)

      await addChildWithRelationship(mockApi, childData, 10, 'father')

      const personCall = mockApi.createPerson.mock.calls[0][0]
      expect(personCall).toEqual(childData)

      const relationshipCall = mockApi.createRelationship.mock.calls[0][0]
      expect(relationshipCall.person1Id).toBe(10)
      expect(relationshipCall.person2Id).toBe(300)
      expect(relationshipCall.type).toBe('father')
      expect(relationshipCall.parentRole).toBe('father')
    })

    it('should handle optional fields correctly', async () => {
      const childData = {
        firstName: 'Minimal',
        lastName: 'Data',
        birthDate: null,
        deathDate: null,
        gender: ''
      }

      const createdPerson = { id: 500, ...childData }
      const createdRelationship = { id: 600, person1Id: 20, person2Id: 500, type: 'mother', parentRole: 'mother' }

      mockApi.createPerson.mockResolvedValue(createdPerson)
      mockApi.createRelationship.mockResolvedValue(createdRelationship)

      const result = await addChildWithRelationship(mockApi, childData, 20, 'mother')

      expect(result.success).toBe(true)
      expect(result.person.birthDate).toBeNull()
      expect(result.person.gender).toBe('')
    })
  })
})
