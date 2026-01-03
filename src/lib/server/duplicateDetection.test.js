/**
 * Duplicate Detection Module - Unit Tests
 * Story #93: GEDCOM File Parsing and Validation
 *
 * RED phase: Writing failing tests for duplicate detection algorithm
 */

import { describe, it, expect } from 'vitest'
import {
  calculateMatchConfidence,
  findDuplicates,
  compareNames,
  compareDates,
  compareParents
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
