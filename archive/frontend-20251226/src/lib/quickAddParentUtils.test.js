import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  determineChildGender,
  prepareParentFormData,
  createChildParentRelationship,
  addParentWithRelationship
} from './quickAddParentUtils.js'

describe('quickAddParentUtils - Quick Add Parent Functionality', () => {
  describe('determineChildGender - Child Gender Determination for Parent Type', () => {
    it('should return "male" for father parent type', () => {
      // ARRANGE & ACT
      const result = determineChildGender('father')

      // ASSERT
      expect(result).toBe('male')
    })

    it('should return "female" for mother parent type', () => {
      // ARRANGE & ACT
      const result = determineChildGender('mother')

      // ASSERT
      expect(result).toBe('female')
    })

    it('should return null for invalid parent type', () => {
      // ARRANGE & ACT
      const result = determineChildGender('invalid')

      // ASSERT
      expect(result).toBeNull()
    })

    it('should return null for undefined parent type', () => {
      // ARRANGE & ACT
      const result = determineChildGender(undefined)

      // ASSERT
      expect(result).toBeNull()
    })

    it('should return null for null parent type', () => {
      // ARRANGE & ACT
      const result = determineChildGender(null)

      // ASSERT
      expect(result).toBeNull()
    })
  })

  describe('prepareParentFormData - Form Data Pre-population for Parent', () => {
    it('should pre-fill lastName from child', () => {
      // ARRANGE
      const child = { id: 1, firstName: 'Alice', lastName: 'Smith', gender: 'female' }

      // ACT
      const formData = prepareParentFormData(child)

      // ASSERT
      expect(formData.lastName).toBe('Smith')
      expect(formData.firstName).toBe('')
      expect(formData.birthDate).toBe('')
      expect(formData.deathDate).toBe('')
      expect(formData.gender).toBe('')
    })

    it('should handle child without lastName', () => {
      // ARRANGE
      const child = { id: 1, firstName: 'Alice', gender: 'female' }

      // ACT
      const formData = prepareParentFormData(child)

      // ASSERT
      expect(formData.lastName).toBe('')
      expect(formData.firstName).toBe('')
    })

    it('should handle null child gracefully', () => {
      // ARRANGE & ACT
      const formData = prepareParentFormData(null)

      // ASSERT
      expect(formData.lastName).toBe('')
      expect(formData.firstName).toBe('')
      expect(formData.birthDate).toBe('')
      expect(formData.deathDate).toBe('')
      expect(formData.gender).toBe('')
    })

    it('should handle undefined child gracefully', () => {
      // ARRANGE & ACT
      const formData = prepareParentFormData(undefined)

      // ASSERT
      expect(formData.lastName).toBe('')
    })

    it('should initialize all fields correctly for valid child', () => {
      // ARRANGE
      const child = { id: 2, firstName: 'Bob', lastName: 'Johnson', gender: 'male' }

      // ACT
      const formData = prepareParentFormData(child)

      // ASSERT
      expect(formData).toEqual({
        firstName: '',
        lastName: 'Johnson',
        birthDate: '',
        deathDate: '',
        gender: ''
      })
    })
  })

  describe('createChildParentRelationship - Relationship Payload Creation', () => {
    it('should create relationship payload with mother role', () => {
      // ARRANGE
      const parentId = 10
      const childId = 1
      const parentType = 'mother'

      // ACT
      const relationship = createChildParentRelationship(parentId, childId, parentType)

      // ASSERT
      expect(relationship).toEqual({
        person1Id: 10,
        person2Id: 1,
        type: 'mother',
        parentRole: 'mother'
      })
    })

    it('should create relationship payload with father role', () => {
      // ARRANGE
      const parentId = 20
      const childId = 2
      const parentType = 'father'

      // ACT
      const relationship = createChildParentRelationship(parentId, childId, parentType)

      // ASSERT
      expect(relationship).toEqual({
        person1Id: 20,
        person2Id: 2,
        type: 'father',
        parentRole: 'father'
      })
    })

    it('should throw error if parentType is not specified', () => {
      // ARRANGE
      const parentId = 10
      const childId = 1

      // ACT & ASSERT
      expect(() => createChildParentRelationship(parentId, childId, '')).toThrow(
        'Parent type must be specified'
      )
    })

    it('should throw error if parentType is null', () => {
      // ARRANGE
      const parentId = 10
      const childId = 1

      // ACT & ASSERT
      expect(() => createChildParentRelationship(parentId, childId, null)).toThrow(
        'Parent type must be specified'
      )
    })

    it('should throw error if parentType is undefined', () => {
      // ARRANGE
      const parentId = 10
      const childId = 1

      // ACT & ASSERT
      expect(() => createChildParentRelationship(parentId, childId, undefined)).toThrow(
        'Parent type must be specified'
      )
    })

    it('should only accept "mother" or "father" as valid parent types', () => {
      // ARRANGE
      const parentId = 10
      const childId = 1

      // ACT & ASSERT
      expect(() => createChildParentRelationship(parentId, childId, 'invalid')).toThrow(
        'Parent type must be "mother" or "father"'
      )
    })
  })

  describe('addParentWithRelationship - Atomic Parent Creation', () => {
    let mockApi

    beforeEach(() => {
      mockApi = {
        createPerson: vi.fn(),
        createRelationship: vi.fn(),
        deletePerson: vi.fn()
      }
    })

    it('should create parent and relationship in sequence on success', async () => {
      // ARRANGE
      const parentData = { firstName: 'Jane', lastName: 'Smith', birthDate: '1980-01-01', gender: 'female' }
      const childId = 1
      const parentType = 'mother'

      const createdParent = { id: 10, ...parentData }
      const createdRelationship = { id: 100, person1Id: 10, person2Id: 1, type: 'mother', parentRole: 'mother' }

      mockApi.createPerson.mockResolvedValue(createdParent)
      mockApi.createRelationship.mockResolvedValue(createdRelationship)

      // ACT
      const result = await addParentWithRelationship(mockApi, parentData, childId, parentType)

      // ASSERT
      expect(mockApi.createPerson).toHaveBeenCalledWith(parentData)
      expect(mockApi.createRelationship).toHaveBeenCalledWith({
        person1Id: 10,
        person2Id: 1,
        type: 'mother',
        parentRole: 'mother'
      })
      expect(result).toEqual({
        person: createdParent,
        relationship: createdRelationship,
        success: true
      })
    })

    it('should rollback parent creation if relationship creation fails', async () => {
      // ARRANGE
      const parentData = { firstName: 'John', lastName: 'Doe', gender: 'male' }
      const childId = 2
      const parentType = 'father'

      const createdParent = { id: 15, ...parentData }

      mockApi.createPerson.mockResolvedValue(createdParent)
      mockApi.createRelationship.mockRejectedValue(new Error('Relationship creation failed'))
      mockApi.deletePerson.mockResolvedValue()

      // ACT
      const result = await addParentWithRelationship(mockApi, parentData, childId, parentType)

      // ASSERT
      expect(mockApi.createPerson).toHaveBeenCalledWith(parentData)
      expect(mockApi.createRelationship).toHaveBeenCalled()
      expect(mockApi.deletePerson).toHaveBeenCalledWith(15) // Rollback
      expect(result).toEqual({
        person: null,
        relationship: null,
        success: false,
        error: 'Relationship creation failed'
      })
    })

    it('should not attempt rollback if parent creation fails', async () => {
      // ARRANGE
      const parentData = { firstName: 'Mary', lastName: 'Wilson', gender: 'female' }
      const childId = 3
      const parentType = 'mother'

      mockApi.createPerson.mockRejectedValue(new Error('Person creation failed'))

      // ACT
      const result = await addParentWithRelationship(mockApi, parentData, childId, parentType)

      // ASSERT
      expect(mockApi.createPerson).toHaveBeenCalledWith(parentData)
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
      const parentData = { firstName: 'Robert', lastName: 'Brown', gender: 'male' }
      const childId = 4
      const parentType = 'father'

      const createdParent = { id: 20, ...parentData }

      mockApi.createPerson.mockResolvedValue(createdParent)
      mockApi.createRelationship.mockRejectedValue(new Error('Relationship failed'))
      mockApi.deletePerson.mockRejectedValue(new Error('Rollback failed'))

      // Spy on console.error to verify it's called
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // ACT
      const result = await addParentWithRelationship(mockApi, parentData, childId, parentType)

      // ASSERT
      expect(mockApi.deletePerson).toHaveBeenCalledWith(20)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to rollback person creation:', expect.any(Error))
      expect(result.success).toBe(false)
      expect(result.error).toBe('Relationship failed')

      consoleErrorSpy.mockRestore()
    })

    it('should create relationship with correct parent role for mother', async () => {
      // ARRANGE
      const parentData = { firstName: 'Susan', lastName: 'Taylor', gender: 'female' }
      const childId = 5
      const parentType = 'mother'

      const createdParent = { id: 25, ...parentData }
      const createdRelationship = { id: 200, person1Id: 25, person2Id: 5, type: 'mother', parentRole: 'mother' }

      mockApi.createPerson.mockResolvedValue(createdParent)
      mockApi.createRelationship.mockResolvedValue(createdRelationship)

      // ACT
      const result = await addParentWithRelationship(mockApi, parentData, childId, parentType)

      // ASSERT
      expect(mockApi.createRelationship).toHaveBeenCalledWith({
        person1Id: 25,
        person2Id: 5,
        type: 'mother',
        parentRole: 'mother'
      })
      expect(result.success).toBe(true)
      expect(result.relationship.type).toBe('mother')
    })

    it('should create relationship with correct parent role for father', async () => {
      // ARRANGE
      const parentData = { firstName: 'David', lastName: 'Anderson', gender: 'male' }
      const childId = 6
      const parentType = 'father'

      const createdParent = { id: 30, ...parentData }
      const createdRelationship = { id: 300, person1Id: 30, person2Id: 6, type: 'father', parentRole: 'father' }

      mockApi.createPerson.mockResolvedValue(createdParent)
      mockApi.createRelationship.mockResolvedValue(createdRelationship)

      // ACT
      const result = await addParentWithRelationship(mockApi, parentData, childId, parentType)

      // ASSERT
      expect(mockApi.createRelationship).toHaveBeenCalledWith({
        person1Id: 30,
        person2Id: 6,
        type: 'father',
        parentRole: 'father'
      })
      expect(result.success).toBe(true)
      expect(result.relationship.type).toBe('father')
    })

    it('should preserve parent data exactly as provided to API', async () => {
      // ARRANGE
      const parentData = {
        firstName: 'Patricia',
        lastName: 'Martinez',
        birthDate: '1975-03-20',
        deathDate: '',
        gender: 'female'
      }
      const childId = 7
      const parentType = 'mother'

      const createdParent = { id: 35, ...parentData }
      const createdRelationship = { id: 350, person1Id: 35, person2Id: 7, type: 'mother', parentRole: 'mother' }

      mockApi.createPerson.mockResolvedValue(createdParent)
      mockApi.createRelationship.mockResolvedValue(createdRelationship)

      // ACT
      await addParentWithRelationship(mockApi, parentData, childId, parentType)

      // ASSERT
      expect(mockApi.createPerson).toHaveBeenCalledWith(parentData)
      expect(mockApi.createPerson).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Patricia',
          lastName: 'Martinez',
          birthDate: '1975-03-20',
          gender: 'female'
        })
      )
    })
  })

  describe('Integration - Complete Quick Add Parent Flow', () => {
    let mockApi

    beforeEach(() => {
      mockApi = {
        createPerson: vi.fn(),
        createRelationship: vi.fn(),
        deletePerson: vi.fn()
      }
    })

    it('should handle complete flow from child to mother creation', async () => {
      // ARRANGE
      const child = { id: 1, firstName: 'Alice', lastName: 'Smith', gender: 'female' }
      const parentType = 'mother'

      // Step 1: Determine gender based on parent type
      const parentGender = determineChildGender(parentType)
      expect(parentGender).toBe('female')

      // Step 2: Prepare form data
      const formData = prepareParentFormData(child)
      expect(formData.lastName).toBe('Smith')

      // Step 3: User fills in form
      const parentData = {
        ...formData,
        firstName: 'Jane',
        birthDate: '1980-05-10',
        gender: parentGender
      }

      // Step 4: Create parent with relationship
      const createdParent = { id: 10, ...parentData }
      const createdRelationship = { id: 100, person1Id: 10, person2Id: 1, type: 'mother', parentRole: 'mother' }

      mockApi.createPerson.mockResolvedValue(createdParent)
      mockApi.createRelationship.mockResolvedValue(createdRelationship)

      // ACT
      const result = await addParentWithRelationship(mockApi, parentData, child.id, parentType)

      // ASSERT
      expect(result.success).toBe(true)
      expect(result.person.firstName).toBe('Jane')
      expect(result.person.lastName).toBe('Smith')
      expect(result.person.gender).toBe('female')
      expect(result.relationship.type).toBe('mother')
    })

    it('should handle complete flow from child to father creation', async () => {
      // ARRANGE
      const child = { id: 2, firstName: 'Bob', lastName: 'Johnson', gender: 'male' }
      const parentType = 'father'

      // Step 1: Determine gender based on parent type
      const parentGender = determineChildGender(parentType)
      expect(parentGender).toBe('male')

      // Step 2: Prepare form data
      const formData = prepareParentFormData(child)
      expect(formData.lastName).toBe('Johnson')

      // Step 3: User fills in form
      const parentData = {
        ...formData,
        firstName: 'John',
        birthDate: '1978-08-15',
        gender: parentGender
      }

      // Step 4: Create parent with relationship
      const createdParent = { id: 15, ...parentData }
      const createdRelationship = { id: 150, person1Id: 15, person2Id: 2, type: 'father', parentRole: 'father' }

      mockApi.createPerson.mockResolvedValue(createdParent)
      mockApi.createRelationship.mockResolvedValue(createdRelationship)

      // ACT
      const result = await addParentWithRelationship(mockApi, parentData, child.id, parentType)

      // ASSERT
      expect(result.success).toBe(true)
      expect(result.person.firstName).toBe('John')
      expect(result.person.lastName).toBe('Johnson')
      expect(result.person.gender).toBe('male')
      expect(result.relationship.type).toBe('father')
    })

    it('should prevent duplicate parent creation through backend validation', async () => {
      // ARRANGE
      const child = { id: 3, firstName: 'Charlie', lastName: 'Brown', gender: 'male' }
      const parentType = 'mother'
      const parentData = { firstName: 'Lucy', lastName: 'Brown', gender: 'female' }

      mockApi.createPerson.mockResolvedValue({ id: 20, ...parentData })
      mockApi.createRelationship.mockRejectedValue(new Error('Person already has a mother'))
      mockApi.deletePerson.mockResolvedValue()

      // ACT
      const result = await addParentWithRelationship(mockApi, parentData, child.id, parentType)

      // ASSERT
      expect(result.success).toBe(false)
      expect(result.error).toBe('Person already has a mother')
      expect(mockApi.deletePerson).toHaveBeenCalled() // Rollback
    })

    it('should handle adding both parents sequentially', async () => {
      // ARRANGE
      const child = { id: 4, firstName: 'Diana', lastName: 'White', gender: 'female' }

      // Add mother first
      const motherData = { firstName: 'Emma', lastName: 'White', gender: 'female' }
      const createdMother = { id: 25, ...motherData }
      const motherRelationship = { id: 250, person1Id: 25, person2Id: 4, type: 'mother', parentRole: 'mother' }

      // Add father second
      const fatherData = { firstName: 'Frank', lastName: 'White', gender: 'male' }
      const createdFather = { id: 26, ...fatherData }
      const fatherRelationship = { id: 260, person1Id: 26, person2Id: 4, type: 'father', parentRole: 'father' }

      mockApi.createPerson
        .mockResolvedValueOnce(createdMother)
        .mockResolvedValueOnce(createdFather)

      mockApi.createRelationship
        .mockResolvedValueOnce(motherRelationship)
        .mockResolvedValueOnce(fatherRelationship)

      // ACT
      const motherResult = await addParentWithRelationship(mockApi, motherData, child.id, 'mother')
      const fatherResult = await addParentWithRelationship(mockApi, fatherData, child.id, 'father')

      // ASSERT
      expect(motherResult.success).toBe(true)
      expect(fatherResult.success).toBe(true)
      expect(mockApi.createPerson).toHaveBeenCalledTimes(2)
      expect(mockApi.createRelationship).toHaveBeenCalledTimes(2)
    })
  })
})
