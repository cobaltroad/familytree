/**
 * Unit tests for Smart Relationship Creator utility functions
 * Issue #88: Bidirectional Relationship Handling
 *
 * Tests cover:
 * 1. Parent role determination based on gender
 * 2. Relationship payload building for all types
 * 3. Bidirectional spouse relationship handling
 * 4. Parent-child relationship ordering
 * 5. Edge cases and validation
 */

import { describe, it, expect } from 'vitest'
import {
  determineParentRoleFromGender,
  buildRelationshipPayloads,
  needsParentRoleSelection,
  validateRelationshipData
} from './smartRelationshipUtils.js'

describe('smartRelationshipUtils - Parent Role Determination', () => {
  describe('determineParentRoleFromGender', () => {
    it('should return "father" for male gender', () => {
      expect(determineParentRoleFromGender('male')).toBe('father')
    })

    it('should return "mother" for female gender', () => {
      expect(determineParentRoleFromGender('female')).toBe('mother')
    })

    it('should return null for "other" gender (requires user selection)', () => {
      expect(determineParentRoleFromGender('other')).toBeNull()
    })

    it('should return null for unspecified gender (empty string)', () => {
      expect(determineParentRoleFromGender('')).toBeNull()
    })

    it('should return null for undefined gender', () => {
      expect(determineParentRoleFromGender(undefined)).toBeNull()
    })

    it('should return null for null gender', () => {
      expect(determineParentRoleFromGender(null)).toBeNull()
    })
  })

  describe('needsParentRoleSelection', () => {
    it('should return false for male adding child (role is clear)', () => {
      expect(needsParentRoleSelection('child', 'male')).toBe(false)
    })

    it('should return false for female adding child (role is clear)', () => {
      expect(needsParentRoleSelection('child', 'female')).toBe(false)
    })

    it('should return true for other gender adding child (role is ambiguous)', () => {
      expect(needsParentRoleSelection('child', 'other')).toBe(true)
    })

    it('should return true for unspecified gender adding child (role is ambiguous)', () => {
      expect(needsParentRoleSelection('child', '')).toBe(true)
    })

    it('should return false for mother relationship type (role is explicit)', () => {
      expect(needsParentRoleSelection('mother', 'other')).toBe(false)
    })

    it('should return false for father relationship type (role is explicit)', () => {
      expect(needsParentRoleSelection('father', 'male')).toBe(false)
    })

    it('should return false for spouse relationship type (no role needed)', () => {
      expect(needsParentRoleSelection('spouse', 'other')).toBe(false)
    })
  })
})

