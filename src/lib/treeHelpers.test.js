/**
 * Tests for Tree Helper Functions
 * Following TDD methodology (RED-GREEN-REFACTOR)
 *
 * Note: After v2.3.0 and removal of PedigreeView/NetworkView (PR #144), many functions
 * were deprecated and removed. Only core utility functions remain:
 * - isParentChildRelationship
 * - getNodeColor
 * - findRootPeople
 * - buildDescendantTree
 */

import { describe, it, expect } from 'vitest'
import {
  isParentChildRelationship,
  getNodeColor,
  findRootPeople,
  buildDescendantTree
} from './treeHelpers.js'

describe('isParentChildRelationship', () => {
  it('should return true for mother relationship', () => {
    const rel = { type: 'mother', person1Id: 1, person2Id: 2 }
    expect(isParentChildRelationship(rel)).toBe(true)
  })

  it('should return true for father relationship', () => {
    const rel = { type: 'father', person1Id: 1, person2Id: 2 }
    expect(isParentChildRelationship(rel)).toBe(true)
  })

  it('should return true for parentOf relationship', () => {
    const rel = { type: 'parentOf', person1Id: 1, person2Id: 2, parentRole: 'mother' }
    expect(isParentChildRelationship(rel)).toBe(true)
  })

  it('should return false for spouse relationship', () => {
    const rel = { type: 'spouse', person1Id: 1, person2Id: 2 }
    expect(isParentChildRelationship(rel)).toBe(false)
  })

  it('should return false for sibling relationship', () => {
    const rel = { type: 'sibling', person1Id: 1, person2Id: 2 }
    expect(isParentChildRelationship(rel)).toBe(false)
  })
})

describe('getNodeColor', () => {
  it('should return blue for male gender', () => {
    const person = { gender: 'male' }
    expect(getNodeColor(person)).toBe('#AED6F1')
  })

  it('should return pink for female gender', () => {
    const person = { gender: 'female' }
    expect(getNodeColor(person)).toBe('#F8BBD0')
  })

  it('should return gray for other gender', () => {
    const person = { gender: 'other' }
    expect(getNodeColor(person)).toBe('#E0E0E0')
  })

  it('should return gray for unspecified gender (null)', () => {
    const person = { gender: null }
    expect(getNodeColor(person)).toBe('#E0E0E0')
  })

  it('should return gray for missing gender property', () => {
    const person = {}
    expect(getNodeColor(person)).toBe('#E0E0E0')
  })

  it('should return gray for null person', () => {
    expect(getNodeColor(null)).toBe('#E0E0E0')
  })

  it('should handle case-insensitive gender values', () => {
    expect(getNodeColor({ gender: 'MALE' })).toBe('#AED6F1')
    expect(getNodeColor({ gender: 'Female' })).toBe('#F8BBD0')
  })
})

describe('findRootPeople', () => {
  it('should return people with no parents', () => {
    const people = [
      { id: 1, firstName: 'Root1', lastName: 'Person' },
      { id: 2, firstName: 'Root2', lastName: 'Person' },
      { id: 3, firstName: 'Child', lastName: 'Person' }
    ]

    const relationships = [
      { id: 1, person1Id: 1, person2Id: 3, type: 'father' }
    ]

    const roots = findRootPeople(people, relationships)

    expect(roots).toHaveLength(2)
    expect(roots).toContainEqual(people[0])
    expect(roots).toContainEqual(people[1])
  })

  it('should return all people when no relationships exist', () => {
    const people = [
      { id: 1, firstName: 'Person1', lastName: 'Smith' },
      { id: 2, firstName: 'Person2', lastName: 'Jones' }
    ]

    const roots = findRootPeople(people, [])

    expect(roots).toHaveLength(2)
  })

  it('should handle empty people array', () => {
    const roots = findRootPeople([], [])
    expect(roots).toEqual([])
  })

  it('should recognize parentOf relationships', () => {
    const people = [
      { id: 1, firstName: 'Parent', lastName: 'Smith' },
      { id: 2, firstName: 'Child', lastName: 'Smith' }
    ]

    const relationships = [
      { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' }
    ]

    const roots = findRootPeople(people, relationships)

    expect(roots).toHaveLength(1)
    expect(roots[0]).toEqual(people[0])
  })
})

describe('buildDescendantTree', () => {
  it('should build tree with person, spouse, and children', () => {
    const people = [
      { id: 1, firstName: 'Parent1', lastName: 'Smith' },
      { id: 2, firstName: 'Parent2', lastName: 'Smith' },
      { id: 3, firstName: 'Child1', lastName: 'Smith' },
      { id: 4, firstName: 'Child2', lastName: 'Smith' }
    ]

    const relationships = [
      { id: 1, person1Id: 1, person2Id: 3, type: 'father' },
      { id: 2, person1Id: 2, person2Id: 3, type: 'mother' },
      { id: 3, person1Id: 1, person2Id: 4, type: 'father' },
      { id: 4, person1Id: 2, person2Id: 4, type: 'mother' }
    ]

    const tree = buildDescendantTree(people[0], people, relationships)

    expect(tree.person).toEqual(people[0])
    expect(tree.spouse).toEqual(people[1])
    expect(tree.children).toHaveLength(2)
    expect(tree.children[0].person).toEqual(people[2])
    expect(tree.children[1].person).toEqual(people[3])
  })

  it('should build tree without spouse when no spouse relationship exists', () => {
    const people = [
      { id: 1, firstName: 'Parent', lastName: 'Smith' },
      { id: 2, firstName: 'Child', lastName: 'Smith' }
    ]

    const relationships = [
      { id: 1, person1Id: 1, person2Id: 2, type: 'mother' }
    ]

    const tree = buildDescendantTree(people[0], people, relationships)

    expect(tree.person).toEqual(people[0])
    expect(tree.spouse).toBeNull()
    expect(tree.children).toHaveLength(1)
  })

  it('should build tree with no children', () => {
    const people = [
      { id: 1, firstName: 'Person', lastName: 'Smith' }
    ]

    const relationships = []

    const tree = buildDescendantTree(people[0], people, relationships)

    expect(tree.person).toEqual(people[0])
    expect(tree.spouse).toBeNull()
    expect(tree.children).toHaveLength(0)
  })

  it('should build recursive tree structure', () => {
    const people = [
      { id: 1, firstName: 'Grandparent', lastName: 'Smith' },
      { id: 2, firstName: 'Parent', lastName: 'Smith' },
      { id: 3, firstName: 'Child', lastName: 'Smith' }
    ]

    const relationships = [
      { id: 1, person1Id: 1, person2Id: 2, type: 'mother' },
      { id: 2, person1Id: 2, person2Id: 3, type: 'mother' }
    ]

    const tree = buildDescendantTree(people[0], people, relationships)

    expect(tree.person).toEqual(people[0])
    expect(tree.children).toHaveLength(1)
    expect(tree.children[0].person).toEqual(people[1])
    expect(tree.children[0].children).toHaveLength(1)
    expect(tree.children[0].children[0].person).toEqual(people[2])
  })

  it('should find spouse from explicit spouse relationship when no co-parent exists', () => {
    const people = [
      { id: 1, firstName: 'Person1', lastName: 'Smith' },
      { id: 2, firstName: 'Person2', lastName: 'Jones' }
    ]

    const relationships = [
      { id: 1, person1Id: 1, person2Id: 2, type: 'spouse' }
    ]

    const tree = buildDescendantTree(people[0], people, relationships)

    expect(tree.person).toEqual(people[0])
    expect(tree.spouse).toEqual(people[1])
    expect(tree.children).toHaveLength(0)
  })
})
