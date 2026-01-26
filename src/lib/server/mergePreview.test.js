/**
 * Unit Tests for Merge Preview and Validation
 * Story #109: Merge Preview and Validation
 *
 * Tests the generateMergePreview function and field selection logic
 */

import { describe, it, expect } from 'vitest'
import {
  generateMergePreview,
  selectBestValue,
  validateMerge,
  detectRelationshipConflicts
} from './mergePreview.js'

describe('selectBestValue', () => {
  it('should prefer non-null value over null', () => {
    expect(selectBestValue('John', null)).toBe('John')
    expect(selectBestValue(null, 'Jane')).toBe('Jane')
  })

  it('should prefer more specific date over partial date', () => {
    expect(selectBestValue('1950-03-15', '1950')).toBe('1950-03-15')
    expect(selectBestValue('1950', '1950-03-15')).toBe('1950-03-15')
    expect(selectBestValue('1950-03', '1950-03-15')).toBe('1950-03-15')
  })

  it('should prefer longer string over shorter string', () => {
    expect(selectBestValue('John', 'John A.')).toBe('John A.')
    expect(selectBestValue('Smith', 'Smithson')).toBe('Smithson')
  })

  it('should default to target value when both are equal', () => {
    expect(selectBestValue('John', 'John')).toBe('John')
    expect(selectBestValue('1950', '1950')).toBe('1950')
  })

  it('should handle null and empty string edge cases', () => {
    expect(selectBestValue(null, null)).toBe(null)
    expect(selectBestValue('', '')).toBe('')
    expect(selectBestValue('', null)).toBe(null)
    expect(selectBestValue(null, '')).toBe('')
  })
})