describe('smartRelationshipUtils - Relationship Payload Building', () => {
  describe('buildRelationshipPayloads - Child Relationships', () => {
    it('should build correct payload when male adds child (father role)', () => {
      const result = buildRelationshipPayloads({
        relationshipType: 'child',
        focusPersonId: 1,
        newPersonId: 2,
        focusPersonGender: 'male'
      })

      expect(result).toEqual([
        {
          person1Id: 1,
          person2Id: 2,
          type: 'father',
          parentRole: 'father'
        }
      ])
    })

    it('should build correct payload when female adds child (mother role)', () => {
      const result = buildRelationshipPayloads({
        relationshipType: 'child',
        focusPersonId: 1,
        newPersonId: 2,
        focusPersonGender: 'female'
      })

      expect(result).toEqual([
        {
          person1Id: 1,
          person2Id: 2,
          type: 'mother',
          parentRole: 'mother'
        }
      ])
    })

    it('should build correct payload when child relationship with explicit parent role', () => {
      const result = buildRelationshipPayloads({
        relationshipType: 'child',
        focusPersonId: 1,
        newPersonId: 2,
        focusPersonGender: 'other',
        selectedParentRole: 'mother'
      })

      expect(result).toEqual([
        {
          person1Id: 1,
          person2Id: 2,
          type: 'mother',
          parentRole: 'mother'
        }
      ])
    })

    it('should throw error when child relationship needs parent role but none provided', () => {
      expect(() => {
        buildRelationshipPayloads({
          relationshipType: 'child',
          focusPersonId: 1,
          newPersonId: 2,
          focusPersonGender: 'other'
        })
      }).toThrow('Parent role selection required')
    })
  })

  describe('buildRelationshipPayloads - Mother Relationships', () => {
    it('should build correct payload when adding mother (new person is parent)', () => {
      const result = buildRelationshipPayloads({
        relationshipType: 'mother',
        focusPersonId: 1,
        newPersonId: 2,
        focusPersonGender: 'male' // Focus person gender doesn't matter
      })

      expect(result).toEqual([
        {
          person1Id: 2, // New person is parent
          person2Id: 1, // Focus person is child
          type: 'mother',
          parentRole: 'mother'
        }
      ])
    })
  })

  describe('buildRelationshipPayloads - Father Relationships', () => {
    it('should build correct payload when adding father (new person is parent)', () => {
      const result = buildRelationshipPayloads({
        relationshipType: 'father',
        focusPersonId: 1,
        newPersonId: 2,
        focusPersonGender: 'female' // Focus person gender doesn't matter
      })

      expect(result).toEqual([
        {
          person1Id: 2, // New person is parent
          person2Id: 1, // Focus person is child
          type: 'father',
          parentRole: 'father'
        }
      ])
    })
  })

  describe('buildRelationshipPayloads - Spouse Relationships (Bidirectional)', () => {
    it('should build TWO payloads for spouse relationship (bidirectional)', () => {
      const result = buildRelationshipPayloads({
        relationshipType: 'spouse',
        focusPersonId: 1,
        newPersonId: 2,
        focusPersonGender: 'female' // Gender doesn't matter for spouse
      })

      expect(result).toHaveLength(2)
      expect(result).toEqual([
        {
          person1Id: 1,
          person2Id: 2,
          type: 'spouse',
          parentRole: null
        },
        {
          person1Id: 2,
          person2Id: 1,
          type: 'spouse',
          parentRole: null
        }
      ])
    })

    it('should create bidirectional spouse relationships regardless of gender', () => {
      const result = buildRelationshipPayloads({
        relationshipType: 'spouse',
        focusPersonId: 10,
        newPersonId: 20,
        focusPersonGender: 'other'
      })

      expect(result).toHaveLength(2)
      expect(result[0].person1Id).toBe(10)
      expect(result[0].person2Id).toBe(20)
      expect(result[1].person1Id).toBe(20)
      expect(result[1].person2Id).toBe(10)
    })
  })

  describe('buildRelationshipPayloads - Edge Cases', () => {
    it('should throw error for invalid relationship type', () => {
      expect(() => {
        buildRelationshipPayloads({
          relationshipType: 'sibling',
          focusPersonId: 1,
          newPersonId: 2,
          focusPersonGender: 'male'
        })
      }).toThrow('Invalid relationship type')
    })

    it('should throw error for missing focusPersonId', () => {
      expect(() => {
        buildRelationshipPayloads({
          relationshipType: 'child',
          newPersonId: 2,
          focusPersonGender: 'male'
        })
      }).toThrow('Missing required parameters')
    })

    it('should throw error for missing newPersonId', () => {
      expect(() => {
        buildRelationshipPayloads({
          relationshipType: 'child',
          focusPersonId: 1,
          focusPersonGender: 'male'
        })
      }).toThrow('Missing required parameters')
    })
  })
})

