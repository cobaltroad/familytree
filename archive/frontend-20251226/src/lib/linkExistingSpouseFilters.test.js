/**
 * Unit tests for linkExistingSpouseFilters.js
 * Testing smart filtering logic for spouse candidates.
 *
 * Tests follow BDD acceptance criteria from issue #47.
 */

import { describe, it, expect } from 'vitest'
import { createSpouseFilter, isValidSpouseByAge } from './linkExistingSpouseFilters.js'

describe('linkExistingSpouseFilters', () => {
  describe('isValidSpouseByAge', () => {
    it('should return true when age difference is within 50 years (younger)', () => {
      const person1 = { id: 1, birthDate: '1970-01-01' }
      const person2 = { id: 2, birthDate: '1990-01-01' } // 20 years younger
      expect(isValidSpouseByAge(person1, person2)).toBe(true)
    })

    it('should return true when age difference is within 50 years (older)', () => {
      const person1 = { id: 1, birthDate: '1990-01-01' }
      const person2 = { id: 2, birthDate: '1970-01-01' } // 20 years older
      expect(isValidSpouseByAge(person1, person2)).toBe(true)
    })

    it('should return true when age difference is exactly 50 years', () => {
      const person1 = { id: 1, birthDate: '1950-01-01' }
      const person2 = { id: 2, birthDate: '2000-01-01' } // Exactly 50 years
      expect(isValidSpouseByAge(person1, person2)).toBe(true)
    })

    it('should return false when age difference exceeds 50 years', () => {
      const person1 = { id: 1, birthDate: '1940-01-01' }
      const person2 = { id: 2, birthDate: '2000-01-01' } // 60 years difference
      expect(isValidSpouseByAge(person1, person2)).toBe(false)
    })

    it('should return true when either person has no birth date', () => {
      const person1 = { id: 1 } // No birth date
      const person2 = { id: 2, birthDate: '1990-01-01' }
      expect(isValidSpouseByAge(person1, person2)).toBe(true)

      const person3 = { id: 3, birthDate: '1950-01-01' }
      const person4 = { id: 4 } // No birth date
      expect(isValidSpouseByAge(person3, person4)).toBe(true)
    })

    it('should return true when both people have no birth date', () => {
      const person1 = { id: 1 }
      const person2 = { id: 2 }
      expect(isValidSpouseByAge(person1, person2)).toBe(true)
    })
  })

  describe('createSpouseFilter', () => {
    const allPeople = [
      { id: 1, firstName: 'Alice', lastName: 'Smith', birthDate: '1970-01-01' },
      { id: 2, firstName: 'Bob', lastName: 'Johnson', birthDate: '1972-01-01' },
      { id: 3, firstName: 'Charlie', lastName: 'Williams', birthDate: '1995-01-01' }, // Child of Alice
      { id: 4, firstName: 'Diana', lastName: 'Brown', birthDate: '1950-01-01' }, // Mother of Alice
      { id: 5, firstName: 'Eve', lastName: 'Davis', birthDate: '1948-01-01' }, // Father of Alice
      { id: 6, firstName: 'Frank', lastName: 'Miller', birthDate: '1997-01-01' }, // Grandchild of Alice
      { id: 7, firstName: 'Grace', lastName: 'Wilson', birthDate: '1925-01-01' }, // Grandmother of Alice
      { id: 8, firstName: 'Henry', lastName: 'Moore', birthDate: '1975-01-01' }, // Existing spouse
      { id: 9, firstName: 'Irene', lastName: 'Taylor', birthDate: '1900-01-01' }, // Too old (70+ years difference)
      { id: 10, firstName: 'Jack', lastName: 'Anderson', birthDate: '1974-01-01' } // Valid candidate
    ]

    const allRelationships = [
      // Alice's parent relationships
      { id: 101, person1Id: 4, person2Id: 1, type: 'parentOf', parentRole: 'mother' },
      { id: 102, person1Id: 5, person2Id: 1, type: 'parentOf', parentRole: 'father' },
      // Alice's child relationship
      { id: 103, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'mother' },
      // Alice's grandchild relationship
      { id: 104, person1Id: 3, person2Id: 6, type: 'parentOf', parentRole: 'father' },
      // Alice's grandparent relationship
      { id: 105, person1Id: 7, person2Id: 4, type: 'parentOf', parentRole: 'mother' },
      // Alice's spouse relationship
      { id: 106, person1Id: 1, person2Id: 8, type: 'spouse' },
      { id: 107, person1Id: 8, person2Id: 1, type: 'spouse' } // Bidirectional
    ]

    const alice = allPeople[0]
    const aliceRelationships = allRelationships.filter(
      rel => rel.person1Id === alice.id || rel.person2Id === alice.id
    )

    describe('Exclusion Rules', () => {
      it('should exclude the person themselves', () => {
        const filter = createSpouseFilter(alice, aliceRelationships, allPeople, allRelationships)
        expect(filter(alice)).toBe(false)
      })

      it('should exclude existing spouses', () => {
        const filter = createSpouseFilter(alice, aliceRelationships, allPeople, allRelationships)
        const henry = allPeople.find(p => p.id === 8) // Existing spouse
        expect(filter(henry)).toBe(false)
      })

      it('should exclude descendants (children)', () => {
        const filter = createSpouseFilter(alice, aliceRelationships, allPeople, allRelationships)
        const charlie = allPeople.find(p => p.id === 3) // Child
        expect(filter(charlie)).toBe(false)
      })

      it('should exclude descendants (grandchildren)', () => {
        const filter = createSpouseFilter(alice, aliceRelationships, allPeople, allRelationships)
        const frank = allPeople.find(p => p.id === 6) // Grandchild
        expect(filter(frank)).toBe(false)
      })

      it('should exclude ancestors (parents)', () => {
        const filter = createSpouseFilter(alice, aliceRelationships, allPeople, allRelationships)
        const diana = allPeople.find(p => p.id === 4) // Mother
        const eve = allPeople.find(p => p.id === 5) // Father
        expect(filter(diana)).toBe(false)
        expect(filter(eve)).toBe(false)
      })

      it('should exclude ancestors (grandparents)', () => {
        const filter = createSpouseFilter(alice, aliceRelationships, allPeople, allRelationships)
        const grace = allPeople.find(p => p.id === 7) // Grandmother
        expect(filter(grace)).toBe(false)
      })

      it('should exclude people with age difference > 50 years', () => {
        const filter = createSpouseFilter(alice, aliceRelationships, allPeople, allRelationships)
        const irene = allPeople.find(p => p.id === 9) // Born in 1900, 70 years older
        expect(filter(irene)).toBe(false)
      })
    })

    describe('Valid Candidates', () => {
      it('should allow unrelated people with reasonable age difference', () => {
        const filter = createSpouseFilter(alice, aliceRelationships, allPeople, allRelationships)
        const jack = allPeople.find(p => p.id === 10) // Valid candidate
        expect(filter(jack)).toBe(true)
      })

      it('should allow bob (unrelated person)', () => {
        const filter = createSpouseFilter(alice, aliceRelationships, allPeople, allRelationships)
        const bob = allPeople.find(p => p.id === 2)
        expect(filter(bob)).toBe(true)
      })
    })

    describe('Multiple Spouses Support', () => {
      it('should allow adding second spouse when one already exists', () => {
        // Alice already has Henry as spouse, but Jack should still be valid
        const filter = createSpouseFilter(alice, aliceRelationships, allPeople, allRelationships)
        const jack = allPeople.find(p => p.id === 10)
        expect(filter(jack)).toBe(true)
      })
    })

    describe('Edge Cases', () => {
      it('should handle person with no relationships', () => {
        const orphan = { id: 100, firstName: 'Orphan', lastName: 'Test', birthDate: '1980-01-01' }
        const filter = createSpouseFilter(orphan, [], allPeople, allRelationships)

        // Should exclude self
        expect(filter(orphan)).toBe(false)

        // Should allow Alice (no relationship to orphan)
        expect(filter(alice)).toBe(true)
      })

      it('should handle person with no birth date', () => {
        const noBirthDate = { id: 200, firstName: 'No', lastName: 'Date' }
        const filter = createSpouseFilter(noBirthDate, [], allPeople, allRelationships)

        // Should allow anyone (age validation skipped)
        expect(filter(alice)).toBe(true)
        expect(filter(allPeople.find(p => p.id === 9))).toBe(true) // Even very old person
      })
    })
  })
})
