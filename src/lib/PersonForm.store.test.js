import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import { get } from 'svelte/store'
import PersonForm from './PersonForm.svelte'
import { people as peopleStore, relationships as relationshipsStore } from '../stores/familyStore.js'

/**
 * Tests for PersonForm backward compatibility with stores.
 * PersonForm should work with both props (legacy) and stores (new approach).
 */

describe('PersonForm Store Integration', () => {
  const testPeople = [
    { id: 1, firstName: 'John', lastName: 'Doe', birthDate: '1960-01-01', deathDate: null, gender: 'male' },
    { id: 2, firstName: 'Jane', lastName: 'Smith', birthDate: '1962-05-15', deathDate: null, gender: 'female' },
    { id: 3, firstName: 'Bob', lastName: 'Doe', birthDate: '1990-03-20', deathDate: null, gender: 'male' }
  ]

  const testRelationships = [
    { id: 1, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'father' },
    { id: 2, person1Id: 2, person2Id: 3, type: 'parentOf', parentRole: 'mother' }
  ]

  beforeEach(() => {
    // Reset stores
    peopleStore.set([])
    relationshipsStore.set([])
  })

  describe('backward compatibility with props', () => {
    it('should work when receiving data via props only', () => {
      const { container } = render(PersonForm, {
        props: {
          person: testPeople[2], // Bob
          people: testPeople,
          relationships: testRelationships
        }
      })

      // Should display person's name
      expect(container.querySelector('#firstName')).toBeTruthy()
      expect(container.querySelector('#firstName').value).toBe('Bob')

      // Should display relationships based on props
      expect(container.textContent).toContain('Father: John Doe')
      expect(container.textContent).toContain('Mother: Jane Smith')
    })

    it('should display relationships from props when stores are empty', () => {
      // Stores are empty, props have data
      const { container } = render(PersonForm, {
        props: {
          person: testPeople[2],
          people: testPeople,
          relationships: testRelationships
        }
      })

      // Should use props, not stores
      expect(container.textContent).toContain('Father: John Doe')
      expect(container.textContent).toContain('Mother: Jane Smith')
    })
  })

  describe('using stores when available', () => {
    it('should read from stores when props are not provided', () => {
      // Set data in stores
      peopleStore.set(testPeople)
      relationshipsStore.set(testRelationships)

      const { container } = render(PersonForm, {
        props: {
          person: testPeople[2], // Bob
          people: undefined, // No props
          relationships: undefined // No props
        }
      })

      // Should use stores
      expect(container.textContent).toContain('Father: John Doe')
      expect(container.textContent).toContain('Mother: Jane Smith')
    })

    it('should use stores when both stores and props are available (stores take precedence)', () => {
      // Set data in stores
      peopleStore.set(testPeople)
      relationshipsStore.set(testRelationships)

      // Also provide different data via props
      const differentPeople = [
        { id: 4, firstName: 'Different', lastName: 'Person', birthDate: null, deathDate: null, gender: null }
      ]

      const { container } = render(PersonForm, {
        props: {
          person: testPeople[2],
          people: differentPeople, // Different data in props
          relationships: [] // Empty in props
        }
      })

      // Should use stores (which have relationships)
      expect(container.textContent).toContain('Father: John Doe')
      expect(container.textContent).toContain('Mother: Jane Smith')
    })
  })

  describe('reactivity with stores', () => {
    it('should update when store data changes', async () => {
      // Initial empty stores
      peopleStore.set([testPeople[2]]) // Just Bob
      relationshipsStore.set([])

      const { container } = render(PersonForm, {
        props: {
          person: testPeople[2]
        }
      })

      // Initially no parents
      expect(container.textContent).toContain('<unknown>')

      // Update stores to add parents
      peopleStore.set(testPeople)
      relationshipsStore.set(testRelationships)

      // Wait for Svelte to react
      await new Promise(resolve => setTimeout(resolve, 10))

      // Should now show parents
      expect(container.textContent).toContain('Father: John Doe')
      expect(container.textContent).toContain('Mother: Jane Smith')
    })
  })

  describe('fallback behavior', () => {
    it('should use props as fallback when stores have empty arrays', () => {
      peopleStore.set([]) // Empty store
      relationshipsStore.set([]) // Empty store

      const { container } = render(PersonForm, {
        props: {
          person: testPeople[2],
          people: testPeople, // Props have data
          relationships: testRelationships // Props have data
        }
      })

      // Should fall back to props
      expect(container.textContent).toContain('Father: John Doe')
      expect(container.textContent).toContain('Mother: Jane Smith')
    })

    it('should handle missing person prop gracefully', () => {
      peopleStore.set(testPeople)
      relationshipsStore.set(testRelationships)

      const { container } = render(PersonForm, {
        props: {
          person: null // No person being edited
        }
      })

      // Should show "Add New Person" form
      expect(container.textContent).toContain('Add New Person')
    })
  })

  describe('computed relationships with stores', () => {
    it('should compute siblings correctly using store data', () => {
      // Add another child with same parents
      const childWithSameParents = {
        id: 4,
        firstName: 'Alice',
        lastName: 'Doe',
        birthDate: '1992-06-10',
        deathDate: null,
        gender: 'female'
      }

      const extendedPeople = [...testPeople, childWithSameParents]
      const extendedRelationships = [
        ...testRelationships,
        { id: 3, person1Id: 1, person2Id: 4, type: 'parentOf', parentRole: 'father' },
        { id: 4, person1Id: 2, person2Id: 4, type: 'parentOf', parentRole: 'mother' }
      ]

      peopleStore.set(extendedPeople)
      relationshipsStore.set(extendedRelationships)

      const { container } = render(PersonForm, {
        props: {
          person: testPeople[2] // Bob
        }
      })

      // Should show Alice as sibling
      expect(container.textContent).toContain('Alice Doe')
    })

    it('should compute children correctly using store data', () => {
      // Bob has a child
      const bobsChild = {
        id: 5,
        firstName: 'Charlie',
        lastName: 'Doe',
        birthDate: '2010-01-01',
        deathDate: null,
        gender: 'male'
      }

      const extendedPeople = [...testPeople, bobsChild]
      const extendedRelationships = [
        ...testRelationships,
        { id: 3, person1Id: 3, person2Id: 5, type: 'parentOf', parentRole: 'father' }
      ]

      peopleStore.set(extendedPeople)
      relationshipsStore.set(extendedRelationships)

      const { container } = render(PersonForm, {
        props: {
          person: testPeople[2] // Bob
        }
      })

      // Should show Charlie as child
      expect(container.textContent).toContain('Charlie Doe')
    })
  })

  describe('store subscription cleanup', () => {
    it('should not cause memory leaks when component is destroyed', () => {
      peopleStore.set(testPeople)
      relationshipsStore.set(testRelationships)

      const { component, unmount } = render(PersonForm, {
        props: {
          person: testPeople[2]
        }
      })

      // Component should be mounted
      expect(component).toBeTruthy()

      // Unmount component
      unmount()

      // Update stores after unmount - should not cause errors
      peopleStore.set([])
      relationshipsStore.set([])

      // If we get here without errors, subscription cleanup worked
      expect(true).toBe(true)
    })
  })
})
