import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  prepareSpouseFormData,
  createSpouseRelationship,
  addSpouseWithRelationship
} from './quickAddSpouseUtils.js'

describe('quickAddSpouseUtils - Quick Add Spouse Functionality', () => {
  describe('prepareSpouseFormData - Form Data Pre-population', () => {
    it('should pre-fill lastName from person', () => {
      // ARRANGE
      const person = { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male' }

      // ACT
      const formData = prepareSpouseFormData(person)

      // ASSERT
      expect(formData.lastName).toBe('Doe')
      expect(formData.firstName).toBe('')
      expect(formData.birthDate).toBe('')
      expect(formData.deathDate).toBe('')
      expect(formData.gender).toBe('')
    })

    it('should handle person without lastName', () => {
      // ARRANGE
      const person = { id: 1, firstName: 'John', gender: 'male' }

      // ACT
      const formData = prepareSpouseFormData(person)

      // ASSERT
      expect(formData.lastName).toBe('')
      expect(formData.firstName).toBe('')
    })

    it('should handle null person gracefully', () => {
      // ARRANGE & ACT
      const formData = prepareSpouseFormData(null)

      // ASSERT
      expect(formData.lastName).toBe('')
      expect(formData.firstName).toBe('')
      expect(formData.birthDate).toBe('')
      expect(formData.deathDate).toBe('')
      expect(formData.gender).toBe('')
    })

    it('should handle undefined person gracefully', () => {
      // ARRANGE & ACT
      const formData = prepareSpouseFormData(undefined)

      // ASSERT
      expect(formData.lastName).toBe('')
    })

    it('should initialize all fields correctly for valid person', () => {
      // ARRANGE
      const person = { id: 1, firstName: 'Jane', lastName: 'Smith', gender: 'female' }

      // ACT
      const formData = prepareSpouseFormData(person)

      // ASSERT
      expect(formData).toEqual({
        firstName: '',
        lastName: 'Smith',
        birthDate: '',
        deathDate: '',
        gender: ''
      })
    })

    it('should NOT pre-populate gender (unlike parent, spouse can be any gender)', () => {
      // ARRANGE
      const malePerson = { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male' }
      const femalePerson = { id: 2, firstName: 'Jane', lastName: 'Smith', gender: 'female' }

      // ACT
      const maleFormData = prepareSpouseFormData(malePerson)
      const femaleFormData = prepareSpouseFormData(femalePerson)

      // ASSERT
      expect(maleFormData.gender).toBe('')
      expect(femaleFormData.gender).toBe('')
    })
  })

  describe('createSpouseRelationship - Bidirectional Relationship Payload Creation', () => {
    it('should create bidirectional spouse relationship payloads', () => {
      // ARRANGE
      const person1Id = 1
      const person2Id = 2

      // ACT
      const relationships = createSpouseRelationship(person1Id, person2Id)

      // ASSERT
      expect(relationships).toHaveLength(2)

      // First direction: person1 -> person2
      expect(relationships[0]).toEqual({
        person1Id: 1,
        person2Id: 2,
        type: 'spouse',
        parentRole: null
      })

      // Second direction: person2 -> person1
      expect(relationships[1]).toEqual({
        person1Id: 2,
        person2Id: 1,
        type: 'spouse',
        parentRole: null
      })
    })

    it('should create symmetric relationships (both directions)', () => {
      // ARRANGE
      const personAId = 5
      const personBId = 10

      // ACT
      const relationships = createSpouseRelationship(personAId, personBId)

      // ASSERT
      expect(relationships).toHaveLength(2)
      expect(relationships[0].person1Id).toBe(personAId)
      expect(relationships[0].person2Id).toBe(personBId)
      expect(relationships[1].person1Id).toBe(personBId)
      expect(relationships[1].person2Id).toBe(personAId)
    })

    it('should always use type "spouse" for both directions', () => {
      // ARRANGE
      const person1Id = 1
      const person2Id = 2

      // ACT
      const relationships = createSpouseRelationship(person1Id, person2Id)

      // ASSERT
      expect(relationships[0].type).toBe('spouse')
      expect(relationships[1].type).toBe('spouse')
    })

    it('should set parentRole to null for spouse relationships', () => {
      // ARRANGE
      const person1Id = 1
      const person2Id = 2

      // ACT
      const relationships = createSpouseRelationship(person1Id, person2Id)

      // ASSERT
      expect(relationships[0].parentRole).toBeNull()
      expect(relationships[1].parentRole).toBeNull()
    })
  })

  describe('addSpouseWithRelationship - Atomic Spouse Creation', () => {
    let mockApi

    beforeEach(() => {
      mockApi = {
        createPerson: vi.fn(),
        createRelationship: vi.fn(),
        deletePerson: vi.fn()
      }
    })

    it('should create spouse and both bidirectional relationships on success', async () => {
      // ARRANGE
      const spouseData = { firstName: 'Alice', lastName: 'Doe', birthDate: '1985-01-01', gender: 'female' }
      const personId = 1

      const createdSpouse = { id: 10, ...spouseData }
      const relationship1 = { id: 100, person1Id: 1, person2Id: 10, type: 'spouse', parentRole: null }
      const relationship2 = { id: 101, person1Id: 10, person2Id: 1, type: 'spouse', parentRole: null }

      mockApi.createPerson.mockResolvedValue(createdSpouse)
      mockApi.createRelationship
        .mockResolvedValueOnce(relationship1)
        .mockResolvedValueOnce(relationship2)

      // ACT
      const result = await addSpouseWithRelationship(mockApi, spouseData, personId)

      // ASSERT
      expect(mockApi.createPerson).toHaveBeenCalledWith(spouseData)
      expect(mockApi.createRelationship).toHaveBeenCalledTimes(2)
      expect(mockApi.createRelationship).toHaveBeenCalledWith({
        person1Id: 1,
        person2Id: 10,
        type: 'spouse',
        parentRole: null
      })
      expect(mockApi.createRelationship).toHaveBeenCalledWith({
        person1Id: 10,
        person2Id: 1,
        type: 'spouse',
        parentRole: null
      })
      expect(result).toEqual({
        person: createdSpouse,
        relationships: [relationship1, relationship2],
        success: true
      })
    })

    it('should rollback person creation if first relationship creation fails', async () => {
      // ARRANGE
      const spouseData = { firstName: 'Bob', lastName: 'Smith', gender: 'male' }
      const personId = 2

      const createdSpouse = { id: 15, ...spouseData }

      mockApi.createPerson.mockResolvedValue(createdSpouse)
      mockApi.createRelationship.mockRejectedValue(new Error('First relationship creation failed'))
      mockApi.deletePerson.mockResolvedValue()

      // ACT
      const result = await addSpouseWithRelationship(mockApi, spouseData, personId)

      // ASSERT
      expect(mockApi.createPerson).toHaveBeenCalledWith(spouseData)
      expect(mockApi.createRelationship).toHaveBeenCalledTimes(1)
      expect(mockApi.deletePerson).toHaveBeenCalledWith(15) // Rollback
      expect(result).toEqual({
        person: null,
        relationships: null,
        success: false,
        error: 'First relationship creation failed'
      })
    })

    it('should rollback person and first relationship if second relationship creation fails', async () => {
      // ARRANGE
      const spouseData = { firstName: 'Charlie', lastName: 'Jones', gender: 'male' }
      const personId = 3

      const createdSpouse = { id: 20, ...spouseData }
      const relationship1 = { id: 200, person1Id: 3, person2Id: 20, type: 'spouse', parentRole: null }

      mockApi.createPerson.mockResolvedValue(createdSpouse)
      mockApi.createRelationship
        .mockResolvedValueOnce(relationship1)
        .mockRejectedValueOnce(new Error('Second relationship creation failed'))
      mockApi.deletePerson.mockResolvedValue()

      // ACT
      const result = await addSpouseWithRelationship(mockApi, spouseData, personId)

      // ASSERT
      expect(mockApi.createPerson).toHaveBeenCalledWith(spouseData)
      expect(mockApi.createRelationship).toHaveBeenCalledTimes(2)
      expect(mockApi.deletePerson).toHaveBeenCalledWith(20) // Rollback person
      expect(result).toEqual({
        person: null,
        relationships: null,
        success: false,
        error: 'Second relationship creation failed'
      })
    })

    it('should not attempt rollback if person creation fails', async () => {
      // ARRANGE
      const spouseData = { firstName: 'Diana', lastName: 'Brown', gender: 'female' }
      const personId = 4

      mockApi.createPerson.mockRejectedValue(new Error('Person creation failed'))

      // ACT
      const result = await addSpouseWithRelationship(mockApi, spouseData, personId)

      // ASSERT
      expect(mockApi.createPerson).toHaveBeenCalledWith(spouseData)
      expect(mockApi.createRelationship).not.toHaveBeenCalled()
      expect(mockApi.deletePerson).not.toHaveBeenCalled()
      expect(result).toEqual({
        person: null,
        relationships: null,
        success: false,
        error: 'Person creation failed'
      })
    })

    it('should handle rollback failure gracefully', async () => {
      // ARRANGE
      const spouseData = { firstName: 'Eve', lastName: 'Wilson', gender: 'female' }
      const personId = 5

      const createdSpouse = { id: 25, ...spouseData }

      mockApi.createPerson.mockResolvedValue(createdSpouse)
      mockApi.createRelationship.mockRejectedValue(new Error('Relationship failed'))
      mockApi.deletePerson.mockRejectedValue(new Error('Rollback failed'))

      // Spy on console.error to verify it's called
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // ACT
      const result = await addSpouseWithRelationship(mockApi, spouseData, personId)

      // ASSERT
      expect(mockApi.deletePerson).toHaveBeenCalledWith(25)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to rollback person creation:', expect.any(Error))
      expect(result.success).toBe(false)
      expect(result.error).toBe('Relationship failed')

      consoleErrorSpy.mockRestore()
    })

    it('should preserve spouse data exactly as provided to API', async () => {
      // ARRANGE
      const spouseData = {
        firstName: 'Frank',
        lastName: 'Taylor',
        birthDate: '1990-05-15',
        deathDate: '',
        gender: 'male'
      }
      const personId = 6

      const createdSpouse = { id: 30, ...spouseData }
      const relationship1 = { id: 300, person1Id: 6, person2Id: 30, type: 'spouse', parentRole: null }
      const relationship2 = { id: 301, person1Id: 30, person2Id: 6, type: 'spouse', parentRole: null }

      mockApi.createPerson.mockResolvedValue(createdSpouse)
      mockApi.createRelationship
        .mockResolvedValueOnce(relationship1)
        .mockResolvedValueOnce(relationship2)

      // ACT
      await addSpouseWithRelationship(mockApi, spouseData, personId)

      // ASSERT
      expect(mockApi.createPerson).toHaveBeenCalledWith(spouseData)
      expect(mockApi.createPerson).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Frank',
          lastName: 'Taylor',
          birthDate: '1990-05-15',
          gender: 'male'
        })
      )
    })
  })

  describe('Integration - Complete Quick Add Spouse Flow', () => {
    let mockApi

    beforeEach(() => {
      mockApi = {
        createPerson: vi.fn(),
        createRelationship: vi.fn(),
        deletePerson: vi.fn()
      }
    })

    it('should handle complete flow from person selection to spouse creation', async () => {
      // ARRANGE
      const person = { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male' }

      // Step 1: Prepare form data
      const formData = prepareSpouseFormData(person)
      expect(formData.lastName).toBe('Doe')
      expect(formData.gender).toBe('') // Not pre-populated

      // Step 2: User fills in form
      const spouseData = {
        ...formData,
        firstName: 'Jane',
        gender: 'female'
      }

      // Step 3: Create spouse with bidirectional relationships
      const createdSpouse = { id: 10, ...spouseData }
      const relationship1 = { id: 100, person1Id: 1, person2Id: 10, type: 'spouse', parentRole: null }
      const relationship2 = { id: 101, person1Id: 10, person2Id: 1, type: 'spouse', parentRole: null }

      mockApi.createPerson.mockResolvedValue(createdSpouse)
      mockApi.createRelationship
        .mockResolvedValueOnce(relationship1)
        .mockResolvedValueOnce(relationship2)

      // ACT
      const result = await addSpouseWithRelationship(mockApi, spouseData, person.id)

      // ASSERT
      expect(result.success).toBe(true)
      expect(result.person.firstName).toBe('Jane')
      expect(result.person.lastName).toBe('Doe')
      expect(result.relationships).toHaveLength(2)
      expect(result.relationships[0].type).toBe('spouse')
      expect(result.relationships[1].type).toBe('spouse')
    })

    it('should support adding multiple spouses (divorced/widowed scenarios)', async () => {
      // ARRANGE
      const person = { id: 1, firstName: 'Alex', lastName: 'Brown', gender: 'other' }

      const spouse1Data = { firstName: 'Jordan', lastName: 'Brown', gender: 'female' }
      const spouse2Data = { firstName: 'Casey', lastName: 'Brown', gender: 'male' }

      mockApi.createPerson
        .mockResolvedValueOnce({ id: 20, ...spouse1Data })
        .mockResolvedValueOnce({ id: 21, ...spouse2Data })

      mockApi.createRelationship
        .mockResolvedValueOnce({ id: 200, person1Id: 1, person2Id: 20, type: 'spouse', parentRole: null })
        .mockResolvedValueOnce({ id: 201, person1Id: 20, person2Id: 1, type: 'spouse', parentRole: null })
        .mockResolvedValueOnce({ id: 202, person1Id: 1, person2Id: 21, type: 'spouse', parentRole: null })
        .mockResolvedValueOnce({ id: 203, person1Id: 21, person2Id: 1, type: 'spouse', parentRole: null })

      // ACT
      const result1 = await addSpouseWithRelationship(mockApi, spouse1Data, person.id)
      const result2 = await addSpouseWithRelationship(mockApi, spouse2Data, person.id)

      // ASSERT
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(mockApi.createPerson).toHaveBeenCalledTimes(2)
      expect(mockApi.createRelationship).toHaveBeenCalledTimes(4) // 2 bidirectional relationships = 4 calls
    })

    it('should support same-sex partnerships (no gender restriction)', async () => {
      // ARRANGE
      const person = { id: 1, firstName: 'Alice', lastName: 'Smith', gender: 'female' }

      const formData = prepareSpouseFormData(person)
      const spouseData = {
        ...formData,
        firstName: 'Emma',
        gender: 'female' // Same-sex partnership
      }

      const createdSpouse = { id: 10, ...spouseData }
      const relationship1 = { id: 100, person1Id: 1, person2Id: 10, type: 'spouse', parentRole: null }
      const relationship2 = { id: 101, person1Id: 10, person2Id: 1, type: 'spouse', parentRole: null }

      mockApi.createPerson.mockResolvedValue(createdSpouse)
      mockApi.createRelationship
        .mockResolvedValueOnce(relationship1)
        .mockResolvedValueOnce(relationship2)

      // ACT
      const result = await addSpouseWithRelationship(mockApi, spouseData, person.id)

      // ASSERT
      expect(result.success).toBe(true)
      expect(result.person.gender).toBe('female')
      expect(result.relationships).toHaveLength(2)
    })
  })
})
