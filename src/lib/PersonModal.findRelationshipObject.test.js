/**
 * Tests for PersonModal's findRelationshipObject helper function
 *
 * This test file verifies that findRelationshipObject correctly finds relationship
 * objects for parents, children, and spouses given the denormalized API format
 * where parentOf relationships are returned as type="mother" or type="father".
 */

import { describe, it, expect } from 'vitest'

/**
 * Extracted findRelationshipObject function from PersonModal.svelte
 * This is the function we're testing (FIXED version)
 */
function findRelationshipObject(personRelationshipObjects, person, relatedPersonId, type, parentRole = null) {
  if (!personRelationshipObjects) return null

  return personRelationshipObjects.find(rel => {
    if (type === 'spouse') {
      return rel.type === 'spouse' && (
        (rel.person1Id === person.id && rel.person2Id === relatedPersonId) ||
        (rel.person2Id === person.id && rel.person1Id === relatedPersonId)
      )
    } else if (type === 'parentOf') {
      // For parents: person is person2Id (child), related person is person1Id (parent)
      // For children: person is person1Id (parent), related person is person2Id (child)
      if (parentRole) {
        // Looking for a parent relationship
        // IMPORTANT: API denormalizes parentOf relationships, so we need to check for both:
        // - Denormalized format: type="mother" or type="father" with parentRole="mother"/"father"
        // - Normalized format: type="parentOf" with parentRole="mother"/"father" (backwards compatibility)
        const isParentRelationship = rel.type === 'parentOf' || rel.type === parentRole
        return isParentRelationship &&
          rel.person2Id === person.id &&
          rel.person1Id === relatedPersonId &&
          rel.parentRole === parentRole
      } else {
        // Looking for a child relationship
        // IMPORTANT: API denormalizes parentOf relationships, so we need to check for both:
        // - Denormalized format: type="mother" or type="father"
        // - Normalized format: type="parentOf" (backwards compatibility)
        const isParentRelationship = rel.type === 'parentOf' || rel.type === 'mother' || rel.type === 'father'
        return isParentRelationship &&
          rel.person1Id === person.id &&
          rel.person2Id === relatedPersonId
      }
    }
    return false
  }) || null
}

