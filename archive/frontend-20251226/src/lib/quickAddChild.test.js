/**
 * Unit tests for Quick Add Child functionality
 *
 * These tests verify:
 * 1. Parent role determination based on parent's gender
 * 2. Form pre-population with parent's last name
 * 3. Relationship payload creation
 * 4. Edge cases for gender handling
 */

import { describe, it, expect } from 'vitest'
import {
  determineParentRole,
  prepareChildFormData,
  createParentChildRelationship
} from './quickAddChildUtils.js'

describe('Parent Role Determination', () => {
  it('should return "father" for male parent', () => {
    const role = determineParentRole('male')
    expect(role).toBe('father')
  })

  it('should return "mother" for female parent', () => {
    const role = determineParentRole('female')
    expect(role).toBe('mother')
  })

  it('should return null for "other" gender (requires user selection)', () => {
    const role = determineParentRole('other')
    expect(role).toBeNull()
  })

  it('should return null for unspecified gender (empty string)', () => {
    const role = determineParentRole('')
    expect(role).toBeNull()
  })

  it('should return null for null gender', () => {
    const role = determineParentRole(null)
    expect(role).toBeNull()
  })

  it('should return null for undefined gender', () => {
    const role = determineParentRole(undefined)
    expect(role).toBeNull()
  })
})

describe('Child Form Data Pre-population', () => {
  it('should pre-fill last name from parent', () => {
    const parent = {
      id: 1,
      firstName: 'John',
      lastName: 'Smith',
      gender: 'male'
    }

    const formData = prepareChildFormData(parent)

    expect(formData.lastName).toBe('Smith')
    expect(formData.firstName).toBe('')
    expect(formData.birthDate).toBe('')
    expect(formData.deathDate).toBe('')
    expect(formData.gender).toBe('')
  })

  it('should handle parent without last name', () => {
    const parent = {
      id: 1,
      firstName: 'John',
      lastName: '',
      gender: 'male'
    }

    const formData = prepareChildFormData(parent)

    expect(formData.lastName).toBe('')
  })

  it('should handle null parent gracefully', () => {
    const formData = prepareChildFormData(null)

    expect(formData.lastName).toBe('')
    expect(formData.firstName).toBe('')
  })

  it('should handle parent with missing lastName property', () => {
    const parent = {
      id: 1,
      firstName: 'John',
      gender: 'male'
    }

    const formData = prepareChildFormData(parent)

    expect(formData.lastName).toBe('')
  })
})

describe('Parent-Child Relationship Creation', () => {
  it('should create valid relationship for father', () => {
    const relationship = createParentChildRelationship(1, 2, 'father')

    expect(relationship).toEqual({
      person1Id: 1,
      person2Id: 2,
      type: 'father',
      parentRole: 'father'
    })
  })

  it('should create valid relationship for mother', () => {
    const relationship = createParentChildRelationship(5, 10, 'mother')

    expect(relationship).toEqual({
      person1Id: 5,
      person2Id: 10,
      type: 'mother',
      parentRole: 'mother'
    })
  })

  it('should throw error when parentRole is null', () => {
    expect(() => {
      createParentChildRelationship(1, 2, null)
    }).toThrow('Parent role must be specified')
  })

  it('should throw error when parentRole is undefined', () => {
    expect(() => {
      createParentChildRelationship(1, 2, undefined)
    }).toThrow('Parent role must be specified')
  })

  it('should throw error when parentRole is empty string', () => {
    expect(() => {
      createParentChildRelationship(1, 2, '')
    }).toThrow('Parent role must be specified')
  })
})

describe('Complete Quick Add Child Workflow', () => {
  it('should prepare complete data for male parent', () => {
    const parent = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      gender: 'male'
    }

    const parentRole = determineParentRole(parent.gender)
    const formData = prepareChildFormData(parent)

    expect(parentRole).toBe('father')
    expect(formData.lastName).toBe('Doe')
  })

  it('should prepare complete data for female parent', () => {
    const parent = {
      id: 2,
      firstName: 'Jane',
      lastName: 'Smith',
      gender: 'female'
    }

    const parentRole = determineParentRole(parent.gender)
    const formData = prepareChildFormData(parent)

    expect(parentRole).toBe('mother')
    expect(formData.lastName).toBe('Smith')
  })

  it('should handle "other" gender requiring user selection', () => {
    const parent = {
      id: 3,
      firstName: 'Alex',
      lastName: 'Johnson',
      gender: 'other'
    }

    const parentRole = determineParentRole(parent.gender)
    const formData = prepareChildFormData(parent)

    expect(parentRole).toBeNull()
    expect(formData.lastName).toBe('Johnson')
    // In this case, UI should prompt user to select parent role
  })

  it('should allow user-selected parent role for unspecified gender', () => {
    const parent = {
      id: 4,
      firstName: 'Sam',
      lastName: 'Williams',
      gender: ''
    }

    const parentRole = determineParentRole(parent.gender)
    const formData = prepareChildFormData(parent)

    expect(parentRole).toBeNull()
    expect(formData.lastName).toBe('Williams')

    // User selects 'mother' manually
    const userSelectedRole = 'mother'
    const relationship = createParentChildRelationship(
      parent.id,
      999, // child ID after creation
      userSelectedRole
    )

    expect(relationship.type).toBe('mother')
    expect(relationship.parentRole).toBe('mother')
  })
})

describe('Edge Cases and Error Handling', () => {
  it('should handle parent with only first name', () => {
    const parent = {
      id: 1,
      firstName: 'Madonna',
      lastName: null,
      gender: 'female'
    }

    const formData = prepareChildFormData(parent)
    expect(formData.lastName).toBe('')
  })

  it('should validate parentRole before creating relationship', () => {
    const invalidRoles = [null, undefined, '']

    invalidRoles.forEach(role => {
      expect(() => {
        createParentChildRelationship(1, 2, role)
      }).toThrow('Parent role must be specified')
    })
  })

  it('should accept valid parent roles only', () => {
    const validRoles = ['mother', 'father']

    validRoles.forEach(role => {
      expect(() => {
        createParentChildRelationship(1, 2, role)
      }).not.toThrow()
    })
  })
})
