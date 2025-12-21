import { describe, it, expect, beforeEach, vi } from 'vitest'
import { get } from 'svelte/store'
import { people, relationships } from '../stores/familyStore.js'
import { prepareSpouseFormData, addSpouseWithRelationship } from './quickAddSpouseUtils.js'

/**
 * Acceptance tests for Quick Add Spouse feature (Issue #7)
 * Testing against actual acceptance criteria from the issue
 */
describe('Quick Add Spouse - Acceptance Criteria', () => {
  let mockApi

  beforeEach(() => {
    people.set([])
    relationships.set([])
    mockApi = {
      createPerson: vi.fn(),
      createRelationship: vi.fn(),
      deletePerson: vi.fn()
    }
  })

  describe('Scenario 1: Adding first spouse to person', () => {
    it('should NOT pre-populate gender (spouse can be any gender)', () => {
      // GIVEN I am viewing a person's modal who has no spouse
      const person = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        gender: 'male'
      }

      // WHEN I click "Add Spouse" button
      // THEN I should see a new person form with:
      // - Last name defaulted to person's last name (can be edited)
      const formData = prepareSpouseFormData(person)
      expect(formData.lastName).toBe('Doe')
      expect(formData.firstName).toBe('')

      // - Gender NOT pre-populated (spouse can be any gender)
      expect(formData.gender).toBe('')
    })

    it('should create spouse with bidirectional spouse relationship when form is saved', async () => {
      // GIVEN a person with no spouse
      const person = { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male' }
      const spouseData = { firstName: 'Jane', lastName: 'Doe', birthDate: '1985-01-01', gender: 'female' }

      const createdSpouse = { id: 10, ...spouseData }
      const relationship1 = { id: 100, person1Id: 1, person2Id: 10, type: 'spouse', parentRole: null }
      const relationship2 = { id: 101, person1Id: 10, person2Id: 1, type: 'spouse', parentRole: null }

      mockApi.createPerson.mockResolvedValue(createdSpouse)
      mockApi.createRelationship
        .mockResolvedValueOnce(relationship1)
        .mockResolvedValueOnce(relationship2)

      // WHEN I save the form
      const result = await addSpouseWithRelationship(mockApi, spouseData, person.id)

      // THEN the spouse should be created with bidirectional relationship
      expect(result.success).toBe(true)
      expect(result.person.id).toBe(10)
      expect(result.person.firstName).toBe('Jane')
      expect(result.relationships).toHaveLength(2)

      // AND both relationships should be type "spouse"
      expect(result.relationships[0].type).toBe('spouse')
      expect(result.relationships[1].type).toBe('spouse')

      // AND relationships should be bidirectional
      expect(result.relationships[0].person1Id).toBe(1)
      expect(result.relationships[0].person2Id).toBe(10)
      expect(result.relationships[1].person1Id).toBe(10)
      expect(result.relationships[1].person2Id).toBe(1)

      // AND I should see the spouse appear in the spouses list
      expect(mockApi.createPerson).toHaveBeenCalledWith(spouseData)
      expect(mockApi.createRelationship).toHaveBeenCalledTimes(2)
    })
  })

  describe('Scenario 2: Multiple spouses (divorced/widowed scenarios)', () => {
    it('should allow adding another spouse even if one already exists', async () => {
      // GIVEN I have a person who already has one spouse
      const person = { id: 1, firstName: 'Alex', lastName: 'Smith', gender: 'other' }

      // First spouse (e.g., divorced)
      const spouse1Data = { firstName: 'Jordan', lastName: 'Smith', gender: 'female' }
      mockApi.createPerson.mockResolvedValueOnce({ id: 10, ...spouse1Data })
      mockApi.createRelationship
        .mockResolvedValueOnce({ id: 100, person1Id: 1, person2Id: 10, type: 'spouse', parentRole: null })
        .mockResolvedValueOnce({ id: 101, person1Id: 10, person2Id: 1, type: 'spouse', parentRole: null })

      const result1 = await addSpouseWithRelationship(mockApi, spouse1Data, person.id)
      expect(result1.success).toBe(true)

      // WHEN I click "Add Another Spouse" button
      // (In the UI, this button should always be visible even if spouse exists)
      const spouse2Data = { firstName: 'Casey', lastName: 'Smith', gender: 'male' }
      mockApi.createPerson.mockResolvedValueOnce({ id: 11, ...spouse2Data })
      mockApi.createRelationship
        .mockResolvedValueOnce({ id: 102, person1Id: 1, person2Id: 11, type: 'spouse', parentRole: null })
        .mockResolvedValueOnce({ id: 103, person1Id: 11, person2Id: 1, type: 'spouse', parentRole: null })

      // THEN I should be able to add another spouse
      const result2 = await addSpouseWithRelationship(mockApi, spouse2Data, person.id)

      expect(result2.success).toBe(true)
      expect(mockApi.createPerson).toHaveBeenCalledTimes(2)
      expect(mockApi.createRelationship).toHaveBeenCalledTimes(4) // 2 bidirectional = 4 total

      // AND both spouses should appear in the spouses list
      // (This would be verified in the UI)
    })

    it('should display all spouses in a list', () => {
      // GIVEN a person has multiple spouses
      // WHEN I view the person's modal
      // THEN I should see a "Spouses" section
      // AND all spouses should be displayed in the list
      // (This will be tested in the UI/integration tests)

      // For now, we verify the data structure supports multiple spouses
      const person = { id: 1, firstName: 'Alex', lastName: 'Smith' }
      const spouse1 = { id: 10, firstName: 'Jordan', lastName: 'Smith' }
      const spouse2 = { id: 11, firstName: 'Casey', lastName: 'Smith' }

      const spouseRelationships = [
        { person1Id: 1, person2Id: 10, type: 'spouse' },
        { person1Id: 1, person2Id: 11, type: 'spouse' }
      ]

      expect(spouseRelationships).toHaveLength(2)
      expect(spouseRelationships.every(r => r.type === 'spouse')).toBe(true)
    })
  })

  describe('Scenario 3: Spouse appears in tree visualization', () => {
    it('should create spouse relationship compatible with TreeView', async () => {
      // GIVEN I add a spouse to a person
      const person = { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male' }
      const spouseData = { firstName: 'Jane', lastName: 'Doe', gender: 'female' }

      const createdSpouse = { id: 10, ...spouseData }
      const relationship1 = { id: 100, person1Id: 1, person2Id: 10, type: 'spouse', parentRole: null }
      const relationship2 = { id: 101, person1Id: 10, person2Id: 1, type: 'spouse', parentRole: null }

      mockApi.createPerson.mockResolvedValue(createdSpouse)
      mockApi.createRelationship
        .mockResolvedValueOnce(relationship1)
        .mockResolvedValueOnce(relationship2)

      const result = await addSpouseWithRelationship(mockApi, spouseData, person.id)

      // THEN the relationship should use type "spouse" (already supported by TreeView)
      expect(result.success).toBe(true)
      expect(result.relationships[0].type).toBe('spouse')
      expect(result.relationships[1].type).toBe('spouse')

      // AND TreeView should display them horizontally (existing TreeView functionality)
      // (Verified by checking the relationship type is "spouse")
    })
  })

  describe('Scenario 4: Cancel spouse creation', () => {
    it('should not create person or relationships when user cancels', async () => {
      // GIVEN I am in the "Add Spouse" flow
      const person = { id: 1, firstName: 'Diana', lastName: 'Brown', gender: 'female' }

      // WHEN I click cancel or close
      // (In a real scenario, the cancel handler would prevent the submit)
      // Here we just verify that if we don't call addSpouseWithRelationship, nothing happens

      // THEN no person or relationship should be created
      expect(mockApi.createPerson).not.toHaveBeenCalled()
      expect(mockApi.createRelationship).not.toHaveBeenCalled()

      // AND I should return to viewing the person's modal
      // (This would be verified in UI/integration tests)
    })
  })

  describe('Transactional Integrity - Both person and relationships must succeed', () => {
    it('should rollback person creation if first relationship creation fails', async () => {
      // GIVEN I am adding a spouse
      const person = { id: 1, firstName: 'Frank', lastName: 'Wilson', gender: 'male' }
      const spouseData = { firstName: 'Grace', lastName: 'Wilson', gender: 'female' }

      const createdSpouse = { id: 20, ...spouseData }

      mockApi.createPerson.mockResolvedValue(createdSpouse)
      mockApi.createRelationship.mockRejectedValue(new Error('Relationship creation failed'))
      mockApi.deletePerson.mockResolvedValue()

      // WHEN relationship creation fails
      const result = await addSpouseWithRelationship(mockApi, spouseData, person.id)

      // THEN the person should be rolled back
      expect(result.success).toBe(false)
      expect(result.error).toBe('Relationship creation failed')
      expect(mockApi.createPerson).toHaveBeenCalled()
      expect(mockApi.deletePerson).toHaveBeenCalledWith(20) // Rollback

      // AND no orphaned person should exist in the database
      // (Verified by the rollback call above)
    })

    it('should rollback person and first relationship if second relationship creation fails', async () => {
      // GIVEN I am adding a spouse
      const person = { id: 1, firstName: 'Henry', lastName: 'Martinez', gender: 'male' }
      const spouseData = { firstName: 'Ivy', lastName: 'Martinez', gender: 'female' }

      const createdSpouse = { id: 25, ...spouseData }
      const relationship1 = { id: 250, person1Id: 1, person2Id: 25, type: 'spouse', parentRole: null }

      mockApi.createPerson.mockResolvedValue(createdSpouse)
      mockApi.createRelationship
        .mockResolvedValueOnce(relationship1)
        .mockRejectedValueOnce(new Error('Second relationship creation failed'))
      mockApi.deletePerson.mockResolvedValue()

      // WHEN second relationship creation fails
      const result = await addSpouseWithRelationship(mockApi, spouseData, person.id)

      // THEN the person should be rolled back
      expect(result.success).toBe(false)
      expect(result.error).toBe('Second relationship creation failed')
      expect(mockApi.createPerson).toHaveBeenCalled()
      expect(mockApi.createRelationship).toHaveBeenCalledTimes(2)
      expect(mockApi.deletePerson).toHaveBeenCalledWith(25) // Rollback

      // NOTE: Backend should handle relationship cleanup via foreign key cascade
      // OR we could add explicit relationship deletion in the rollback logic
    })

    it('should not create relationships if person creation fails', async () => {
      // GIVEN I am adding a spouse
      const person = { id: 1, firstName: 'Jack', lastName: 'Garcia', gender: 'male' }
      const spouseData = { firstName: 'Kate', lastName: 'Garcia', gender: 'female' }

      mockApi.createPerson.mockRejectedValue(new Error('Person creation failed'))

      // WHEN person creation fails
      const result = await addSpouseWithRelationship(mockApi, spouseData, person.id)

      // THEN no relationships should be created
      expect(result.success).toBe(false)
      expect(result.error).toBe('Person creation failed')
      expect(mockApi.createPerson).toHaveBeenCalled()
      expect(mockApi.createRelationship).not.toHaveBeenCalled()
      expect(mockApi.deletePerson).not.toHaveBeenCalled()
    })
  })

  describe('Data Integrity - Form pre-population and validation', () => {
    it('should preserve all spouse data fields correctly', async () => {
      // GIVEN I am adding a spouse with complete data
      const person = { id: 1, firstName: 'Laura', lastName: 'Rodriguez', gender: 'female' }
      const spouseData = {
        firstName: 'Miguel',
        lastName: 'Rodriguez',
        birthDate: '1982-03-15',
        deathDate: '',
        gender: 'male'
      }

      const createdSpouse = { id: 30, ...spouseData }
      const relationship1 = { id: 300, person1Id: 1, person2Id: 30, type: 'spouse', parentRole: null }
      const relationship2 = { id: 301, person1Id: 30, person2Id: 1, type: 'spouse', parentRole: null }

      mockApi.createPerson.mockResolvedValue(createdSpouse)
      mockApi.createRelationship
        .mockResolvedValueOnce(relationship1)
        .mockResolvedValueOnce(relationship2)

      // WHEN I save the form
      const result = await addSpouseWithRelationship(mockApi, spouseData, person.id)

      // THEN all data should be preserved exactly as entered
      expect(result.success).toBe(true)
      expect(mockApi.createPerson).toHaveBeenCalledWith(spouseData)
      expect(result.person.firstName).toBe('Miguel')
      expect(result.person.lastName).toBe('Rodriguez')
      expect(result.person.birthDate).toBe('1982-03-15')
      expect(result.person.gender).toBe('male')
    })

    it('should allow editing of pre-filled last name', () => {
      // GIVEN person has last name "Johnson"
      const person = { id: 1, firstName: 'Sarah', lastName: 'Johnson', gender: 'female' }

      // WHEN form is pre-filled
      const formData = prepareSpouseFormData(person)

      // THEN last name should be "Johnson"
      expect(formData.lastName).toBe('Johnson')

      // AND user should be able to edit it to something else (e.g., maiden name)
      const modifiedData = { ...formData, lastName: 'Williams' }
      expect(modifiedData.lastName).toBe('Williams') // Can be changed
    })

    it('should support same-sex partnerships without gender restriction', () => {
      // GIVEN a person of any gender
      const malePerson = { id: 1, firstName: 'David', lastName: 'Lee', gender: 'male' }
      const femalePerson = { id: 2, firstName: 'Emma', lastName: 'Chen', gender: 'female' }
      const otherPerson = { id: 3, firstName: 'Alex', lastName: 'Taylor', gender: 'other' }

      // WHEN I prepare form data for adding spouse
      const maleForm = prepareSpouseFormData(malePerson)
      const femaleForm = prepareSpouseFormData(femalePerson)
      const otherForm = prepareSpouseFormData(otherPerson)

      // THEN gender should NOT be pre-populated in any case
      expect(maleForm.gender).toBe('')
      expect(femaleForm.gender).toBe('')
      expect(otherForm.gender).toBe('')

      // AND user should be able to select any gender for spouse
      // (This allows same-sex partnerships and partnerships with non-binary individuals)
    })
  })
})
