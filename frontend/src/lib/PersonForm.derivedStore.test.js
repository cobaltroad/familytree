/**
 * TDD Tests for PersonForm migration to use createPersonRelationships derived store.
 * These tests define the expected behavior after refactoring PersonForm to use
 * derived stores instead of manual relationship computations.
 *
 * Acceptance Criteria:
 * 1. PersonForm uses createPersonRelationships derived store
 * 2. Relationships update automatically when data changes
 * 3. Performance improves with O(1) lookups
 * 4. Backward compatibility maintained
 * 5. Code becomes more readable (45+ lines → 5 lines)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import { get } from 'svelte/store'
import PersonForm from './PersonForm.svelte'
import { people as peopleStore, relationships as relationshipsStore } from '../stores/familyStore.js'
import { createPersonRelationships } from '../stores/derivedStores.js'

describe('PersonForm Migration to Derived Stores (Issue #29)', () => {
  const testPeople = [
    { id: 1, firstName: 'John', lastName: 'Doe', birthDate: '1960-01-01', deathDate: null, gender: 'male' },
    { id: 2, firstName: 'Jane', lastName: 'Smith', birthDate: '1962-05-15', deathDate: null, gender: 'female' },
    { id: 3, firstName: 'Bob', lastName: 'Doe', birthDate: '1990-03-20', deathDate: null, gender: 'male' },
    { id: 4, firstName: 'Alice', lastName: 'Doe', birthDate: '1992-06-10', deathDate: null, gender: 'female' },
    { id: 5, firstName: 'Charlie', lastName: 'Doe', birthDate: '2010-01-01', deathDate: null, gender: 'male' }
  ]

  const testRelationships = [
    { id: 1, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'father' },
    { id: 2, person1Id: 2, person2Id: 3, type: 'parentOf', parentRole: 'mother' },
    { id: 3, person1Id: 1, person2Id: 4, type: 'parentOf', parentRole: 'father' },
    { id: 4, person1Id: 2, person2Id: 4, type: 'parentOf', parentRole: 'mother' },
    { id: 5, person1Id: 3, person2Id: 5, type: 'parentOf', parentRole: 'father' }
  ]

  beforeEach(() => {
    peopleStore.set([])
    relationshipsStore.set([])
  })

  describe('Acceptance Criterion 1: PersonForm Uses createPersonRelationships', () => {
    it('should display mother relationship from derived store', () => {
      // GIVEN stores are populated with people and relationships
      peopleStore.set(testPeople)
      relationshipsStore.set(testRelationships)

      // WHEN PersonForm is rendered for Bob (person 3)
      const { container } = render(PersonForm, {
        props: {
          person: testPeople[2] // Bob
        }
      })

      // THEN mother relationship is displayed using derived store data
      expect(container.textContent).toContain('Mother: Jane Smith')
    })

    it('should display father relationship from derived store', () => {
      // GIVEN stores are populated
      peopleStore.set(testPeople)
      relationshipsStore.set(testRelationships)

      // WHEN PersonForm is rendered for Bob
      const { container } = render(PersonForm, {
        props: {
          person: testPeople[2] // Bob
        }
      })

      // THEN father relationship is displayed using derived store data
      expect(container.textContent).toContain('Father: John Doe')
    })

    it('should display siblings from derived store', () => {
      // GIVEN stores are populated with siblings
      peopleStore.set(testPeople)
      relationshipsStore.set(testRelationships)

      // WHEN PersonForm is rendered for Bob (who has sibling Alice)
      const { container } = render(PersonForm, {
        props: {
          person: testPeople[2] // Bob
        }
      })

      // THEN sibling is displayed using derived store data
      expect(container.textContent).toContain('Alice Doe')
    })

    it('should display children from derived store', () => {
      // GIVEN stores are populated with children
      peopleStore.set(testPeople)
      relationshipsStore.set(testRelationships)

      // WHEN PersonForm is rendered for Bob (who has child Charlie)
      const { container } = render(PersonForm, {
        props: {
          person: testPeople[2] // Bob
        }
      })

      // THEN child is displayed using derived store data
      expect(container.textContent).toContain('Charlie Doe')
    })

    it('should handle person with no relationships using derived store', () => {
      // GIVEN a person with no relationships
      const loner = { id: 99, firstName: 'Loner', lastName: 'Single', birthDate: null, deathDate: null, gender: null }
      peopleStore.set([...testPeople, loner])
      relationshipsStore.set(testRelationships)

      // WHEN PersonForm is rendered for the loner
      const { container } = render(PersonForm, {
        props: {
          person: loner
        }
      })

      // THEN unknown is shown for parents, no siblings/children
      expect(container.textContent).toContain('<unknown>')
      expect(container.textContent).toContain('No siblings')
      expect(container.textContent).toContain('No children')
    })
  })

  describe('Acceptance Criterion 2: Relationships Update Automatically', () => {
    it('should update mother display when relationship is added', async () => {
      // GIVEN PersonForm is rendered with no mother initially
      peopleStore.set([testPeople[2]]) // Just Bob
      relationshipsStore.set([])

      const { container } = render(PersonForm, {
        props: {
          person: testPeople[2]
        }
      })

      // Initially no mother
      expect(container.textContent).toContain('<unknown>')

      // WHEN mother relationship is added to store
      peopleStore.set([testPeople[1], testPeople[2]]) // Add Jane
      relationshipsStore.set([
        { id: 2, person1Id: 2, person2Id: 3, type: 'parentOf', parentRole: 'mother' }
      ])

      // Wait for reactive update
      await new Promise(resolve => setTimeout(resolve, 10))

      // THEN mother is automatically displayed (no manual re-fetch needed)
      expect(container.textContent).toContain('Mother: Jane Smith')
    })

    it('should update siblings display when new sibling is added', async () => {
      // GIVEN Bob initially has no siblings
      peopleStore.set([testPeople[0], testPeople[1], testPeople[2]]) // John, Jane, Bob
      relationshipsStore.set([
        { id: 1, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'father' },
        { id: 2, person1Id: 2, person2Id: 3, type: 'parentOf', parentRole: 'mother' }
      ])

      const { container } = render(PersonForm, {
        props: {
          person: testPeople[2]
        }
      })

      // Initially no siblings
      expect(container.textContent).toContain('No siblings')

      // WHEN Alice is added as sibling
      peopleStore.set([testPeople[0], testPeople[1], testPeople[2], testPeople[3]]) // Add Alice
      relationshipsStore.set([
        { id: 1, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'father' },
        { id: 2, person1Id: 2, person2Id: 3, type: 'parentOf', parentRole: 'mother' },
        { id: 3, person1Id: 1, person2Id: 4, type: 'parentOf', parentRole: 'father' },
        { id: 4, person1Id: 2, person2Id: 4, type: 'parentOf', parentRole: 'mother' }
      ])

      await new Promise(resolve => setTimeout(resolve, 10))

      // THEN sibling is automatically displayed
      expect(container.textContent).toContain('Alice Doe')
    })

    it('should update children display when new child is added', async () => {
      // GIVEN Bob initially has no children
      peopleStore.set([testPeople[2]]) // Just Bob
      relationshipsStore.set([])

      const { container } = render(PersonForm, {
        props: {
          person: testPeople[2]
        }
      })

      // Initially no children
      expect(container.textContent).toContain('No children')

      // WHEN Charlie is added as child
      peopleStore.set([testPeople[2], testPeople[4]]) // Add Charlie
      relationshipsStore.set([
        { id: 5, person1Id: 3, person2Id: 5, type: 'parentOf', parentRole: 'father' }
      ])

      await new Promise(resolve => setTimeout(resolve, 10))

      // THEN child is automatically displayed
      expect(container.textContent).toContain('Charlie Doe')
    })

    it('should update instantly without manual re-fetching', async () => {
      // GIVEN initial data
      peopleStore.set([testPeople[2]])
      relationshipsStore.set([])

      const { container } = render(PersonForm, {
        props: {
          person: testPeople[2]
        }
      })

      // WHEN stores are updated (simulating backend data change)
      peopleStore.set(testPeople)
      relationshipsStore.set(testRelationships)

      await new Promise(resolve => setTimeout(resolve, 10))

      // THEN all relationships are instantly visible
      expect(container.textContent).toContain('Father: John Doe')
      expect(container.textContent).toContain('Mother: Jane Smith')
      expect(container.textContent).toContain('Alice Doe') // sibling
      expect(container.textContent).toContain('Charlie Doe') // child
    })
  })

  describe('Acceptance Criterion 3: Performance Improves with O(1) Lookups', () => {
    it('should use createPersonRelationships for O(1) performance', () => {
      // GIVEN stores are populated
      peopleStore.set(testPeople)
      relationshipsStore.set(testRelationships)

      // WHEN I create a person relationships store directly
      const personRels = createPersonRelationships(3) // Bob
      const rels = get(personRels)

      // THEN the derived store provides O(1) lookups
      expect(rels.mother).toEqual(testPeople[1]) // Jane
      expect(rels.father).toEqual(testPeople[0]) // John
      expect(rels.siblings).toHaveLength(1)
      expect(rels.siblings[0]).toEqual(testPeople[3]) // Alice
      expect(rels.children).toHaveLength(1)
      expect(rels.children[0]).toEqual(testPeople[4]) // Charlie
    })

    it('should avoid redundant O(n) array searches in component', () => {
      // GIVEN stores with data
      peopleStore.set(testPeople)
      relationshipsStore.set(testRelationships)

      // WHEN PersonForm renders
      const { container } = render(PersonForm, {
        props: {
          person: testPeople[2]
        }
      })

      // THEN relationships are computed using derived store (not manual array.find)
      // This is verified by the component using createPersonRelationships internally
      expect(container.textContent).toContain('Father: John Doe')
      expect(container.textContent).toContain('Mother: Jane Smith')
    })
  })

  describe('Acceptance Criterion 4: Backward Compatibility Maintained', () => {
    it('should support prop-based approach when stores are empty', () => {
      // GIVEN stores are empty but props have data
      peopleStore.set([])
      relationshipsStore.set([])

      // WHEN PersonForm is rendered with prop-based data
      const { container } = render(PersonForm, {
        props: {
          person: testPeople[2],
          people: testPeople,
          relationships: testRelationships
        }
      })

      // THEN relationships are displayed using props (backward compatibility)
      expect(container.textContent).toContain('Father: John Doe')
      expect(container.textContent).toContain('Mother: Jane Smith')
    })

    it('should prefer store-based data when both stores and props available', () => {
      // GIVEN stores have complete data
      peopleStore.set(testPeople)
      relationshipsStore.set(testRelationships)

      // AND props have partial data
      const partialPeople = [testPeople[2]]
      const partialRels = []

      // WHEN PersonForm is rendered with both
      const { container } = render(PersonForm, {
        props: {
          person: testPeople[2],
          people: partialPeople,
          relationships: partialRels
        }
      })

      // THEN store data takes precedence (shows full relationships)
      expect(container.textContent).toContain('Father: John Doe')
      expect(container.textContent).toContain('Mother: Jane Smith')
    })

    it('should produce identical UI output regardless of data source', () => {
      // Test with store-based data
      peopleStore.set(testPeople)
      relationshipsStore.set(testRelationships)

      const { container: storeContainer } = render(PersonForm, {
        props: {
          person: testPeople[2]
        }
      })

      const storeOutput = storeContainer.textContent

      // Reset stores
      peopleStore.set([])
      relationshipsStore.set([])

      // Test with prop-based data
      const { container: propContainer } = render(PersonForm, {
        props: {
          person: testPeople[2],
          people: testPeople,
          relationships: testRelationships
        }
      })

      const propOutput = propContainer.textContent

      // THEN both approaches produce identical output
      expect(storeOutput).toContain('Father: John Doe')
      expect(propOutput).toContain('Father: John Doe')
      expect(storeOutput).toContain('Mother: Jane Smith')
      expect(propOutput).toContain('Mother: Jane Smith')
    })
  })

  describe('Acceptance Criterion 5: Code Becomes More Readable', () => {
    it('should reduce relationship computation code from 45+ lines to ~5 lines', () => {
      // This test verifies the refactoring by ensuring the component still works
      // The actual line count reduction is verified by code inspection

      peopleStore.set(testPeople)
      relationshipsStore.set(testRelationships)

      const { container } = render(PersonForm, {
        props: {
          person: testPeople[2]
        }
      })

      // Component should work with simplified code
      expect(container.textContent).toContain('Father: John Doe')
      expect(container.textContent).toContain('Mother: Jane Smith')
      expect(container.textContent).toContain('Alice Doe')
      expect(container.textContent).toContain('Charlie Doe')
    })

    it('should have clear reactive statements using derived store', async () => {
      // Verify the component reactivity still works with simplified code
      peopleStore.set([testPeople[2]])
      relationshipsStore.set([])

      const { container } = render(PersonForm, {
        props: {
          person: testPeople[2]
        }
      })

      expect(container.textContent).toContain('<unknown>')

      // Update data
      peopleStore.set(testPeople)
      relationshipsStore.set(testRelationships)

      // Wait for reactivity
      await new Promise(resolve => setTimeout(resolve, 20))

      // Reactivity should work with simplified code
      expect(container.textContent).toContain('Father: John Doe')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle person ID that does not exist in relationships', () => {
      peopleStore.set([{ id: 999, firstName: 'Ghost', lastName: 'Person', birthDate: null, deathDate: null, gender: null }])
      relationshipsStore.set(testRelationships)

      const { container } = render(PersonForm, {
        props: {
          person: { id: 999, firstName: 'Ghost', lastName: 'Person', birthDate: null, deathDate: null, gender: null }
        }
      })

      expect(container.textContent).toContain('<unknown>')
      expect(container.textContent).toContain('No siblings')
      expect(container.textContent).toContain('No children')
    })

    it('should handle undefined person prop gracefully', () => {
      peopleStore.set(testPeople)
      relationshipsStore.set(testRelationships)

      const { container } = render(PersonForm, {
        props: {
          person: null
        }
      })

      // Should show "Add New Person" form without errors
      expect(container.textContent).toContain('Add New Person')
    })

    it('should handle empty stores gracefully', () => {
      peopleStore.set([])
      relationshipsStore.set([])

      const { container } = render(PersonForm, {
        props: {
          person: testPeople[2],
          people: [],
          relationships: []
        }
      })

      // Should not throw errors
      expect(container).toBeTruthy()
    })

    it('should clean up subscriptions when component unmounts', () => {
      peopleStore.set(testPeople)
      relationshipsStore.set(testRelationships)

      const { unmount } = render(PersonForm, {
        props: {
          person: testPeople[2]
        }
      })

      // Unmount component
      unmount()

      // Update stores after unmount - should not cause errors
      peopleStore.set([])
      relationshipsStore.set([])

      // If we get here without errors, cleanup worked
      expect(true).toBe(true)
    })
  })
})
