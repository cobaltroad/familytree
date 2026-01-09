/**
 * Duplicate Detection Module - Unit Tests
 * Story #93: GEDCOM File Parsing and Validation
 * Story #108: Duplicate Detection Service (Foundation)
 *
 * RED phase: Writing failing tests for duplicate detection algorithm
 */

import { describe, it, expect } from 'vitest'
import {
  calculateMatchConfidence,
  findDuplicates,
  compareNames,
  compareDates,
  compareParents,
  findAllDuplicates,
  findDuplicatesForPerson
} from './duplicateDetection.js'

describe('duplicateDetection - compareNames', () => {
  it('should return 100% confidence for exact name match', () => {
    const score = compareNames('John Smith', 'John Smith')

    expect(score).toBe(100)
  })

  it('should return high confidence for minor spelling variations', () => {
    const score = compareNames('John Smith', 'Jon Smith')

    expect(score).toBeGreaterThan(85)
    expect(score).toBeLessThan(100)
  })

  it('should return medium confidence for middle name differences', () => {
    const score = compareNames('John A. Smith', 'John Smith')

    expect(score).toBeGreaterThan(70)
    expect(score).toBeLessThan(95)
  })

  it('should return low confidence for different names', () => {
    const score = compareNames('John Smith', 'Jane Doe')

    expect(score).toBeLessThan(30)
  })

  it('should be case insensitive', () => {
    const score = compareNames('JOHN SMITH', 'john smith')

    expect(score).toBe(100)
  })

  it('should handle null or undefined names', () => {
    const score = compareNames(null, 'John Smith')

    expect(score).toBe(0)
  })
})

describe('duplicateDetection - compareDates', () => {
  it('should return 100% confidence for exact date match', () => {
    const score = compareDates('1950-01-15', '1950-01-15')

    expect(score).toBe(100)
  })

  it('should return 50% confidence for year-only match', () => {
    const score = compareDates('1950-01-15', '1950-06-20')

    expect(score).toBe(50)
  })

  it('should return 0% confidence for different years', () => {
    const score = compareDates('1950-01-15', '1951-01-15')

    expect(score).toBe(0)
  })

  it('should handle partial dates (year only)', () => {
    const score = compareDates('1950', '1950-01-15')

    expect(score).toBe(100) // Year matches
  })

  it('should handle partial dates (year-month)', () => {
    const score = compareDates('1950-01', '1950-01-15')

    expect(score).toBe(100) // Year and month match
  })

  it('should return 0 for null or missing dates', () => {
    const score = compareDates(null, '1950-01-15')

    expect(score).toBe(0)
  })
})

describe('duplicateDetection - compareParents', () => {
  it('should return 100% confidence when parent families match', () => {
    const person1Parents = ['@F1@']
    const person2Parents = ['@F1@']

    const score = compareParents(person1Parents, person2Parents)

    expect(score).toBe(100)
  })

  it('should return 100% confidence when one parent family matches', () => {
    const person1Parents = ['@F1@', '@F2@']
    const person2Parents = ['@F1@']

    const score = compareParents(person1Parents, person2Parents)

    expect(score).toBe(100)
  })

  it('should return 0% confidence when no parents match', () => {
    const person1Parents = ['@F1@']
    const person2Parents = ['@F2@']

    const score = compareParents(person1Parents, person2Parents)

    expect(score).toBe(0)
  })

  it('should return 0 for missing parent data', () => {
    const score = compareParents([], [])

    expect(score).toBe(0)
  })
})