describe('findRelationshipObject', () => {
  describe('Spouse relationships', () => {
    it('should find spouse relationship when person is person1Id', () => {
      const person = { id: 1, firstName: 'John', lastName: 'Doe' }
      const spouseId = 2
      const relationships = [
        { id: 10, person1Id: 1, person2Id: 2, type: 'spouse', parentRole: null }
      ]

      const result = findRelationshipObject(relationships, person, spouseId, 'spouse')

      expect(result).not.toBeNull()
      expect(result.id).toBe(10)
      expect(result.type).toBe('spouse')
    })

    it('should find spouse relationship when person is person2Id', () => {
      const person = { id: 2, firstName: 'Jane', lastName: 'Doe' }
      const spouseId = 1
      const relationships = [
        { id: 10, person1Id: 1, person2Id: 2, type: 'spouse', parentRole: null }
      ]

      const result = findRelationshipObject(relationships, person, spouseId, 'spouse')

      expect(result).not.toBeNull()
      expect(result.id).toBe(10)
      expect(result.type).toBe('spouse')
    })

    it('should return null if spouse relationship does not exist', () => {
      const person = { id: 1, firstName: 'John', lastName: 'Doe' }
      const spouseId = 99
      const relationships = [
        { id: 10, person1Id: 1, person2Id: 2, type: 'spouse', parentRole: null }
      ]

      const result = findRelationshipObject(relationships, person, spouseId, 'spouse')

      expect(result).toBeNull()
    })
  })

  describe('Parent relationships (DENORMALIZED API format)', () => {
    it('should find mother relationship when API returns type="mother"', () => {
      const person = { id: 3, firstName: 'Child', lastName: 'Doe' }
      const motherId = 1
      const relationships = [
        // API denormalizes parentOf relationships to type="mother" or type="father"
        { id: 20, person1Id: 1, person2Id: 3, type: 'mother', parentRole: 'mother' }
      ]

      const result = findRelationshipObject(relationships, person, motherId, 'parentOf', 'mother')

      expect(result).not.toBeNull()
      expect(result.id).toBe(20)
      expect(result.type).toBe('mother')
      expect(result.parentRole).toBe('mother')
    })

    it('should find father relationship when API returns type="father"', () => {
      const person = { id: 3, firstName: 'Child', lastName: 'Doe' }
      const fatherId = 2
      const relationships = [
        // API denormalizes parentOf relationships to type="mother" or type="father"
        { id: 21, person1Id: 2, person2Id: 3, type: 'father', parentRole: 'father' }
      ]

      const result = findRelationshipObject(relationships, person, fatherId, 'parentOf', 'father')

      expect(result).not.toBeNull()
      expect(result.id).toBe(21)
      expect(result.type).toBe('father')
      expect(result.parentRole).toBe('father')
    })

    it('should return null if mother relationship does not exist', () => {
      const person = { id: 3, firstName: 'Child', lastName: 'Doe' }
      const motherId = 99
      const relationships = [
        { id: 21, person1Id: 2, person2Id: 3, type: 'father', parentRole: 'father' }
      ]

      const result = findRelationshipObject(relationships, person, motherId, 'parentOf', 'mother')

      expect(result).toBeNull()
    })
  })

  describe('Child relationships (DENORMALIZED API format)', () => {
    it('should find child relationship when API returns type="mother"', () => {
      const person = { id: 1, firstName: 'Mother', lastName: 'Doe' }
      const childId = 3
      const relationships = [
        // API denormalizes: mother's relationship to child
        { id: 20, person1Id: 1, person2Id: 3, type: 'mother', parentRole: 'mother' }
      ]

      const result = findRelationshipObject(relationships, person, childId, 'parentOf')

      expect(result).not.toBeNull()
      expect(result.id).toBe(20)
      expect(result.type).toBe('mother')
    })

    it('should find child relationship when API returns type="father"', () => {
      const person = { id: 2, firstName: 'Father', lastName: 'Doe' }
      const childId = 3
      const relationships = [
        // API denormalizes: father's relationship to child
        { id: 21, person1Id: 2, person2Id: 3, type: 'father', parentRole: 'father' }
      ]

      const result = findRelationshipObject(relationships, person, childId, 'parentOf')

      expect(result).not.toBeNull()
      expect(result.id).toBe(21)
      expect(result.type).toBe('father')
    })

    it('should return null if child relationship does not exist', () => {
      const person = { id: 1, firstName: 'Mother', lastName: 'Doe' }
      const childId = 99
      const relationships = [
        { id: 20, person1Id: 1, person2Id: 3, type: 'mother', parentRole: 'mother' }
      ]

      const result = findRelationshipObject(relationships, person, childId, 'parentOf')

      expect(result).toBeNull()
    })
  })

  describe('Parent relationships (NORMALIZED format - backwards compatibility)', () => {
    it('should find mother relationship when API returns type="parentOf" with parentRole="mother"', () => {
      const person = { id: 3, firstName: 'Child', lastName: 'Doe' }
      const motherId = 1
      const relationships = [
        // Some older code might still use normalized format
        { id: 20, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'mother' }
      ]

      const result = findRelationshipObject(relationships, person, motherId, 'parentOf', 'mother')

      expect(result).not.toBeNull()
      expect(result.id).toBe(20)
      expect(result.type).toBe('parentOf')
      expect(result.parentRole).toBe('mother')
    })

    it('should find father relationship when API returns type="parentOf" with parentRole="father"', () => {
      const person = { id: 3, firstName: 'Child', lastName: 'Doe' }
      const fatherId = 2
      const relationships = [
        // Some older code might still use normalized format
        { id: 21, person1Id: 2, person2Id: 3, type: 'parentOf', parentRole: 'father' }
      ]

      const result = findRelationshipObject(relationships, person, fatherId, 'parentOf', 'father')

      expect(result).not.toBeNull()
      expect(result.id).toBe(21)
      expect(result.type).toBe('parentOf')
      expect(result.parentRole).toBe('father')
    })
  })

  describe('Child relationships (NORMALIZED format - backwards compatibility)', () => {
    it('should find child relationship when API returns type="parentOf"', () => {
      const person = { id: 1, firstName: 'Mother', lastName: 'Doe' }
      const childId = 3
      const relationships = [
        // Normalized format
        { id: 20, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'mother' }
      ]

      const result = findRelationshipObject(relationships, person, childId, 'parentOf')

      expect(result).not.toBeNull()
      expect(result.id).toBe(20)
      expect(result.type).toBe('parentOf')
    })
  })

  describe('Edge cases', () => {
    it('should return null when personRelationshipObjects is null', () => {
      const person = { id: 1, firstName: 'John', lastName: 'Doe' }
      const result = findRelationshipObject(null, person, 2, 'spouse')

      expect(result).toBeNull()
    })

    it('should return null when personRelationshipObjects is undefined', () => {
      const person = { id: 1, firstName: 'John', lastName: 'Doe' }
      const result = findRelationshipObject(undefined, person, 2, 'spouse')

      expect(result).toBeNull()
    })

    it('should return null when personRelationshipObjects is empty array', () => {
      const person = { id: 1, firstName: 'John', lastName: 'Doe' }
      const result = findRelationshipObject([], person, 2, 'spouse')

      expect(result).toBeNull()
    })
  })
})
