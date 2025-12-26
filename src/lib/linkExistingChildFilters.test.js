/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import {
  createChildFilter,
  isValidChildByAge
} from './linkExistingChildFilters.js'

describe('linkExistingChildFilters', () => {
  describe('isValidChildByAge', () => {
    it('should return true if parent is at least 13 years older than child', () => {
      const parent = { id: 1, birthDate: '1970-01-01' }
      const child = { id: 2, birthDate: '1985-01-01' }

      expect(isValidChildByAge(parent, child)).toBe(true)
    })

    it('should return false if parent is less than 13 years older than child', () => {
      const parent = { id: 1, birthDate: '1970-01-01' }
      const child = { id: 2, birthDate: '1980-01-01' }

      expect(isValidChildByAge(parent, child)).toBe(false)
    })

    it('should return false if child is older than parent', () => {
      const parent = { id: 1, birthDate: '1985-01-01' }
      const child = { id: 2, birthDate: '1970-01-01' }

      expect(isValidChildByAge(parent, child)).toBe(false)
    })

    it('should return true if parent has no birth date', () => {
      const parent = { id: 1, birthDate: null }
      const child = { id: 2, birthDate: '1985-01-01' }

      expect(isValidChildByAge(parent, child)).toBe(true)
    })

    it('should return true if child has no birth date', () => {
      const parent = { id: 1, birthDate: '1970-01-01' }
      const child = { id: 2, birthDate: null }

      expect(isValidChildByAge(parent, child)).toBe(true)
    })

    it('should return true if both have no birth dates', () => {
      const parent = { id: 1, birthDate: null }
      const child = { id: 2, birthDate: null }

      expect(isValidChildByAge(parent, child)).toBe(true)
    })

    it('should return true for exactly 13 year age difference', () => {
      const parent = { id: 1, birthDate: '1970-01-01' }
      const child = { id: 2, birthDate: '1983-01-01' }

      expect(isValidChildByAge(parent, child)).toBe(true)
    })
  })

  describe('createChildFilter', () => {
    const allPeople = [
      { id: 1, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-01' },
      { id: 2, firstName: 'Jane', lastName: 'Smith', birthDate: '1955-01-01' },
      { id: 3, firstName: 'Bob', lastName: 'Smith', birthDate: '1980-01-01' }, // Parent
      { id: 4, firstName: 'Alice', lastName: 'Smith', birthDate: '2005-01-01' }, // Existing child
      { id: 5, firstName: 'Charlie', lastName: 'Smith', birthDate: '2010-01-01' }, // Grandchild
      { id: 6, firstName: 'Eve', lastName: 'Smith', birthDate: '2015-01-01' }, // Valid candidate
      { id: 7, firstName: 'Frank', lastName: 'Smith', birthDate: '1978-01-01' }, // Too old (only 2 years younger)
    ]

    const allRelationships = [
      // John (1) -> Bob (3) - parentOf
      { id: 101, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'father' },
      // Jane (2) -> Bob (3) - parentOf
      { id: 102, person1Id: 2, person2Id: 3, type: 'parentOf', parentRole: 'mother' },
      // Bob (3) -> Alice (4) - parentOf
      { id: 103, person1Id: 3, person2Id: 4, type: 'parentOf', parentRole: 'father' },
      // Alice (4) -> Charlie (5) - parentOf
      { id: 104, person1Id: 4, person2Id: 5, type: 'parentOf', parentRole: 'mother' },
    ]

    it('should exclude the parent themselves', () => {
      const parent = allPeople[2] // Bob
      const parentRelationships = allRelationships.filter(
        rel => rel.person1Id === parent.id || rel.person2Id === parent.id
      )

      const filter = createChildFilter(parent, parentRelationships, allPeople, allRelationships)

      expect(filter(parent)).toBe(false)
    })

    it('should exclude existing children', () => {
      const parent = allPeople[2] // Bob
      const existingChild = allPeople[3] // Alice (already Bob's child)
      const parentRelationships = allRelationships.filter(
        rel => rel.person1Id === parent.id || rel.person2Id === parent.id
      )

      const filter = createChildFilter(parent, parentRelationships, allPeople, allRelationships)

      expect(filter(existingChild)).toBe(false)
    })

    it('should exclude ancestors of the parent', () => {
      const parent = allPeople[2] // Bob
      const ancestor = allPeople[0] // John (Bob's father, grandparent)
      const parentRelationships = allRelationships.filter(
        rel => rel.person1Id === parent.id || rel.person2Id === parent.id
      )

      const filter = createChildFilter(parent, parentRelationships, allPeople, allRelationships)

      expect(filter(ancestor)).toBe(false)
    })

    it('should exclude people who are chronologically too old to be children', () => {
      const parent = allPeople[2] // Bob (born 1980)
      const tooOldCandidate = allPeople[6] // Frank (born 1978, only 2 years younger)
      const parentRelationships = allRelationships.filter(
        rel => rel.person1Id === parent.id || rel.person2Id === parent.id
      )

      const filter = createChildFilter(parent, parentRelationships, allPeople, allRelationships)

      expect(filter(tooOldCandidate)).toBe(false)
    })

    it('should include valid child candidates', () => {
      const parent = allPeople[2] // Bob (born 1980)
      const validCandidate = allPeople[5] // Eve (born 2015, 35 years younger)
      const parentRelationships = allRelationships.filter(
        rel => rel.person1Id === parent.id || rel.person2Id === parent.id
      )

      const filter = createChildFilter(parent, parentRelationships, allPeople, allRelationships)

      expect(filter(validCandidate)).toBe(true)
    })

    it('should include people without birth dates (cannot validate chronologically)', () => {
      const parent = allPeople[2] // Bob
      const candidateNoBirthDate = { id: 8, firstName: 'Grace', lastName: 'Smith', birthDate: null }
      const parentRelationships = allRelationships.filter(
        rel => rel.person1Id === parent.id || rel.person2Id === parent.id
      )

      const filter = createChildFilter(parent, parentRelationships, allPeople, allRelationships)

      expect(filter(candidateNoBirthDate)).toBe(true)
    })

    it('should exclude grandchildren (descendants of existing children)', () => {
      const parent = allPeople[2] // Bob
      const grandchild = allPeople[4] // Charlie (Alice's child, Bob's grandchild)
      const parentRelationships = allRelationships.filter(
        rel => rel.person1Id === parent.id || rel.person2Id === parent.id
      )

      const filter = createChildFilter(parent, parentRelationships, allPeople, allRelationships)

      // Note: Charlie is NOT already Bob's direct child, but is Bob's grandchild
      // We should exclude descendants to prevent weird loops
      expect(filter(grandchild)).toBe(false)
    })

    it('should handle parent with no relationships', () => {
      const parent = { id: 99, firstName: 'NewPerson', lastName: 'Test', birthDate: '1990-01-01' }
      const candidate = allPeople[5] // Eve (born 2015)
      const parentRelationships = []

      const filter = createChildFilter(parent, parentRelationships, allPeople, allRelationships)

      expect(filter(candidate)).toBe(true)
    })

    it('should handle mother role', () => {
      const mother = allPeople[1] // Jane (born 1955)
      const validCandidate = allPeople[5] // Eve (born 2015, 60 years younger)
      const motherRelationships = allRelationships.filter(
        rel => rel.person1Id === mother.id || rel.person2Id === mother.id
      )

      const filter = createChildFilter(mother, motherRelationships, allPeople, allRelationships)

      expect(filter(validCandidate)).toBe(true)
    })

    it('should handle father role', () => {
      const father = allPeople[0] // John (born 1950)
      const validCandidate = allPeople[5] // Eve (born 2015, 65 years younger)
      const fatherRelationships = allRelationships.filter(
        rel => rel.person1Id === father.id || rel.person2Id === father.id
      )

      const filter = createChildFilter(father, fatherRelationships, allPeople, allRelationships)

      expect(filter(validCandidate)).toBe(true)
    })
  })
})
