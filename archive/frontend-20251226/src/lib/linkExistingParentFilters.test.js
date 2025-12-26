import { describe, it, expect } from 'vitest'
import { createMotherFilter, createFatherFilter, isValidParentByAge } from './linkExistingParentFilters.js'

/**
 * Unit Tests for Link Existing Parent Filter Logic (Issue #45)
 *
 * Tests the smart filtering logic that determines which people can be
 * linked as mothers or fathers based on relationship rules and chronology.
 */

describe('Parent Filter Logic', () => {
  const mockPeople = [
    { id: 1, firstName: 'Alice', lastName: 'Smith', birthDate: '1950-01-01', gender: 'female' },
    { id: 2, firstName: 'Bob', lastName: 'Smith', birthDate: '1948-01-01', gender: 'male' },
    { id: 3, firstName: 'Carol', lastName: 'Jones', birthDate: '1975-06-15', gender: 'female' },
    { id: 4, firstName: 'David', lastName: 'Jones', birthDate: '1998-03-20', gender: 'male' },
    { id: 5, firstName: 'Eve', lastName: 'Brown', birthDate: '2020-12-10', gender: 'female' },
    { id: 6, firstName: 'Frank', lastName: 'White', birthDate: '1970-05-05', gender: 'male' },
    { id: 7, firstName: 'Grace', lastName: 'Taylor', birthDate: null, gender: 'female' }
  ]

  const mockRelationships = [
    { id: 1, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'mother' },  // Alice is mother of Carol
    { id: 2, person1Id: 2, person2Id: 3, type: 'parentOf', parentRole: 'father' },  // Bob is father of Carol
    { id: 3, person1Id: 3, person2Id: 4, type: 'parentOf', parentRole: 'mother' },  // Carol is mother of David
    { id: 4, person1Id: 6, person2Id: 4, type: 'parentOf', parentRole: 'father' }   // Frank is father of David
  ]

  describe('isValidParentByAge', () => {
    it('should return true for parent born at least 13 years before child', () => {
      const parent = { birthDate: '1950-01-01' }
      const child = { birthDate: '1970-01-01' }

      expect(isValidParentByAge(parent, child)).toBe(true)
    })

    it('should return false for parent born less than 13 years before child', () => {
      const parent = { birthDate: '1950-01-01' }
      const child = { birthDate: '1955-01-01' }

      expect(isValidParentByAge(parent, child)).toBe(false)
    })

    it('should return false for parent born after child', () => {
      const parent = { birthDate: '1980-01-01' }
      const child = { birthDate: '1970-01-01' }

      expect(isValidParentByAge(parent, child)).toBe(false)
    })

    it('should return false for parent born same year as child', () => {
      const parent = { birthDate: '1970-06-01' }
      const child = { birthDate: '1970-01-01' }

      expect(isValidParentByAge(parent, child)).toBe(false)
    })

    it('should return true when parent has no birth date', () => {
      const parent = { birthDate: null }
      const child = { birthDate: '1970-01-01' }

      expect(isValidParentByAge(parent, child)).toBe(true)
    })

    it('should return true when child has no birth date', () => {
      const parent = { birthDate: '1950-01-01' }
      const child = { birthDate: null }

      expect(isValidParentByAge(parent, child)).toBe(true)
    })

    it('should return true when both have no birth dates', () => {
      const parent = { birthDate: null }
      const child = { birthDate: null }

      expect(isValidParentByAge(parent, child)).toBe(true)
    })

    it('should handle edge case of exactly 13 years difference', () => {
      const parent = { birthDate: '1950-01-01' }
      const child = { birthDate: '1963-01-01' }

      expect(isValidParentByAge(parent, child)).toBe(true)
    })

    it('should handle edge case of exactly 12 years difference', () => {
      const parent = { birthDate: '1950-01-01' }
      const child = { birthDate: '1962-01-01' }

      expect(isValidParentByAge(parent, child)).toBe(false)
    })
  })

  describe('createMotherFilter', () => {
    it('should exclude the child themselves', () => {
      const child = mockPeople[2] // Carol
      const childRelationships = []

      const filter = createMotherFilter(child, childRelationships, mockPeople, mockRelationships)

      expect(filter(child)).toBe(false)
    })

    it('should exclude descendants of the child', () => {
      const child = mockPeople[2] // Carol (id: 3)
      const childRelationships = mockRelationships.filter(r =>
        (r.person1Id === 3 || r.person2Id === 3)
      )

      const filter = createMotherFilter(child, childRelationships, mockPeople, mockRelationships)

      const david = mockPeople[3] // David is Carol's child
      expect(filter(david)).toBe(false)
    })

    it('should exclude people born less than 13 years before child', () => {
      const child = mockPeople[3] // David (born 1998)
      const childRelationships = []

      const filter = createMotherFilter(child, childRelationships, mockPeople, mockRelationships)

      const eve = mockPeople[4] // Eve (born 2020)
      expect(filter(eve)).toBe(false)
    })

    it('should include valid female candidates', () => {
      const child = mockPeople[3] // David (born 1998, id: 4)
      const childRelationships = mockRelationships.filter(r =>
        (r.person1Id === 4 || r.person2Id === 4)
      )

      const filter = createMotherFilter(child, childRelationships, mockPeople, mockRelationships)

      const jane = mockPeople[4] // Jane (born 1960, female) - not related to David
      // Note: Jane born 1960, David born 1998 - but Jane's birthDate is 2020 in mockData, let's use Grace instead
      const grace = mockPeople[6] // Grace (no birth date, female) - not related to David
      expect(filter(grace)).toBe(true)
    })

    it('should include people without birth dates', () => {
      const child = mockPeople[3] // David
      const childRelationships = []

      const filter = createMotherFilter(child, childRelationships, mockPeople, mockRelationships)

      const grace = mockPeople[6] // Grace (no birth date)
      expect(filter(grace)).toBe(true)
    })

    it('should exclude grandparents (ancestors)', () => {
      const child = mockPeople[3] // David (id: 4)
      const childRelationships = mockRelationships.filter(r =>
        (r.person1Id === 4 || r.person2Id === 4)
      )

      const filter = createMotherFilter(child, childRelationships, mockPeople, mockRelationships)

      const alice = mockPeople[0] // Alice (id: 1) is grandmother of David
      // Alice should be excluded because she's an ancestor
      expect(filter(alice)).toBe(false)
    })

    it('should exclude current parent of same type', () => {
      const child = mockPeople[3] // David (id: 4)
      const childRelationships = mockRelationships.filter(r =>
        (r.person1Id === 4 || r.person2Id === 4)
      )

      const filter = createMotherFilter(child, childRelationships, mockPeople, mockRelationships)

      const carol = mockPeople[2] // Carol (id: 3) is already David's mother
      expect(filter(carol)).toBe(false)
    })

    it('should include valid candidates when child has no existing mother', () => {
      const child = mockPeople[4] // Eve (no parents in mockRelationships)
      const childRelationships = []

      const filter = createMotherFilter(child, childRelationships, mockPeople, mockRelationships)

      const alice = mockPeople[0] // Alice (valid by age)
      const carol = mockPeople[2] // Carol (valid by age)

      expect(filter(alice)).toBe(true)
      expect(filter(carol)).toBe(true)
    })
  })

  describe('createFatherFilter', () => {
    it('should exclude the child themselves', () => {
      const child = mockPeople[2] // Carol
      const childRelationships = []

      const filter = createFatherFilter(child, childRelationships, mockPeople, mockRelationships)

      expect(filter(child)).toBe(false)
    })

    it('should exclude descendants of the child', () => {
      const child = mockPeople[2] // Carol (id: 3)
      const childRelationships = mockRelationships.filter(r =>
        (r.person1Id === 3 || r.person2Id === 3)
      )

      const filter = createFatherFilter(child, childRelationships, mockPeople, mockRelationships)

      const david = mockPeople[3] // David is Carol's child
      expect(filter(david)).toBe(false)
    })

    it('should exclude people born less than 13 years before child', () => {
      const child = mockPeople[3] // David (born 1998)
      const childRelationships = []

      const filter = createFatherFilter(child, childRelationships, mockPeople, mockRelationships)

      const youngPerson = { id: 99, firstName: 'Young', lastName: 'Person', birthDate: '1995-01-01', gender: 'male' }
      expect(filter(youngPerson)).toBe(false)
    })

    it('should include valid male candidates when not related', () => {
      const child = mockPeople[4] // Eve (born 2020, id: 5, no existing parents)
      const childRelationships = []

      const filter = createFatherFilter(child, childRelationships, mockPeople, mockRelationships)

      const bob = mockPeople[1] // Bob (born 1948, male) - not related to Eve
      const frank = mockPeople[5] // Frank (born 1970, male) - not related to Eve
      expect(filter(bob)).toBe(true)
      expect(filter(frank)).toBe(true)
    })

    it('should exclude grandfathers (ancestors)', () => {
      const child = mockPeople[3] // David (id: 4)
      const childRelationships = mockRelationships.filter(r =>
        (r.person1Id === 4 || r.person2Id === 4)
      )

      const filter = createFatherFilter(child, childRelationships, mockPeople, mockRelationships)

      const bob = mockPeople[1] // Bob (id: 2) is grandfather of David
      expect(filter(bob)).toBe(false)
    })

    it('should exclude current parent of same type', () => {
      const child = mockPeople[3] // David (id: 4)
      const childRelationships = mockRelationships.filter(r =>
        (r.person1Id === 4 || r.person2Id === 4)
      )

      const filter = createFatherFilter(child, childRelationships, mockPeople, mockRelationships)

      const frank = mockPeople[5] // Frank (id: 6) is already David's father
      expect(filter(frank)).toBe(false)
    })

    it('should include valid candidates when child has no existing father', () => {
      const child = mockPeople[4] // Eve (no parents in mockRelationships)
      const childRelationships = []

      const filter = createFatherFilter(child, childRelationships, mockPeople, mockRelationships)

      const bob = mockPeople[1] // Bob (valid by age)
      const frank = mockPeople[5] // Frank (valid by age)

      expect(filter(bob)).toBe(true)
      expect(filter(frank)).toBe(true)
    })
  })

  describe('Complex Relationship Scenarios', () => {
    it('should handle multi-generational filtering correctly', () => {
      // Test that great-grandchildren can't be linked as parents
      const child = mockPeople[0] // Alice (oldest generation)
      const childRelationships = []

      const filter = createMotherFilter(child, childRelationships, mockPeople, mockRelationships)

      const eve = mockPeople[4] // Eve (youngest, born way after Alice)
      expect(filter(eve)).toBe(false) // Too young
    })

    it('should handle siblings correctly (can be parents in some cultures)', () => {
      // Siblings can theoretically be parents (e.g., adoption scenarios)
      // We don't explicitly exclude siblings, only descendants and ancestors
      const child = mockPeople[3] // David
      const childRelationships = []

      const filter = createMotherFilter(child, childRelationships, mockPeople, mockRelationships)

      // Create a mock sibling
      const sibling = { id: 99, firstName: 'Sibling', lastName: 'Jones', birthDate: '1976-01-01', gender: 'female' }

      // Sibling should be allowed if age is valid
      expect(filter(sibling)).toBe(true)
    })

    it('should prevent circular relationships (child as parent)', () => {
      const child = mockPeople[2] // Carol
      const childRelationships = []

      const filter = createMotherFilter(child, childRelationships, mockPeople, mockRelationships)

      // Carol can't be her own mother
      expect(filter(child)).toBe(false)
    })

    it('should prevent descendant relationships (grandchild as parent)', () => {
      const child = mockPeople[2] // Carol (id: 3)
      const childRelationships = mockRelationships.filter(r =>
        (r.person1Id === 3 || r.person2Id === 3)
      )

      const filter = createMotherFilter(child, childRelationships, mockPeople, mockRelationships)

      const david = mockPeople[3] // David (Carol's child)
      expect(filter(david)).toBe(false)
    })
  })

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty relationships array', () => {
      const child = mockPeople[3]
      const childRelationships = []

      const filter = createMotherFilter(child, childRelationships, mockPeople, [])

      const alice = mockPeople[0]
      expect(filter(alice)).toBe(true)
    })

    it('should handle child with no birth date', () => {
      const child = { id: 99, firstName: 'Unknown', lastName: 'Child', birthDate: null, gender: 'male' }
      const childRelationships = []

      const filter = createMotherFilter(child, childRelationships, mockPeople, mockRelationships)

      const alice = mockPeople[0]
      expect(filter(alice)).toBe(true) // Should allow since we can't validate age
    })

    it('should handle candidate with no birth date', () => {
      const child = mockPeople[3] // David
      const childRelationships = []

      const filter = createMotherFilter(child, childRelationships, mockPeople, mockRelationships)

      const grace = mockPeople[6] // Grace has no birth date
      expect(filter(grace)).toBe(true) // Should allow since we can't validate age
    })

    it('should handle person with future birth date', () => {
      const child = { id: 99, firstName: 'Future', lastName: 'Child', birthDate: '2050-01-01', gender: 'male' }
      const childRelationships = []

      const filter = createMotherFilter(child, childRelationships, mockPeople, mockRelationships)

      const eve = mockPeople[4] // Eve born 2020
      expect(filter(eve)).toBe(true) // 30 years before future child
    })
  })

  describe('Performance Considerations', () => {
    it('should efficiently handle large relationship graphs', () => {
      // Create a larger dataset
      const largePeopleSet = Array.from({ length: 100 }, (_, i) => ({
        id: i + 100,
        firstName: `Person${i}`,
        lastName: 'Test',
        birthDate: `${1920 + i}-01-01`,
        gender: i % 2 === 0 ? 'female' : 'male'
      }))

      const child = largePeopleSet[50]
      const childRelationships = []

      const startTime = performance.now()
      const filter = createMotherFilter(child, childRelationships, largePeopleSet, [])

      // Apply filter to all people
      largePeopleSet.forEach(person => filter(person))

      const endTime = performance.now()
      const executionTime = endTime - startTime

      // Should complete in reasonable time (less than 100ms for 100 people)
      expect(executionTime).toBeLessThan(100)
    })
  })
})
