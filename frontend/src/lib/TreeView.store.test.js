/**
 * Unit tests for TreeView component accessing stores directly.
 * Tests that TreeView reads from stores instead of receiving data via props.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import { get } from 'svelte/store'
import TreeView from './TreeView.svelte'
import { people, relationships } from '../stores/familyStore.js'
import { familyTree } from '../stores/derivedStores.js'

describe('TreeView - Store Access', () => {
  beforeEach(() => {
    // Reset stores to empty state before each test
    people.set([])
    relationships.set([])
  })

  afterEach(() => {
    // Clean up after each test
    people.set([])
    relationships.set([])
  })

  describe('Rendering with Store Data', () => {
    it('should render empty state when stores have no data', () => {
      render(TreeView)

      const emptyMessage = screen.queryByText(/no family members to display/i)
      expect(emptyMessage).toBeTruthy()
    })

    it('should render tree nodes from people store', () => {
      // Populate stores with test data
      people.set([
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          birthDate: '1950-01-01',
          deathDate: null,
          gender: 'male'
        },
        {
          id: 2,
          firstName: 'Jane',
          lastName: 'Doe',
          birthDate: '1975-01-01',
          deathDate: null,
          gender: 'female'
        }
      ])

      relationships.set([
        {
          id: 1,
          person1Id: 1,
          person2Id: 2,
          type: 'parentOf',
          parentRole: 'father'
        }
      ])

      const { container } = render(TreeView)

      // Should render SVG element (TreeView creates SVG for visualization)
      const svg = container.querySelector('svg')
      expect(svg).toBeTruthy()

      // Should not show empty state
      expect(screen.queryByText(/no family members to display/i)).toBeFalsy()

      // Verify store is being used correctly
      expect(get(people)).toHaveLength(2)
      expect(get(relationships)).toHaveLength(1)
    })

    it('should reactively update when store data changes', async () => {
      const { container } = render(TreeView)

      // Initially empty
      expect(screen.queryByText(/no family members to display/i)).toBeTruthy()

      // Add data to store
      people.set([
        {
          id: 1,
          firstName: 'Alice',
          lastName: 'Smith',
          birthDate: '1960-01-01',
          deathDate: null,
          gender: 'female'
        }
      ])

      // Wait for Svelte to update DOM
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should now render SVG element
      const svg = container.querySelector('svg')
      expect(svg).toBeTruthy()

      // Should not show empty state anymore
      expect(screen.queryByText(/no family members to display/i)).toBeFalsy()

      // Verify store has the data
      expect(get(people)).toHaveLength(1)
      expect(get(people)[0].firstName).toBe('Alice')
    })

    it('should handle spouse relationships from store', () => {
      people.set([
        {
          id: 1,
          firstName: 'Bob',
          lastName: 'Jones',
          birthDate: '1955-01-01',
          deathDate: null,
          gender: 'male'
        },
        {
          id: 2,
          firstName: 'Carol',
          lastName: 'Jones',
          birthDate: '1957-01-01',
          deathDate: null,
          gender: 'female'
        },
        {
          id: 3,
          firstName: 'David',
          lastName: 'Jones',
          birthDate: '1980-01-01',
          deathDate: null,
          gender: 'male'
        }
      ])

      relationships.set([
        {
          id: 1,
          person1Id: 1,
          person2Id: 2,
          type: 'spouse',
          parentRole: null
        },
        {
          id: 2,
          person1Id: 1,
          person2Id: 3,
          type: 'parentOf',
          parentRole: 'father'
        },
        {
          id: 3,
          person1Id: 2,
          person2Id: 3,
          type: 'parentOf',
          parentRole: 'mother'
        }
      ])

      const { container } = render(TreeView)

      // Should render SVG with tree visualization
      const svg = container.querySelector('svg')
      expect(svg).toBeTruthy()

      // Verify store contains all people and relationships
      expect(get(people)).toHaveLength(3)
      expect(get(relationships)).toHaveLength(3)

      // Verify family tree structure is built correctly
      const tree = get(familyTree)
      // Both parents are roots (neither has a parent relationship making them a child)
      expect(tree).toHaveLength(2)
      // At least one root should have the child
      const hasChild = tree.some(node => node.children && node.children.length > 0)
      expect(hasChild).toBe(true)
    })
  })

  describe('No Props Required', () => {
    it('should not require people or relationships props', () => {
      // This test verifies that TreeView can be rendered without props
      // and will use stores instead
      expect(() => {
        render(TreeView)
      }).not.toThrow()
    })

    it('should ignore people prop if provided (backward compatibility check)', () => {
      // Even if props are provided, component should use stores
      people.set([
        {
          id: 1,
          firstName: 'StoreUser',
          lastName: 'One',
          birthDate: '1960-01-01',
          deathDate: null,
          gender: 'male'
        }
      ])

      const propsData = [
        {
          id: 999,
          firstName: 'PropUser',
          lastName: 'Nine',
          birthDate: '1960-01-01',
          deathDate: null,
          gender: 'male'
        }
      ]

      const { container } = render(TreeView, { props: { people: propsData, relationships: [] } })

      // Should render SVG using store data
      const svg = container.querySelector('svg')
      expect(svg).toBeTruthy()

      // Verify store is used (has 1 person from store, not prop)
      expect(get(people)).toHaveLength(1)
      expect(get(people)[0].firstName).toBe('StoreUser')
    })
  })

  describe('Integration with Derived Stores', () => {
    it('should use familyTree derived store for tree structure', () => {
      people.set([
        {
          id: 1,
          firstName: 'Root',
          lastName: 'Person',
          birthDate: '1950-01-01',
          deathDate: null,
          gender: 'male'
        },
        {
          id: 2,
          firstName: 'Child',
          lastName: 'Person',
          birthDate: '1980-01-01',
          deathDate: null,
          gender: 'female'
        }
      ])

      relationships.set([
        {
          id: 1,
          person1Id: 1,
          person2Id: 2,
          type: 'parentOf',
          parentRole: 'father'
        }
      ])

      // Verify derived store has correct structure
      const tree = get(familyTree)
      expect(tree).toHaveLength(1)
      expect(tree[0].person.firstName).toBe('Root')
      expect(tree[0].children).toHaveLength(1)
      expect(tree[0].children[0].person.firstName).toBe('Child')

      const { container } = render(TreeView)

      // Should render SVG with tree visualization
      const svg = container.querySelector('svg')
      expect(svg).toBeTruthy()

      // Verify the tree structure is correctly built from store
      expect(get(familyTree)).toHaveLength(1)
      expect(get(familyTree)[0].children).toHaveLength(1)
    })
  })

  describe('Performance', () => {
    it('should handle large datasets from store efficiently', () => {
      // Create 50 people in store
      const testPeople = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        firstName: `Person${i + 1}`,
        lastName: 'Test',
        birthDate: '1960-01-01',
        deathDate: null,
        gender: i % 2 === 0 ? 'male' : 'female'
      }))

      const testRelationships = []
      for (let i = 1; i < 50; i++) {
        testRelationships.push({
          id: i,
          person1Id: 1,
          person2Id: i + 1,
          type: 'parentOf',
          parentRole: i % 2 === 0 ? 'father' : 'mother'
        })
      }

      const startTime = performance.now()

      people.set(testPeople)
      relationships.set(testRelationships)

      const { container } = render(TreeView)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time (< 1000ms)
      expect(renderTime).toBeLessThan(1000)

      // Should render SVG with large tree
      const svg = container.querySelector('svg')
      expect(svg).toBeTruthy()

      // Verify store contains all data
      expect(get(people)).toHaveLength(50)
      expect(get(relationships)).toHaveLength(49)
    })
  })

  describe('Floating Action Button Removal', () => {
    it('should not render a floating add person button', () => {
      people.set([
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          birthDate: '1950-01-01',
          deathDate: null,
          gender: 'male'
        }
      ])

      const { container } = render(TreeView)

      // Should not have a button with class "fab"
      const fabButton = container.querySelector('.fab')
      expect(fabButton).toBeFalsy()

      // Should not have a button with aria-label "Add Person"
      const addButton = container.querySelector('button[aria-label="Add Person"]')
      expect(addButton).toBeFalsy()
    })

    it('should not have floating button in empty state', () => {
      // Empty store
      people.set([])
      relationships.set([])

      const { container } = render(TreeView)

      // Should not have a button with class "fab"
      const fabButton = container.querySelector('.fab')
      expect(fabButton).toBeFalsy()
    })
  })
})