describe('duplicateDetection - calculateMatchConfidence', () => {
  it('should calculate high confidence for exact match', () => {
    const gedcomPerson = {
      name: 'John Smith',
      birthDate: '1950-01-15',
      childOfFamily: '@F1@'
    }

    const existingPerson = {
      firstName: 'John',
      lastName: 'Smith',
      birthDate: '1950-01-15',
      parentFamilies: ['@F1@']
    }

    const result = calculateMatchConfidence(gedcomPerson, existingPerson)

    expect(result.confidence).toBeGreaterThan(90)
    expect(result.matchingFields).toContain('name')
    expect(result.matchingFields).toContain('birthDate')
    expect(result.matchingFields).toContain('parents')
  })

  it('should calculate medium confidence for name and date match', () => {
    const gedcomPerson = {
      name: 'John Smith',
      birthDate: '1950-01-15'
    }

    const existingPerson = {
      firstName: 'John',
      lastName: 'Smith',
      birthDate: '1950-01-15'
    }

    const result = calculateMatchConfidence(gedcomPerson, existingPerson)

    expect(result.confidence).toBeGreaterThan(70)
    expect(result.confidence).toBeLessThan(90)
    expect(result.matchingFields).toContain('name')
    expect(result.matchingFields).toContain('birthDate')
  })

  it('should calculate low confidence for name-only match', () => {
    const gedcomPerson = {
      name: 'John Smith',
      birthDate: '1950-01-15'
    }

    const existingPerson = {
      firstName: 'John',
      lastName: 'Smith',
      birthDate: '1960-05-20'
    }

    const result = calculateMatchConfidence(gedcomPerson, existingPerson)

    expect(result.confidence).toBeLessThan(70)
  })

  it('should weight name match as 50% of total score', () => {
    const gedcomPerson = {
      name: 'John Smith'
    }

    const existingPerson = {
      firstName: 'John',
      lastName: 'Smith'
    }

    const result = calculateMatchConfidence(gedcomPerson, existingPerson)

    expect(result.confidence).toBe(50) // 100% name match * 50% weight
  })

  it('should weight date match as 30% of total score', () => {
    const gedcomPerson = {
      birthDate: '1950-01-15'
    }

    const existingPerson = {
      birthDate: '1950-01-15'
    }

    const result = calculateMatchConfidence(gedcomPerson, existingPerson)

    expect(result.confidence).toBe(30) // 100% date match * 30% weight
  })

  it('should weight parent match as 20% of total score', () => {
    const gedcomPerson = {
      childOfFamily: '@F1@'
    }

    const existingPerson = {
      parentFamilies: ['@F1@']
    }

    const result = calculateMatchConfidence(gedcomPerson, existingPerson)

    expect(result.confidence).toBe(20) // 100% parent match * 20% weight
  })
})

