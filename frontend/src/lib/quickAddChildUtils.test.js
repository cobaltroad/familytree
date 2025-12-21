import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  determineParentRole,
  prepareChildFormData,
  createParentChildRelationship,
  addChildWithRelationship
} from './quickAddChildUtils.js'

describe('quickAddChildUtils - Quick Add Child Functionality', () => {
  describe('determineParentRole - Parent Role Determination', () => {
    it('should return "father" for male gender', () => {
      // ARRANGE & ACT
      const result = determineParentRole('male')

      // ASSERT
      expect(result).toBe('father')
    })

    it('should return "mother" for female gender', () => {
      // ARRANGE & ACT
      const result = determineParentRole('female')

      // ASSERT
      expect(result).toBe('mother')
    })

    it('should return null for "other" gender (requiring user selection)', () => {
      // ARRANGE & ACT
      const result = determineParentRole('other')

      // ASSERT
      expect(result).toBeNull()
    })

    it('should return null for unspecified gender (empty string)', () => {
      // ARRANGE & ACT
      const result = determineParentRole('')

      // ASSERT
      expect(result).toBeNull()
    })

    it('should return null for undefined gender', () => {
      // ARRANGE & ACT
      const result = determineParentRole(undefined)

      // ASSERT
      expect(result).toBeNull()
    })

    it('should return null for null gender', () => {
      // ARRANGE & ACT
      const result = determineParentRole(null)

      // ASSERT
      expect(result).toBeNull()
    })
  })

  describe('prepareChildFormData - Form Data Pre-population', () => {
    it('should pre-fill lastName from parent', () => {
      // ARRANGE
      const parent = { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male' }

      // ACT
      const formData = prepareChildFormData(parent)

      // ASSERT
      expect(formData.lastName).toBe('Doe')
      expect(formData.firstName).toBe('')
      expect(formData.birthDate).toBe('')
      expect(formData.deathDate).toBe('')
      expect(formData.gender).toBe('')
    })

    it('should handle parent without lastName', () => {
      // ARRANGE
      const parent = { id: 1, firstName: 'John', gender: 'male' }

      // ACT
      const formData = prepareChildFormData(parent)

      // ASSERT
      expect(formData.lastName).toBe('')
      expect(formData.firstName).toBe('')
    })

    it('should handle null parent gracefully', () => {
      // ARRANGE & ACT
      const formData = prepareChildFormData(null)

      // ASSERT
      expect(formData.lastName).toBe('')
      expect(formData.firstName).toBe('')
      expect(formData.birthDate).toBe('')
      expect(formData.deathDate).toBe('')
      expect(formData.gender).toBe('')
    })

    it('should handle undefined parent gracefully', () => {
      // ARRANGE & ACT
      const formData = prepareChildFormData(undefined)

      // ASSERT
      expect(formData.lastName).toBe('')
    })

    it('should initialize all fields correctly for valid parent', () => {
      // ARRANGE
      const parent = { id: 1, firstName: 'Jane', lastName: 'Smith', gender: 'female' }

      // ACT
      const formData = prepareChildFormData(parent)

      // ASSERT
      expect(formData).toEqual({
        firstName: '',
        lastName: 'Smith',
        birthDate: '',
        deathDate: '',
        gender: ''
      })
    })
  })

  describe('createParentChildRelationship - Relationship Payload Creation', () => {
    it('should create relationship payload with mother role', () => {
      // ARRANGE
      const parentId = 1
      const childId = 2
      const parentRole = 'mother'

      // ACT
      const relationship = createParentChildRelationship(parentId, childId, parentRole)

      // ASSERT
      expect(relationship).toEqual({
        person1Id: 1,
        person2Id: 2,
        type: 'mother',
        parentRole: 'mother'
      })
    })

    it('should create relationship payload with father role', () => {
      // ARRANGE
      const parentId = 5
      const childId = 10
      const parentRole = 'father'

      // ACT
      const relationship = createParentChildRelationship(parentId, childId, parentRole)

      // ASSERT
      expect(relationship).toEqual({
        person1Id: 5,
        person2Id: 10,
        type: 'father',
        parentRole: 'father'
      })
    })

    it('should throw error if parentRole is not specified', () => {
      // ARRANGE
      const parentId = 1
      const childId = 2

      // ACT & ASSERT
      expect(() => createParentChildRelationship(parentId, childId, '')).toThrow(
        'Parent role must be specified'
      )
    })

    it('should throw error if parentRole is null', () => {
      // ARRANGE
      const parentId = 1
      const childId = 2

      // ACT & ASSERT
      expect(() => createParentChildRelationship(parentId, childId, null)).toThrow(
        'Parent role must be specified'
      )
    })

    it('should throw error if parentRole is undefined', () => {
      // ARRANGE
      const parentId = 1
      const childId = 2

      // ACT & ASSERT
      expect(() => createParentChildRelationship(parentId, childId, undefined)).toThrow(
        'Parent role must be specified'
      )
    })
  })

  describe('addChildWithRelationship - Atomic Child Creation', () => {
    let mockApi

    beforeEach(() => {
      mockApi = {
        createPerson: vi.fn(),
        createRelationship: vi.fn(),
        deletePerson: vi.fn()
      }
    })

    it('should create child and relationship in sequence on success', async () => {
      // ARRANGE
      const childData = { firstName: 'Alice', lastName: 'Doe', birthDate: '2010-01-01', gender: 'female' }
      const parentId = 1
      const parentRole = 'father'

      const createdChild = { id: 10, ...childData }
      const createdRelationship = { id: 100, person1Id: 1, person2Id: 10, type: 'father', parentRole: 'father' }

      mockApi.createPerson.mockResolvedValue(createdChild)
      mockApi.createRelationship.mockResolvedValue(createdRelationship)

      // ACT
      const result = await addChildWithRelationship(mockApi, childData, parentId, parentRole)

      // ASSERT
      expect(mockApi.createPerson).toHaveBeenCalledWith(childData)
      expect(mockApi.createRelationship).toHaveBeenCalledWith({
        person1Id: 1,
        person2Id: 10,
        type: 'father',
        parentRole: 'father'
      })
      expect(result).toEqual({
        person: createdChild,
        relationship: createdRelationship,
        success: true
      })
    })

    it('should rollback person creation if relationship creation fails', async () => {
      // ARRANGE
      const childData = { firstName: 'Bob', lastName: 'Smith', gender: 'male' }
      const parentId = 2
      const parentRole = 'mother'

      const createdChild = { id: 15, ...childData }

      mockApi.createPerson.mockResolvedValue(createdChild)
      mockApi.createRelationship.mockRejectedValue(new Error('Relationship creation failed'))
      mockApi.deletePerson.mockResolvedValue()

      // ACT
      const result = await addChildWithRelationship(mockApi, childData, parentId, parentRole)

      // ASSERT
      expect(mockApi.createPerson).toHaveBeenCalledWith(childData)
      expect(mockApi.createRelationship).toHaveBeenCalled()
      expect(mockApi.deletePerson).toHaveBeenCalledWith(15) // Rollback
      expect(result).toEqual({
        person: null,
        relationship: null,
        success: false,
        error: 'Relationship creation failed'
      })
    })

    it('should not attempt rollback if person creation fails', async () => {
      // ARRANGE
      const childData = { firstName: 'Charlie', lastName: 'Jones', gender: 'male' }
      const parentId = 3
      const parentRole = 'father'

      mockApi.createPerson.mockRejectedValue(new Error('Person creation failed'))

      // ACT
      const result = await addChildWithRelationship(mockApi, childData, parentId, parentRole)

      // ASSERT
      expect(mockApi.createPerson).toHaveBeenCalledWith(childData)
      expect(mockApi.createRelationship).not.toHaveBeenCalled()
      expect(mockApi.deletePerson).not.toHaveBeenCalled()
      expect(result).toEqual({
        person: null,
        relationship: null,
        success: false,
        error: 'Person creation failed'
      })
    })

    it('should handle rollback failure gracefully', async () => {
      // ARRANGE
      const childData = { firstName: 'Diana', lastName: 'Brown', gender: 'female' }
      const parentId = 4
      const parentRole = 'mother'

      const createdChild = { id: 20, ...childData }

      mockApi.createPerson.mockResolvedValue(createdChild)
      mockApi.createRelationship.mockRejectedValue(new Error('Relationship failed'))
      mockApi.deletePerson.mockRejectedValue(new Error('Rollback failed'))

      // Spy on console.error to verify it's called
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // ACT
      const result = await addChildWithRelationship(mockApi, childData, parentId, parentRole)

      // ASSERT
      expect(mockApi.deletePerson).toHaveBeenCalledWith(20)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to rollback person creation:', expect.any(Error))
      expect(result.success).toBe(false)
      expect(result.error).toBe('Relationship failed')

      consoleErrorSpy.mockRestore()
    })

    it('should create relationship with correct parent role for mother', async () => {
      // ARRANGE
      const childData = { firstName: 'Eve', lastName: 'Wilson', gender: 'female' }
      const parentId = 5
      const parentRole = 'mother'

      const createdChild = { id: 25, ...childData }
      const createdRelationship = { id: 200, person1Id: 5, person2Id: 25, type: 'mother', parentRole: 'mother' }

      mockApi.createPerson.mockResolvedValue(createdChild)
      mockApi.createRelationship.mockResolvedValue(createdRelationship)

      // ACT
      const result = await addChildWithRelationship(mockApi, childData, parentId, parentRole)

      // ASSERT
      expect(mockApi.createRelationship).toHaveBeenCalledWith({
        person1Id: 5,
        person2Id: 25,
        type: 'mother',
        parentRole: 'mother'
      })
      expect(result.success).toBe(true)
      expect(result.relationship.type).toBe('mother')
    })

    it('should preserve child data exactly as provided to API', async () => {
      // ARRANGE
      const childData = {
        firstName: 'Frank',
        lastName: 'Taylor',
        birthDate: '2015-05-15',
        deathDate: '',
        gender: 'male'
      }
      const parentId = 6
      const parentRole = 'father'

      const createdChild = { id: 30, ...childData }
      const createdRelationship = { id: 300, person1Id: 6, person2Id: 30, type: 'father', parentRole: 'father' }

      mockApi.createPerson.mockResolvedValue(createdChild)
      mockApi.createRelationship.mockResolvedValue(createdRelationship)

      // ACT
      await addChildWithRelationship(mockApi, childData, parentId, parentRole)

      // ASSERT
      expect(mockApi.createPerson).toHaveBeenCalledWith(childData)
      expect(mockApi.createPerson).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Frank',
          lastName: 'Taylor',
          birthDate: '2015-05-15',
          gender: 'male'
        })
      )
    })
  })

  describe('Integration - Complete Quick Add Child Flow', () => {
    let mockApi

    beforeEach(() => {
      mockApi = {
        createPerson: vi.fn(),
        createRelationship: vi.fn(),
        deletePerson: vi.fn()
      }
    })

    it('should handle complete flow from parent selection to child creation', async () => {
      // ARRANGE
      const parent = { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male' }

      // Step 1: Determine parent role
      const parentRole = determineParentRole(parent.gender)
      expect(parentRole).toBe('father')

      // Step 2: Prepare form data
      const formData = prepareChildFormData(parent)
      expect(formData.lastName).toBe('Doe')

      // Step 3: User fills in form
      const childData = {
        ...formData,
        firstName: 'Alice',
        birthDate: '2010-01-01',
        gender: 'female'
      }

      // Step 4: Create child with relationship
      const createdChild = { id: 10, ...childData }
      const createdRelationship = { id: 100, person1Id: 1, person2Id: 10, type: 'father', parentRole: 'father' }

      mockApi.createPerson.mockResolvedValue(createdChild)
      mockApi.createRelationship.mockResolvedValue(createdRelationship)

      // ACT
      const result = await addChildWithRelationship(mockApi, childData, parent.id, parentRole)

      // ASSERT
      expect(result.success).toBe(true)
      expect(result.person.firstName).toBe('Alice')
      expect(result.person.lastName).toBe('Doe')
      expect(result.relationship.type).toBe('father')
    })

    it('should handle flow with parent requiring role selection', async () => {
      // ARRANGE
      const parent = { id: 2, firstName: 'Alex', lastName: 'Smith', gender: 'other' }

      // Step 1: Determine parent role - should be null
      const autoRole = determineParentRole(parent.gender)
      expect(autoRole).toBeNull()

      // Step 2: User manually selects role
      const selectedRole = 'mother'

      // Step 3: Prepare form and create child
      const formData = prepareChildFormData(parent)
      const childData = {
        ...formData,
        firstName: 'Bob',
        gender: 'male'
      }

      const createdChild = { id: 15, ...childData }
      const createdRelationship = { id: 150, person1Id: 2, person2Id: 15, type: 'mother', parentRole: 'mother' }

      mockApi.createPerson.mockResolvedValue(createdChild)
      mockApi.createRelationship.mockResolvedValue(createdRelationship)

      // ACT
      const result = await addChildWithRelationship(mockApi, childData, parent.id, selectedRole)

      // ASSERT
      expect(result.success).toBe(true)
      expect(result.relationship.type).toBe('mother')
    })

    it('should handle multiple children creation for same parent', async () => {
      // ARRANGE
      const parent = { id: 3, firstName: 'Jane', lastName: 'Brown', gender: 'female' }
      const parentRole = determineParentRole(parent.gender)

      const child1Data = { firstName: 'Charlie', lastName: 'Brown', gender: 'male' }
      const child2Data = { firstName: 'Daisy', lastName: 'Brown', gender: 'female' }

      mockApi.createPerson
        .mockResolvedValueOnce({ id: 20, ...child1Data })
        .mockResolvedValueOnce({ id: 21, ...child2Data })

      mockApi.createRelationship
        .mockResolvedValueOnce({ id: 200, person1Id: 3, person2Id: 20, type: 'mother', parentRole: 'mother' })
        .mockResolvedValueOnce({ id: 201, person1Id: 3, person2Id: 21, type: 'mother', parentRole: 'mother' })

      // ACT
      const result1 = await addChildWithRelationship(mockApi, child1Data, parent.id, parentRole)
      const result2 = await addChildWithRelationship(mockApi, child2Data, parent.id, parentRole)

      // ASSERT
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(mockApi.createPerson).toHaveBeenCalledTimes(2)
      expect(mockApi.createRelationship).toHaveBeenCalledTimes(2)
    })
  })
})
