/**
 * Unit tests for PersonForm relationship logic
 *
 * These tests verify that parent relationships are correctly identified
 * and displayed in the PersonForm component.
 */

import { describe, it, expect } from 'vitest'

/**
 * This function replicates the relationship finding logic from PersonForm.svelte
 * We extract it here for testing purposes to verify the bug and fix.
 */
function findParentRelationships(person, relationships, people) {
  if (!person || !relationships || relationships.length === 0) {
    return {
      mother: null,
      father: null
    }
  }

  // Find mother - BUG: uses rel.parentType instead of rel.parentRole
  const motherRel = relationships.find(rel =>
    rel.type === 'parentOf' &&
    rel.person2Id === person.id &&
    rel.parentType === 'mother'  // BUG: Should be parentRole
  )

  // Find father - BUG: uses rel.parentType instead of rel.parentRole
  const fatherRel = relationships.find(rel =>
    rel.type === 'parentOf' &&
    rel.person2Id === person.id &&
    rel.parentType === 'father'  // BUG: Should be parentRole
  )

  const mother = motherRel ? people.find(p => p.id === motherRel.person1Id) : null
  const father = fatherRel ? people.find(p => p.id === fatherRel.person1Id) : null

  return { mother, father }
}

describe('PersonForm - Parent Relationship Display Bug', () => {
  // Test data setup
  const mockPeople = [
    { id: 1, firstName: 'Jane', lastName: 'Doe' },
    { id: 2, firstName: 'John', lastName: 'Doe' },
    { id: 3, firstName: 'Alice', lastName: 'Doe' }
  ]

  const mockRelationships = [
    {
      type: 'parentOf',
      person1Id: 1,  // Jane is the parent
      person2Id: 3,  // Alice is the child
      parentRole: 'mother'  // Correct field name from API
    },
    {
      type: 'parentOf',
      person1Id: 2,  // John is the parent
      person2Id: 3,  // Alice is the child
      parentRole: 'father'  // Correct field name from API
    }
  ]

  const childPerson = { id: 3, firstName: 'Alice', lastName: 'Doe' }

  it('should find mother when relationship uses parentRole field', () => {
    // RED: This test will FAIL because the code uses parentType instead of parentRole
    const { mother } = findParentRelationships(childPerson, mockRelationships, mockPeople)

    expect(mother).not.toBeNull()
    expect(mother.firstName).toBe('Jane')
    expect(mother.lastName).toBe('Doe')
  })

  it('should find father when relationship uses parentRole field', () => {
    // RED: This test will FAIL because the code uses parentType instead of parentRole
    const { father } = findParentRelationships(childPerson, mockRelationships, mockPeople)

    expect(father).not.toBeNull()
    expect(father.firstName).toBe('John')
    expect(father.lastName).toBe('Doe')
  })

  it('should return null for mother when no mother relationship exists', () => {
    const relationshipsWithoutMother = [
      {
        type: 'parentOf',
        person1Id: 2,
        person2Id: 3,
        parentRole: 'father'
      }
    ]

    const { mother } = findParentRelationships(childPerson, relationshipsWithoutMother, mockPeople)
    expect(mother).toBeNull()
  })

  it('should return null for father when no father relationship exists', () => {
    const relationshipsWithoutFather = [
      {
        type: 'parentOf',
        person1Id: 1,
        person2Id: 3,
        parentRole: 'mother'
      }
    ]

    const { father } = findParentRelationships(childPerson, relationshipsWithoutFather, mockPeople)
    expect(father).toBeNull()
  })

  it('should handle empty relationships array', () => {
    const { mother, father } = findParentRelationships(childPerson, [], mockPeople)

    expect(mother).toBeNull()
    expect(father).toBeNull()
  })

  it('should handle null person', () => {
    const { mother, father } = findParentRelationships(null, mockRelationships, mockPeople)

    expect(mother).toBeNull()
    expect(father).toBeNull()
  })

  it('should correctly identify parent using parentRole with mixed relationships', () => {
    // Test with a more complex scenario including siblings
    const complexRelationships = [
      {
        type: 'parentOf',
        person1Id: 1,
        person2Id: 3,
        parentRole: 'mother'
      },
      {
        type: 'parentOf',
        person1Id: 2,
        person2Id: 3,
        parentRole: 'father'
      },
      {
        type: 'parentOf',
        person1Id: 1,
        person2Id: 4,  // Another child
        parentRole: 'mother'
      }
    ]

    const { mother, father } = findParentRelationships(childPerson, complexRelationships, mockPeople)

    expect(mother).not.toBeNull()
    expect(mother.id).toBe(1)
    expect(father).not.toBeNull()
    expect(father.id).toBe(2)
  })
})

describe('PersonForm - Edge Cases', () => {
  it('should not confuse parentRole with other relationship fields', () => {
    // Ensure we only match on the correct parentRole field
    const mockPeople = [
      { id: 1, firstName: 'Jane', lastName: 'Doe' },
      { id: 3, firstName: 'Alice', lastName: 'Doe' }
    ]

    const relationshipWithWrongField = [
      {
        type: 'parentOf',
        person1Id: 1,
        person2Id: 3,
        parentType: 'mother',  // Wrong field - should not match
        parentRole: 'father'   // Correct field with different value
      }
    ]

    const childPerson = { id: 3, firstName: 'Alice', lastName: 'Doe' }
    const { mother, father } = findParentRelationships(childPerson, relationshipWithWrongField, mockPeople)

    // Should find father (parentRole: 'father'), not mother
    expect(mother).toBeNull()
    expect(father).not.toBeNull()
    expect(father.id).toBe(1)
  })
})