describe('duplicateDetection - findDuplicates', () => {
  it('should find duplicates above 70% confidence threshold', () => {
    const gedcomPeople = [
      { id: '@I1@', name: 'John Smith', birthDate: '1950-01-15' },
      { id: '@I2@', name: 'Jane Doe', birthDate: '1952-03-20' }
    ]

    const existingPeople = [
      { id: 1, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' },
      { id: 2, firstName: 'Bob', lastName: 'Jones', birthDate: '1960-01-01' }
    ]

    const duplicates = findDuplicates(gedcomPeople, existingPeople)

    expect(duplicates).toHaveLength(1)
    expect(duplicates[0].gedcomPerson.id).toBe('@I1@')
    expect(duplicates[0].existingPerson.id).toBe(1)
    expect(duplicates[0].confidence).toBeGreaterThan(70)
  })

  it('should not report matches below 70% confidence threshold', () => {
    const gedcomPeople = [
      { id: '@I1@', name: 'John Smith', birthDate: '1950-01-15' }
    ]

    const existingPeople = [
      { id: 1, firstName: 'Jane', lastName: 'Doe', birthDate: '1960-01-01' }
    ]

    const duplicates = findDuplicates(gedcomPeople, existingPeople)

    expect(duplicates).toHaveLength(0)
  })

  it('should return empty array when no existing people', () => {
    const gedcomPeople = [
      { id: '@I1@', name: 'John Smith', birthDate: '1950-01-15' }
    ]

    const duplicates = findDuplicates(gedcomPeople, [])

    expect(duplicates).toHaveLength(0)
  })

  it('should handle multiple duplicates for same person', () => {
    const gedcomPeople = [
      { id: '@I1@', name: 'John Smith', birthDate: '1950-01-15' }
    ]

    const existingPeople = [
      { id: 1, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' },
      { id: 2, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' }
    ]

    const duplicates = findDuplicates(gedcomPeople, existingPeople)

    expect(duplicates.length).toBeGreaterThanOrEqual(2)
  })

  it('should sort duplicates by confidence (highest first)', () => {
    const gedcomPeople = [
      { id: '@I1@', name: 'John Smith', birthDate: '1950-01-15' }
    ]

    const existingPeople = [
      { id: 1, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' }, // 80% match
      { id: 2, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15', parentFamilies: ['@F1@'] } // 100% match
    ]

    const gedcomWithFamily = [
      { id: '@I1@', name: 'John Smith', birthDate: '1950-01-15', childOfFamily: '@F1@' }
    ]

    const duplicates = findDuplicates(gedcomWithFamily, existingPeople)

    expect(duplicates[0].confidence).toBeGreaterThan(duplicates[1]?.confidence || 0)
  })
})

describe('duplicateDetection - findAllDuplicates (Story #108)', () => {
  it('should detect duplicates across entire people array', () => {
    const people = [
      { id: 1, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' },
      { id: 2, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' },
      { id: 3, firstName: 'Jane', lastName: 'Doe', birthDate: '1960-05-20' }
    ]

    const duplicates = findAllDuplicates(people)

    expect(duplicates).toHaveLength(1)
    expect(duplicates[0].person1.id).toBe(1)
    expect(duplicates[0].person2.id).toBe(2)
    expect(duplicates[0].confidence).toBeGreaterThan(70)
  })

  it('should return multiple duplicate pairs when they exist', () => {
    const people = [
      { id: 1, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' },
      { id: 2, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' },
      { id: 3, firstName: 'Jane', lastName: 'Doe', birthDate: '1960-05-20' },
      { id: 4, firstName: 'Jane', lastName: 'Doe', birthDate: '1960-05-20' },
      { id: 5, firstName: 'Bob', lastName: 'Jones', birthDate: '1945-01-01' },
      { id: 6, firstName: 'Bob', lastName: 'Jones', birthDate: '1945-01-01' }
    ]

    const duplicates = findAllDuplicates(people)

    expect(duplicates).toHaveLength(3) // 3 pairs: (1,2), (3,4), (5,6)
  })

  it('should sort results by confidence (highest first)', () => {
    const people = [
      { id: 1, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' },
      { id: 2, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' }, // 80% match with person 1
      { id: 3, firstName: 'Jon', lastName: 'Smith', birthDate: '1950-01-15' } // 75% match with both
    ]

    const duplicates = findAllDuplicates(people)

    // Should have 3 pairs: (1,2)=80%, (1,3)=75%, (2,3)=75%
    expect(duplicates.length).toBeGreaterThanOrEqual(2)
    expect(duplicates[0].confidence).toBeGreaterThanOrEqual(duplicates[1].confidence)
  })

  it('should respect custom confidence threshold', () => {
    const people = [
      { id: 1, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' },
      { id: 2, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' }, // 80% match (exact name + date)
      { id: 3, firstName: 'Jon', lastName: 'Smith', birthDate: '1950-01-15' } // 75% match (close name + date)
    ]

    const duplicatesDefault = findAllDuplicates(people) // 70% threshold
    expect(duplicatesDefault).toHaveLength(3) // All 3 pairs above 70%: (1,2), (1,3), (2,3)

    const duplicatesHigh = findAllDuplicates(people, 80) // 80% threshold
    expect(duplicatesHigh).toHaveLength(1) // Only (1,2) pair at 80%
  })

  it('should return empty array when no duplicates exist', () => {
    const people = [
      { id: 1, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' },
      { id: 2, firstName: 'Jane', lastName: 'Doe', birthDate: '1960-05-20' },
      { id: 3, firstName: 'Bob', lastName: 'Jones', birthDate: '1945-01-01' }
    ]

    const duplicates = findAllDuplicates(people)

    expect(duplicates).toEqual([])
  })

  it('should return empty array when people array is empty', () => {
    const duplicates = findAllDuplicates([])

    expect(duplicates).toEqual([])
  })

  it('should return empty array when people array has only one person', () => {
    const people = [
      { id: 1, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' }
    ]

    const duplicates = findAllDuplicates(people)

    expect(duplicates).toEqual([])
  })

  it('should include matching fields in result', () => {
    const people = [
      { id: 1, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' },
      { id: 2, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' }
    ]

    const duplicates = findAllDuplicates(people)

    expect(duplicates[0].matchingFields).toContain('name')
    expect(duplicates[0].matchingFields).toContain('birthDate')
  })

  it('should not report same pair twice (person1=A,person2=B and person1=B,person2=A)', () => {
    const people = [
      { id: 1, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' },
      { id: 2, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' }
    ]

    const duplicates = findAllDuplicates(people)

    // Should only have one entry for this pair
    expect(duplicates).toHaveLength(1)
    expect(duplicates[0].person1.id).toBeLessThan(duplicates[0].person2.id)
  })
})

describe('duplicateDetection - findDuplicatesForPerson (Story #108)', () => {
  it('should find duplicates for specific person', () => {
    const targetPerson = { id: 1, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' }
    const allPeople = [
      targetPerson,
      { id: 2, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' },
      { id: 3, firstName: 'Jane', lastName: 'Doe', birthDate: '1960-05-20' }
    ]

    const duplicates = findDuplicatesForPerson(targetPerson, allPeople)

    expect(duplicates).toHaveLength(1)
    expect(duplicates[0].person.id).toBe(2)
    expect(duplicates[0].confidence).toBeGreaterThan(70)
  })

  it('should exclude the target person from results', () => {
    const targetPerson = { id: 1, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' }
    const allPeople = [
      targetPerson,
      { id: 2, firstName: 'Jane', lastName: 'Doe', birthDate: '1960-05-20' }
    ]

    const duplicates = findDuplicatesForPerson(targetPerson, allPeople)

    // Should not include person with id=1 in results
    expect(duplicates.every(d => d.person.id !== 1)).toBe(true)
  })

  it('should return empty array when no duplicates exist', () => {
    const targetPerson = { id: 1, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' }
    const allPeople = [
      targetPerson,
      { id: 2, firstName: 'Jane', lastName: 'Doe', birthDate: '1960-05-20' }
    ]

    const duplicates = findDuplicatesForPerson(targetPerson, allPeople)

    expect(duplicates).toEqual([])
  })

  it('should respect custom confidence threshold', () => {
    const targetPerson = { id: 1, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' }
    const allPeople = [
      targetPerson,
      { id: 2, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' }, // 80% match (exact)
      { id: 3, firstName: 'Jon', lastName: 'Smith', birthDate: '1950-01-15' } // 75% match (close name)
    ]

    const duplicatesDefault = findDuplicatesForPerson(targetPerson, allPeople) // 70% threshold
    expect(duplicatesDefault).toHaveLength(2)

    const duplicatesHigh = findDuplicatesForPerson(targetPerson, allPeople, 80) // 80% threshold
    expect(duplicatesHigh).toHaveLength(1)
  })

  it('should sort results by confidence (highest first)', () => {
    const targetPerson = { id: 1, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' }
    const allPeople = [
      targetPerson,
      { id: 2, firstName: 'John', lastName: 'Smith', birthDate: '1950' }, // Lower match (~80%)
      { id: 3, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' } // Higher match (80%)
    ]

    const duplicates = findDuplicatesForPerson(targetPerson, allPeople)

    expect(duplicates.length).toBeGreaterThan(0)
    expect(duplicates[0].confidence).toBeGreaterThanOrEqual(duplicates[1].confidence)
  })

  it('should include matching fields in result', () => {
    const targetPerson = { id: 1, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' }
    const allPeople = [
      targetPerson,
      { id: 2, firstName: 'John', lastName: 'Smith', birthDate: '1950-01-15' }
    ]

    const duplicates = findDuplicatesForPerson(targetPerson, allPeople)

    expect(duplicates[0].matchingFields).toContain('name')
    expect(duplicates[0].matchingFields).toContain('birthDate')
  })
})