describe('smartRelationshipUtils - Validation', () => {
  describe('validateRelationshipData', () => {
    it('should validate correct child relationship data', () => {
      const result = validateRelationshipData({
        relationshipType: 'child',
        focusPersonId: 1,
        newPersonId: 2,
        focusPersonGender: 'female'
      })

      expect(result.valid).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should validate correct spouse relationship data', () => {
      const result = validateRelationshipData({
        relationshipType: 'spouse',
        focusPersonId: 1,
        newPersonId: 2,
        focusPersonGender: 'male'
      })

      expect(result.valid).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should invalidate when parent role selection needed but missing', () => {
      const result = validateRelationshipData({
        relationshipType: 'child',
        focusPersonId: 1,
        newPersonId: 2,
        focusPersonGender: 'other'
      })

      expect(result.valid).toBe(false)
      expect(result.error).toContain('parent role')
    })

    it('should validate when parent role explicitly provided', () => {
      const result = validateRelationshipData({
        relationshipType: 'child',
        focusPersonId: 1,
        newPersonId: 2,
        focusPersonGender: 'other',
        selectedParentRole: 'mother'
      })

      expect(result.valid).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should invalidate invalid relationship type', () => {
      const result = validateRelationshipData({
        relationshipType: 'invalid',
        focusPersonId: 1,
        newPersonId: 2,
        focusPersonGender: 'male'
      })

      expect(result.valid).toBe(false)
      expect(result.error).toContain('relationship type')
    })
  })
})

describe('smartRelationshipUtils - Integration Scenarios', () => {
  it('should handle complete workflow: female adds child', () => {
    // Check if parent role selection is needed
    const needsSelection = needsParentRoleSelection('child', 'female')
    expect(needsSelection).toBe(false)

    // Build relationship payloads
    const payloads = buildRelationshipPayloads({
      relationshipType: 'child',
      focusPersonId: 100,
      newPersonId: 200,
      focusPersonGender: 'female'
    })

    expect(payloads).toHaveLength(1)
    expect(payloads[0]).toEqual({
      person1Id: 100,
      person2Id: 200,
      type: 'mother',
      parentRole: 'mother'
    })
  })

  it('should handle complete workflow: other gender adds child with selection', () => {
    // Check if parent role selection is needed
    const needsSelection = needsParentRoleSelection('child', 'other')
    expect(needsSelection).toBe(true)

    // User selects "father" role
    const selectedRole = 'father'

    // Build relationship payloads
    const payloads = buildRelationshipPayloads({
      relationshipType: 'child',
      focusPersonId: 100,
      newPersonId: 200,
      focusPersonGender: 'other',
      selectedParentRole: selectedRole
    })

    expect(payloads).toHaveLength(1)
    expect(payloads[0]).toEqual({
      person1Id: 100,
      person2Id: 200,
      type: 'father',
      parentRole: 'father'
    })
  })

  it('should handle complete workflow: adding mother to child', () => {
    const needsSelection = needsParentRoleSelection('mother', 'male')
    expect(needsSelection).toBe(false)

    const payloads = buildRelationshipPayloads({
      relationshipType: 'mother',
      focusPersonId: 100,
      newPersonId: 200,
      focusPersonGender: 'male'
    })

    expect(payloads).toHaveLength(1)
    expect(payloads[0]).toEqual({
      person1Id: 200, // New person (mother) is person1
      person2Id: 100, // Focus person (child) is person2
      type: 'mother',
      parentRole: 'mother'
    })
  })

  it('should handle complete workflow: adding spouse', () => {
    const needsSelection = needsParentRoleSelection('spouse', 'female')
    expect(needsSelection).toBe(false)

    const payloads = buildRelationshipPayloads({
      relationshipType: 'spouse',
      focusPersonId: 100,
      newPersonId: 200,
      focusPersonGender: 'female'
    })

    // Spouse relationships are ALWAYS bidirectional
    expect(payloads).toHaveLength(2)
    expect(payloads[0]).toEqual({
      person1Id: 100,
      person2Id: 200,
      type: 'spouse',
      parentRole: null
    })
    expect(payloads[1]).toEqual({
      person1Id: 200,
      person2Id: 100,
      type: 'spouse',
      parentRole: null
    })
  })
})
