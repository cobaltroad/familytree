/**
 * Tests for Tree Helper Functions
 * Following TDD methodology (RED-GREEN-REFACTOR)
 */

import { describe, it, expect } from 'vitest'
import {
  getNodeColor,
  findRootPeople,
  findParents,
  findChildren,
  buildDescendantTree,
  buildAncestorTree,
  assignGenerations,
  formatLifespan,
  calculateAge,
  findSpouse,
  computeSiblingLinks
} from './treeHelpers.js'

describe('computeSiblingLinks', () => {
  it('should compute sibling links for people who share both parents', () => {
    const people = [
      { id: 1, firstName: 'Parent1', lastName: 'Smith' },
      { id: 2, firstName: 'Parent2', lastName: 'Smith' },
      { id: 3, firstName: 'Child1', lastName: 'Smith' },
      { id: 4, firstName: 'Child2', lastName: 'Smith' },
      { id: 5, firstName: 'Child3', lastName: 'Smith' }
    ]

    const relationships = [
      { id: 1, person1Id: 1, person2Id: 3, type: 'father' },
      { id: 2, person1Id: 2, person2Id: 3, type: 'mother' },
      { id: 3, person1Id: 1, person2Id: 4, type: 'father' },
      { id: 4, person1Id: 2, person2Id: 4, type: 'mother' },
      { id: 5, person1Id: 1, person2Id: 5, type: 'father' },
      { id: 6, person1Id: 2, person2Id: 5, type: 'mother' }
    ]

    const siblingLinks = computeSiblingLinks(people, relationships)

    // Should have 3 bidirectional sibling relationships: 3-4, 3-5, 4-5
    expect(siblingLinks).toHaveLength(6) // 3 relationships × 2 (bidirectional)

    // Verify specific sibling links exist
    expect(siblingLinks).toContainEqual({
      source: 3,
      target: 4,
      type: 'sibling'
    })
    expect(siblingLinks).toContainEqual({
      source: 4,
      target: 3,
      type: 'sibling'
    })
  })

  it('should compute sibling links for half-siblings (one shared parent)', () => {
    const people = [
      { id: 1, firstName: 'Parent1', lastName: 'Smith' },
      { id: 2, firstName: 'Parent2', lastName: 'Jones' },
      { id: 3, firstName: 'Child1', lastName: 'Smith' },
      { id: 4, firstName: 'Child2', lastName: 'Smith' }
    ]

    const relationships = [
      { id: 1, person1Id: 1, person2Id: 3, type: 'father' },
      { id: 2, person1Id: 1, person2Id: 4, type: 'father' },
      { id: 3, person1Id: 2, person2Id: 4, type: 'mother' }
    ]

    const siblingLinks = computeSiblingLinks(people, relationships)

    // Should have 1 bidirectional sibling relationship: 3-4 (share father)
    expect(siblingLinks).toHaveLength(2)

    expect(siblingLinks).toContainEqual({
      source: 3,
      target: 4,
      type: 'sibling'
    })
    expect(siblingLinks).toContainEqual({
      source: 4,
      target: 3,
      type: 'sibling'
    })
  })

  it('should return empty array when no siblings exist', () => {
    const people = [
      { id: 1, firstName: 'Parent1', lastName: 'Smith' },
      { id: 2, firstName: 'Child1', lastName: 'Smith' }
    ]

    const relationships = [
      { id: 1, person1Id: 1, person2Id: 2, type: 'father' }
    ]

    const siblingLinks = computeSiblingLinks(people, relationships)

    expect(siblingLinks).toEqual([])
  })

  it('should handle empty people and relationships arrays', () => {
    const siblingLinks = computeSiblingLinks([], [])

    expect(siblingLinks).toEqual([])
  })
})

describe('getNodeColor', () => {
  it('should return light blue for male', () => {
    const person = { gender: 'male' }
    expect(getNodeColor(person)).toBe('#AED6F1')
  })

  it('should return light pink for female', () => {
    const person = { gender: 'female' }
    expect(getNodeColor(person)).toBe('#F8BBD0')
  })

  it('should return gray for other genders', () => {
    const person = { gender: 'other' }
    expect(getNodeColor(person)).toBe('#E0E0E0')
  })

  it('should return gray for null person', () => {
    expect(getNodeColor(null)).toBe('#E0E0E0')
  })
})

describe('formatLifespan', () => {
  it('should format birth and death dates', () => {
    // Use mid-year dates to avoid timezone issues
    expect(formatLifespan('1950-06-15', '2020-06-15')).toBe('1950–2020')
  })

  it('should show "present" for living people', () => {
    expect(formatLifespan('1950-06-15', null)).toBe('1950–present')
  })

  it('should handle missing birth date', () => {
    expect(formatLifespan(null, '2020-06-15')).toBe('?–2020')
  })
})

describe('calculateAge', () => {
  it('should calculate age from birth to death', () => {
    // Use mid-year dates to avoid timezone issues
    const age = calculateAge('1950-06-15', '2020-06-15')
    expect(age).toBe(70)
  })

  it('should return null for missing birth date', () => {
    expect(calculateAge(null, '2020-01-01')).toBeNull()
  })
})
