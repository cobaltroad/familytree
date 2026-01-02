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

  it('should NOT include parents as siblings of their children', () => {
    // Bug report: Fathers erroneously displayed as siblings
    // This test ensures parents are never included in sibling relationships
    const people = [
      { id: 1, firstName: 'Father', lastName: 'Smith', gender: 'male' },
      { id: 2, firstName: 'Mother', lastName: 'Smith', gender: 'female' },
      { id: 3, firstName: 'Child1', lastName: 'Smith', gender: 'male' },
      { id: 4, firstName: 'Child2', lastName: 'Smith', gender: 'female' }
    ]

    const relationships = [
      { id: 1, person1Id: 1, person2Id: 3, type: 'father' },
      { id: 2, person1Id: 2, person2Id: 3, type: 'mother' },
      { id: 3, person1Id: 1, person2Id: 4, type: 'father' },
      { id: 4, person1Id: 2, person2Id: 4, type: 'mother' }
    ]

    const siblingLinks = computeSiblingLinks(people, relationships)

    // Child1 and Child2 should be siblings (they share both parents)
    expect(siblingLinks).toHaveLength(2) // 1 relationship × 2 (bidirectional)

    // Verify siblings are only the children
    const child1ToChild2 = siblingLinks.find(link => link.source === 3 && link.target === 4)
    const child2ToChild1 = siblingLinks.find(link => link.source === 4 && link.target === 3)

    expect(child1ToChild2).toBeDefined()
    expect(child2ToChild1).toBeDefined()

    // Verify NO parent is included as a sibling
    const parentInvolvedLinks = siblingLinks.filter(link =>
      link.source === 1 || link.target === 1 || // Father
      link.source === 2 || link.target === 2    // Mother
    )

    expect(parentInvolvedLinks).toHaveLength(0)
  })

  it('should handle complex multi-generational families without marking ancestors as siblings', () => {
    // More complex scenario: grandparents, parents, and grandchildren
    // This tests that the father is not incorrectly marked as sibling of his children
    const people = [
      { id: 1, firstName: 'Grandfather', lastName: 'Smith' },
      { id: 2, firstName: 'Grandmother', lastName: 'Smith' },
      { id: 3, firstName: 'Father', lastName: 'Smith' }, // Son of 1 & 2
      { id: 4, firstName: 'Mother', lastName: 'Jones' },
      { id: 5, firstName: 'Uncle', lastName: 'Smith' }, // Son of 1 & 2, sibling of 3
      { id: 6, firstName: 'Grandchild1', lastName: 'Smith' }, // Child of 3 & 4
      { id: 7, firstName: 'Grandchild2', lastName: 'Smith' } // Child of 3 & 4
    ]

    const relationships = [
      // Grandparents -> Parents
      { id: 1, person1Id: 1, person2Id: 3, type: 'father' }, // Grandfather -> Father
      { id: 2, person1Id: 2, person2Id: 3, type: 'mother' }, // Grandmother -> Father
      { id: 3, person1Id: 1, person2Id: 5, type: 'father' }, // Grandfather -> Uncle
      { id: 4, person1Id: 2, person2Id: 5, type: 'mother' }, // Grandmother -> Uncle
      // Parents -> Grandchildren
      { id: 5, person1Id: 3, person2Id: 6, type: 'father' }, // Father -> Grandchild1
      { id: 6, person1Id: 4, person2Id: 6, type: 'mother' }, // Mother -> Grandchild1
      { id: 7, person1Id: 3, person2Id: 7, type: 'father' }, // Father -> Grandchild2
      { id: 8, person1Id: 4, person2Id: 7, type: 'mother' }  // Mother -> Grandchild2
    ]

    const siblingLinks = computeSiblingLinks(people, relationships)

    // Expected siblings:
    // - Father (3) and Uncle (5) share parents 1 & 2 → 2 links
    // - Grandchild1 (6) and Grandchild2 (7) share parents 3 & 4 → 2 links
    // Total: 4 bidirectional links
    expect(siblingLinks).toHaveLength(4)

    // Verify Father (3) and Uncle (5) are siblings
    expect(siblingLinks).toContainEqual({ source: 3, target: 5, type: 'sibling' })
    expect(siblingLinks).toContainEqual({ source: 5, target: 3, type: 'sibling' })

    // Verify Grandchild1 (6) and Grandchild2 (7) are siblings
    expect(siblingLinks).toContainEqual({ source: 6, target: 7, type: 'sibling' })
    expect(siblingLinks).toContainEqual({ source: 7, target: 6, type: 'sibling' })

    // Verify Father (3) is NOT marked as sibling of his children (6, 7)
    const fatherAsChildSibling = siblingLinks.filter(link =>
      (link.source === 3 && (link.target === 6 || link.target === 7)) ||
      (link.target === 3 && (link.source === 6 || link.source === 7))
    )
    expect(fatherAsChildSibling).toHaveLength(0)

    // Verify Grandparents (1, 2) are NOT marked as siblings of anyone
    const grandparentsAsSiblings = siblingLinks.filter(link =>
      link.source === 1 || link.target === 1 ||
      link.source === 2 || link.target === 2
    )
    expect(grandparentsAsSiblings).toHaveLength(0)
  })

  it('should NOT create sibling links between people who already have a parent-child relationship', () => {
    // BUG FIX: This is the actual bug!
    // Edge case: Person A has a child with their own parent (data integrity issue)
    // Person 2 is both parent AND sibling of Person 3 (shares parent with Person 3)
    // We should NOT create a sibling link because they already have a parent-child relationship
    const people = [
      { id: 1, firstName: 'Grandparent', lastName: 'Smith' },
      { id: 2, firstName: 'ParentAndSibling', lastName: 'Smith' }, // Child of 1, Parent of 3
      { id: 3, firstName: 'ChildAndSibling', lastName: 'Smith' }   // Child of both 1 and 2
    ]

    const relationships = [
      { id: 1, person1Id: 1, person2Id: 2, type: 'mother' }, // Grandparent -> ParentAndSibling
      { id: 2, person1Id: 1, person2Id: 3, type: 'mother' }, // Grandparent -> ChildAndSibling
      { id: 3, person1Id: 2, person2Id: 3, type: 'father' }  // ParentAndSibling -> ChildAndSibling
    ]

    const siblingLinks = computeSiblingLinks(people, relationships)

    // Person 2 and Person 3 share parent (Person 1), so they WOULD be siblings
    // BUT they also have a parent-child relationship (2 is parent of 3)
    // The sibling link should be EXCLUDED to avoid confusion in the network view
    const link2to3 = siblingLinks.find(link => link.source === 2 && link.target === 3)
    const link3to2 = siblingLinks.find(link => link.source === 3 && link.target === 2)

    expect(link2to3).toBeUndefined() // Should NOT have sibling link (parent-child relationship takes precedence)
    expect(link3to2).toBeUndefined()
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