describe('validateMerge', () => {
  it('should allow merge when genders match', () => {
    const result = validateMerge(
      { id: 1, gender: 'male' },
      { id: 2, gender: 'male' }
    )

    expect(result.canMerge).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('should prevent merge when genders mismatch', () => {
    const result = validateMerge(
      { id: 1, gender: 'male' },
      { id: 2, gender: 'female' }
    )

    expect(result.canMerge).toBe(false)
    expect(result.errors).toContain('Gender mismatch: Cannot merge male into female')
  })

  it('should allow merge when one gender is unspecified', () => {
    const result = validateMerge(
      { id: 1, gender: 'male' },
      { id: 2, gender: 'unspecified' }
    )

    expect(result.canMerge).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('should allow merge when both genders are null', () => {
    const result = validateMerge(
      { id: 1, gender: null },
      { id: 2, gender: null }
    )

    expect(result.canMerge).toBe(true)
    expect(result.errors).toEqual([])
  })
})

describe('detectRelationshipConflicts', () => {
  it('should detect mother conflict', () => {
    const sourceRelationships = [
      { person1Id: 8, person2Id: 15, type: 'parentOf', parentRole: 'mother' }
    ]
    const targetRelationships = [
      { person1Id: 10, person2Id: 27, type: 'parentOf', parentRole: 'mother' }
    ]

    const conflicts = detectRelationshipConflicts(15, 27, sourceRelationships, targetRelationships)

    expect(conflicts).toContain('mother')
  })

  it('should detect father conflict', () => {
    const sourceRelationships = [
      { person1Id: 8, person2Id: 15, type: 'parentOf', parentRole: 'father' }
    ]
    const targetRelationships = [
      { person1Id: 10, person2Id: 27, type: 'parentOf', parentRole: 'father' }
    ]

    const conflicts = detectRelationshipConflicts(15, 27, sourceRelationships, targetRelationships)

    expect(conflicts).toContain('father')
  })

  it('should not report conflict when only one person has a mother', () => {
    const sourceRelationships = [
      { person1Id: 8, person2Id: 15, type: 'parentOf', parentRole: 'mother' }
    ]
    const targetRelationships = []

    const conflicts = detectRelationshipConflicts(15, 27, sourceRelationships, targetRelationships)

    expect(conflicts).toEqual([])
  })

  it('should not report conflict when mothers are the same person', () => {
    const sourceRelationships = [
      { person1Id: 8, person2Id: 15, type: 'parentOf', parentRole: 'mother' }
    ]
    const targetRelationships = [
      { person1Id: 8, person2Id: 27, type: 'parentOf', parentRole: 'mother' }
    ]

    const conflicts = detectRelationshipConflicts(15, 27, sourceRelationships, targetRelationships)

    expect(conflicts).toEqual([])
  })

  it('should detect both mother and father conflicts', () => {
    const sourceRelationships = [
      { person1Id: 8, person2Id: 15, type: 'parentOf', parentRole: 'mother' },
      { person1Id: 9, person2Id: 15, type: 'parentOf', parentRole: 'father' }
    ]
    const targetRelationships = [
      { person1Id: 10, person2Id: 27, type: 'parentOf', parentRole: 'mother' },
      { person1Id: 11, person2Id: 27, type: 'parentOf', parentRole: 'father' }
    ]

    const conflicts = detectRelationshipConflicts(15, 27, sourceRelationships, targetRelationships)

    expect(conflicts).toContain('mother')
    expect(conflicts).toContain('father')
    expect(conflicts).toHaveLength(2)
  })

  it('should handle empty relationship arrays', () => {
    const conflicts = detectRelationshipConflicts(15, 27, [], [])
    expect(conflicts).toEqual([])
  })
})

describe('generateMergePreview', () => {
  it('should generate preview with combined data', () => {
    const source = {
      id: 15,
      firstName: 'John',
      lastName: 'Smith',
      birthDate: '1950',
      deathDate: null,
      gender: 'male',
      photoUrl: null
    }

    const target = {
      id: 27,
      firstName: 'John',
      lastName: 'A. Smith',
      birthDate: '1950-03-15',
      deathDate: null,
      gender: 'male',
      photoUrl: 'http://example.com/photo.jpg'
    }

    const sourceRelationships = []
    const targetRelationships = []

    const preview = generateMergePreview(source, target, null, sourceRelationships, targetRelationships)

    expect(preview.canMerge).toBe(true)
    expect(preview.validation.errors).toEqual([])
    expect(preview.merged.firstName).toBe('John')
    expect(preview.merged.lastName).toBe('A. Smith')
    expect(preview.merged.birthDate).toBe('1950-03-15')
    expect(preview.merged.photoUrl).toBe('http://example.com/photo.jpg')
  })

  it('should detect validation errors', () => {
    const source = {
      id: 15,
      firstName: 'John',
      lastName: 'Smith',
      birthDate: '1950',
      deathDate: null,
      gender: 'male',
      photoUrl: null
    }

    const target = {
      id: 27,
      firstName: 'Jane',
      lastName: 'Smith',
      birthDate: '1950',
      deathDate: null,
      gender: 'female',
      photoUrl: null
    }

    const sourceRelationships = []
    const targetRelationships = []

    const preview = generateMergePreview(source, target, null, sourceRelationships, targetRelationships)

    expect(preview.canMerge).toBe(false)
    expect(preview.validation.errors).toContain('Gender mismatch: Cannot merge male into female')
  })

  it('should detect relationship conflicts', () => {
    const source = {
      id: 15,
      firstName: 'John',
      lastName: 'Smith',
      birthDate: '1950',
      deathDate: null,
      gender: 'male',
      photoUrl: null
    }

    const target = {
      id: 27,
      firstName: 'John',
      lastName: 'A. Smith',
      birthDate: '1950-03-15',
      deathDate: null,
      gender: 'male',
      photoUrl: null
    }

    const sourceRelationships = [
      { person1Id: 8, person2Id: 15, type: 'parentOf', parentRole: 'mother' }
    ]

    const targetRelationships = [
      { person1Id: 10, person2Id: 27, type: 'parentOf', parentRole: 'mother' }
    ]

    const preview = generateMergePreview(source, target, null, sourceRelationships, targetRelationships)

    expect(preview.canMerge).toBe(true) // Conflicts are warnings, not blockers
    expect(preview.validation.warnings).toContain('Both people have different mothers - merge will overwrite')
    expect(preview.validation.conflictFields).toContain('mother')
  })

  it('should list relationships to transfer', () => {
    const source = {
      id: 15,
      firstName: 'John',
      lastName: 'Smith',
      birthDate: '1950',
      deathDate: null,
      gender: 'male',
      photoUrl: null
    }

    const target = {
      id: 27,
      firstName: 'John',
      lastName: 'A. Smith',
      birthDate: '1950-03-15',
      deathDate: null,
      gender: 'male',
      photoUrl: null
    }

    const sourceRelationships = [
      { id: 1, person1Id: 8, person2Id: 15, type: 'parentOf', parentRole: 'mother' },
      { id: 2, person1Id: 15, person2Id: 20, type: 'spouse' },
      { id: 3, person1Id: 15, person2Id: 30, type: 'parentOf', parentRole: 'father' }
    ]

    const targetRelationships = [
      { id: 4, person1Id: 9, person2Id: 27, type: 'parentOf', parentRole: 'father' },
      { id: 5, person1Id: 27, person2Id: 35, type: 'parentOf', parentRole: 'father' }
    ]

    const preview = generateMergePreview(source, target, null, sourceRelationships, targetRelationships)

    expect(preview.relationshipsToTransfer).toHaveLength(3)
    expect(preview.existingRelationships).toHaveLength(2)
  })

  it('should handle missing data gracefully', () => {
    const source = {
      id: 15,
      firstName: null,
      lastName: 'Smith',
      birthDate: null,
      deathDate: null,
      gender: null,
      photoUrl: null
    }

    const target = {
      id: 27,
      firstName: 'John',
      lastName: null,
      birthDate: '1950',
      deathDate: null,
      gender: 'male',
      photoUrl: null
    }

    const sourceRelationships = []
    const targetRelationships = []

    const preview = generateMergePreview(source, target, null, sourceRelationships, targetRelationships)

    expect(preview.canMerge).toBe(true)
    expect(preview.merged.firstName).toBe('John')
    expect(preview.merged.lastName).toBe('Smith')
    expect(preview.merged.birthDate).toBe('1950')
  })
})
