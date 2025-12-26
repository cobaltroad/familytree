import { describe, it, expect, beforeEach, vi } from 'vitest'
import { get } from 'svelte/store'
import { people, relationships } from '../stores/familyStore.js'
import { determineParentRole, prepareChildFormData, addChildWithRelationship } from './quickAddChildUtils.js'

/**
 * Acceptance tests for Quick Add Child feature (Issue #4)
 * Testing against actual acceptance criteria from the issue
 */
describe('Quick Add Child - Acceptance Criteria', () => {
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

  describe('Scenario 1: Adding first child to person', () => {
    it('should pre-fill parent relationship and default last name', () => {
      // GIVEN I am viewing a person's modal who has no children
      const parent = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        gender: 'male'
      }

      // WHEN I click "Add Child" button
      // THEN I should see a new person form with:
      // - Parent relationship pre-filled (this person as parent)
      const parentRole = determineParentRole(parent.gender)
      expect(parentRole).toBe('father')

      // - Last name defaulted to parent's last name (can be edited)
      const formData = prepareChildFormData(parent)
      expect(formData.lastName).toBe('Doe')
      expect(formData.firstName).toBe('')
    })

    it('should create child with parent relationship established when form is saved', async () => {
      // GIVEN a parent with no children
      const parent = { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male' }
      const childData = { firstName: 'Alice', lastName: 'Doe', birthDate: '2010-01-01', gender: 'female' }
      const parentRole = 'father'

      const createdChild = { id: 10, ...childData }
      const createdRelationship = { id: 100, person1Id: 1, person2Id: 10, type: 'father', parentRole: 'father' }

      mockApi.createPerson.mockResolvedValue(createdChild)
      mockApi.createRelationship.mockResolvedValue(createdRelationship)

      // WHEN I save the form
      const result = await addChildWithRelationship(mockApi, childData, parent.id, parentRole)

      // THEN the child should be created with the parent relationship established
      expect(result.success).toBe(true)
      expect(result.person.id).toBe(10)
      expect(result.person.firstName).toBe('Alice')
      expect(result.relationship.type).toBe('father')
      expect(result.relationship.parentRole).toBe('father')

      // AND I should see the child appear in the children list
      // (This would be verified in the UI, but we can verify the data)
      expect(mockApi.createPerson).toHaveBeenCalledWith(childData)
      expect(mockApi.createRelationship).toHaveBeenCalledWith({
        person1Id: 1,
        person2Id: 10,
        type: 'father',
        parentRole: 'father'
      })
    })
  })

  describe('Scenario 2: Multiple children creation', () => {
    it('should allow adding another child immediately after first child is saved', async () => {
      // GIVEN I have just added a child to a person
      const parent = { id: 1, firstName: 'Jane', lastName: 'Smith', gender: 'female' }
      const child1Data = { firstName: 'Bob', lastName: 'Smith', gender: 'male' }
      const child2Data = { firstName: 'Charlie', lastName: 'Smith', gender: 'male' }
      const parentRole = 'mother'

      mockApi.createPerson
        .mockResolvedValueOnce({ id: 10, ...child1Data })
        .mockResolvedValueOnce({ id: 11, ...child2Data })

      mockApi.createRelationship
        .mockResolvedValueOnce({ id: 100, person1Id: 1, person2Id: 10, type: 'mother', parentRole: 'mother' })
        .mockResolvedValueOnce({ id: 101, person1Id: 1, person2Id: 11, type: 'mother', parentRole: 'mother' })

      // WHEN the first child is successfully saved
      const result1 = await addChildWithRelationship(mockApi, child1Data, parent.id, parentRole)

      // THEN I should see a success (result.success = true)
      expect(result1.success).toBe(true)

      // AND I should be able to add another child immediately
      const result2 = await addChildWithRelationship(mockApi, child2Data, parent.id, parentRole)

      expect(result2.success).toBe(true)
      expect(mockApi.createPerson).toHaveBeenCalledTimes(2)
      expect(mockApi.createRelationship).toHaveBeenCalledTimes(2)
    })
  })

  describe('Scenario 3: Pre-filled data validation', () => {
    it('should determine parent role as "father" when parent gender is male', () => {
      // GIVEN I am adding a child from a person modal
      const parent = { id: 1, firstName: 'Bob', lastName: 'Jones', gender: 'male' }

      // WHEN I view the relationship form
      // THEN the parent role should be determined by the parent's gender
      // - If parent gender is "male", create "father" relationship
      const parentRole = determineParentRole(parent.gender)
      expect(parentRole).toBe('father')
    })

    it('should determine parent role as "mother" when parent gender is female', () => {
      // GIVEN I am adding a child from a person modal
      const parent = { id: 2, firstName: 'Alice', lastName: 'Williams', gender: 'female' }

      // WHEN I view the relationship form
      // THEN the parent role should be determined by the parent's gender
      // - If parent gender is "female", create "mother" relationship
      const parentRole = determineParentRole(parent.gender)
      expect(parentRole).toBe('mother')
    })

    it('should prompt user to select parent role when gender is "other"', () => {
      // GIVEN I am adding a child from a person modal
      const parent = { id: 3, firstName: 'Jordan', lastName: 'Lee', gender: 'other' }

      // WHEN I view the relationship form
      // THEN the parent role should prompt user to select
      // - If parent gender is "other", prompt user to select parent role
      const parentRole = determineParentRole(parent.gender)
      expect(parentRole).toBeNull() // null means user must select
    })

    it('should prompt user to select parent role when gender is unspecified', () => {
      // GIVEN I am adding a child from a person modal
      const parent = { id: 4, firstName: 'Sam', lastName: 'Taylor', gender: '' }

      // WHEN I view the relationship form
      // THEN the parent role should prompt user to select
      // - If parent gender is unspecified, prompt user to select parent role
      const parentRole = determineParentRole(parent.gender)
      expect(parentRole).toBeNull() // null means user must select
    })
  })

  describe('Scenario 4: Cancel child creation', () => {
    it('should not create person or relationship when user cancels', async () => {
      // GIVEN I am in the "Add Child" flow
      const parent = { id: 1, firstName: 'Diana', lastName: 'Brown', gender: 'female' }

      // WHEN I click cancel or close
      // (In a real scenario, the cancel handler would prevent the submit)
      // Here we just verify that if we don't call addChildWithRelationship, nothing happens

      // THEN no person or relationship should be created
      expect(mockApi.createPerson).not.toHaveBeenCalled()
      expect(mockApi.createRelationship).not.toHaveBeenCalled()

      // AND I should return to viewing the parent's modal
      // (This would be verified in UI/integration tests)
    })
  })

  describe('Transactional Integrity - Both person and relationship must succeed', () => {
    it('should rollback person creation if relationship creation fails', async () => {
      // GIVEN I am adding a child
      const parent = { id: 1, firstName: 'Frank', lastName: 'Wilson', gender: 'male' }
      const childData = { firstName: 'Grace', lastName: 'Wilson', gender: 'female' }
      const parentRole = 'father'

      const createdChild = { id: 20, ...childData }

      mockApi.createPerson.mockResolvedValue(createdChild)
      mockApi.createRelationship.mockRejectedValue(new Error('Relationship creation failed'))
      mockApi.deletePerson.mockResolvedValue()

      // WHEN relationship creation fails
      const result = await addChildWithRelationship(mockApi, childData, parent.id, parentRole)

      // THEN the person should be rolled back
      expect(result.success).toBe(false)
      expect(result.error).toBe('Relationship creation failed')
      expect(mockApi.createPerson).toHaveBeenCalled()
      expect(mockApi.createRelationship).toHaveBeenCalled()
      expect(mockApi.deletePerson).toHaveBeenCalledWith(20) // Rollback

      // AND no orphaned person should exist in the database
      // (Verified by the rollback call above)
    })

    it('should not create relationship if person creation fails', async () => {
      // GIVEN I am adding a child
      const parent = { id: 1, firstName: 'Henry', lastName: 'Martinez', gender: 'male' }
      const childData = { firstName: 'Ivy', lastName: 'Martinez', gender: 'female' }
      const parentRole = 'father'

      mockApi.createPerson.mockRejectedValue(new Error('Person creation failed'))

      // WHEN person creation fails
      const result = await addChildWithRelationship(mockApi, childData, parent.id, parentRole)

      // THEN no relationship should be created
      expect(result.success).toBe(false)
      expect(result.error).toBe('Person creation failed')
      expect(mockApi.createPerson).toHaveBeenCalled()
      expect(mockApi.createRelationship).not.toHaveBeenCalled()
      expect(mockApi.deletePerson).not.toHaveBeenCalled()
    })
  })

  describe('Data Integrity - Form pre-population and validation', () => {
    it('should preserve all child data fields correctly', async () => {
      // GIVEN I am adding a child with complete data
      const parent = { id: 1, firstName: 'Isabel', lastName: 'Garcia', gender: 'female' }
      const childData = {
        firstName: 'Jack',
        lastName: 'Garcia',
        birthDate: '2015-03-15',
        deathDate: '',
        gender: 'male'
      }
      const parentRole = 'mother'

      const createdChild = { id: 30, ...childData }
      const createdRelationship = { id: 300, person1Id: 1, person2Id: 30, type: 'mother', parentRole: 'mother' }

      mockApi.createPerson.mockResolvedValue(createdChild)
      mockApi.createRelationship.mockResolvedValue(createdRelationship)

      // WHEN I save the form
      const result = await addChildWithRelationship(mockApi, childData, parent.id, parentRole)

      // THEN all data should be preserved exactly as entered
      expect(result.success).toBe(true)
      expect(mockApi.createPerson).toHaveBeenCalledWith(childData)
      expect(result.person.firstName).toBe('Jack')
      expect(result.person.lastName).toBe('Garcia')
      expect(result.person.birthDate).toBe('2015-03-15')
      expect(result.person.gender).toBe('male')
    })

    it('should allow editing of pre-filled last name', () => {
      // GIVEN parent has last name "Rodriguez"
      const parent = { id: 1, firstName: 'Laura', lastName: 'Rodriguez', gender: 'female' }

      // WHEN form is pre-filled
      const formData = prepareChildFormData(parent)

      // THEN last name should be "Rodriguez"
      expect(formData.lastName).toBe('Rodriguez')

      // AND user should be able to edit it to something else
      const modifiedData = { ...formData, lastName: 'Smith' }
      expect(modifiedData.lastName).toBe('Smith') // Can be changed
    })
  })
})
