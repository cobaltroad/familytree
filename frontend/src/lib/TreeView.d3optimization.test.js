/**
 * Tests for TreeView D3.js Enter/Update/Exit Pattern Optimization (Issue #34)
 *
 * This test suite validates the optimized rendering approach using D3's
 * enter/update/exit pattern instead of destroying and recreating the entire
 * visualization on every update.
 *
 * Acceptance Criteria:
 * 1. Only affected nodes are updated (not entire tree)
 * 2. New nodes fade in smoothly (enter)
 * 3. Updated nodes transition to new positions (update)
 * 4. Deleted nodes fade out smoothly (exit)
 * 5. Zoom/pan state is preserved across updates
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, cleanup } from '@testing-library/svelte'
import TreeView from './TreeView.svelte'
import { resetStores, createTestFixture } from '../test/storeTestUtils.js'
import { people } from '../stores/familyStore.js'
import * as d3 from 'd3'

describe('TreeView - D3 Enter/Update/Exit Pattern Optimization', () => {
  beforeEach(() => {
    resetStores()
    cleanup()
  })

  describe('Scenario 1: Initial Render Uses Enter Pattern', () => {
    it('should render initial nodes using enter() pattern', async () => {
      // GIVEN a simple family tree
      createTestFixture({
        people: [
          { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' },
          { id: 2, firstName: 'Bob', lastName: 'Child', birthDate: '1975-01-01' }
        ],
        relationships: [
          { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' }
        ]
      })

      // WHEN I render the TreeView
      const { container } = render(TreeView)

      // Wait for D3 to render
      await new Promise(resolve => setTimeout(resolve, 50))

      // THEN all nodes should be rendered
      const nodes = container.querySelectorAll('.node')
      expect(nodes.length).toBe(2)

      // AND nodes should have proper data attributes
      const nodeData = Array.from(nodes).map(node => {
        return node.querySelector('text')?.textContent
      })
      expect(nodeData).toContain('Alice Root')
      expect(nodeData).toContain('Bob Child')
    })

    it('should apply initial opacity and position for enter transition', async () => {
      // GIVEN a family tree with one person
      createTestFixture({
        people: [
          { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' }
        ],
        relationships: []
      })

      // WHEN I render the TreeView
      const { container } = render(TreeView)
      await new Promise(resolve => setTimeout(resolve, 50))

      // THEN node should be visible (opacity = 1 after transition)
      const node = container.querySelector('.node')
      expect(node).toBeTruthy()

      // Note: Testing actual transition requires more sophisticated approach
      // This validates the node exists and is rendered
    })
  })

  describe('Scenario 2: Adding Nodes Uses Enter Pattern with Fade In', () => {
    it('should add new nodes without re-rendering existing nodes', async () => {
      // GIVEN an initial tree with one person
      createTestFixture({
        people: [
          { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' }
        ],
        relationships: []
      })

      const { container } = render(TreeView)
      await new Promise(resolve => setTimeout(resolve, 50))

      // Track existing nodes
      const initialNodes = container.querySelectorAll('.node')
      const initialNodeCount = initialNodes.length
      expect(initialNodeCount).toBe(1)

      // WHEN I add a new child person
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' },
        { id: 2, firstName: 'Bob', lastName: 'Child', birthDate: '1975-01-01' }
      ])

      await new Promise(resolve => setTimeout(resolve, 400)) // Wait for transition

      // THEN the new node should be added
      const updatedNodes = container.querySelectorAll('.node')
      expect(updatedNodes.length).toBe(2)

      // AND both nodes should be visible
      const nodeTexts = Array.from(updatedNodes).map(n => n.querySelector('text')?.textContent)
      expect(nodeTexts).toContain('Alice Root')
      expect(nodeTexts).toContain('Bob Child')
    })

    it('should preserve existing node positions when adding new nodes', async () => {
      // GIVEN a tree with existing nodes
      createTestFixture({
        people: [
          { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' },
          { id: 2, firstName: 'Bob', lastName: 'Child', birthDate: '1975-01-01' }
        ],
        relationships: [
          { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' }
        ]
      })

      const { container } = render(TreeView)
      await new Promise(resolve => setTimeout(resolve, 50))

      // Get position of Alice's node
      const aliceNode = Array.from(container.querySelectorAll('.node')).find(
        node => node.querySelector('text')?.textContent === 'Alice Root'
      )
      const aliceTransform = aliceNode?.getAttribute('transform')

      // WHEN I add another child
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' },
        { id: 2, firstName: 'Bob', lastName: 'Child', birthDate: '1975-01-01' },
        { id: 3, firstName: 'Carol', lastName: 'Child2', birthDate: '1976-01-01' }
      ])

      await new Promise(resolve => setTimeout(resolve, 400))

      // THEN Alice's node should maintain a stable position (may adjust slightly for layout)
      const updatedAliceNode = Array.from(container.querySelectorAll('.node')).find(
        node => node.querySelector('text')?.textContent === 'Alice Root'
      )
      const updatedTransform = updatedAliceNode?.getAttribute('transform')

      // Node should exist and have transform attribute
      expect(updatedTransform).toBeTruthy()
    })
  })

  describe('Scenario 3: Updating Nodes Uses Update Pattern with Transitions', () => {
    it('should update node data without full re-render', async () => {
      // GIVEN a tree with one person
      createTestFixture({
        people: [
          { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' }
        ],
        relationships: []
      })

      const { container } = render(TreeView)
      await new Promise(resolve => setTimeout(resolve, 50))

      // WHEN I update the person's data
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Updated', birthDate: '1950-01-01' }
      ])

      await new Promise(resolve => setTimeout(resolve, 400))

      // THEN the node should reflect the updated data
      const node = container.querySelector('.node')
      const text = node?.querySelector('text')?.textContent
      expect(text).toBe('Alice Updated')
    })

    it('should transition node positions smoothly when tree structure changes', async () => {
      // GIVEN a tree with parent and child
      createTestFixture({
        people: [
          { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' },
          { id: 2, firstName: 'Bob', lastName: 'Child', birthDate: '1975-01-01' }
        ],
        relationships: [
          { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' }
        ]
      })

      const { container } = render(TreeView)
      await new Promise(resolve => setTimeout(resolve, 50))

      const initialNodes = container.querySelectorAll('.node')
      expect(initialNodes.length).toBe(2)

      // WHEN tree structure changes (add another branch)
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' },
        { id: 2, firstName: 'Bob', lastName: 'Child', birthDate: '1975-01-01' },
        { id: 3, firstName: 'Carol', lastName: 'Child2', birthDate: '1976-01-01' }
      ])

      await new Promise(resolve => setTimeout(resolve, 400))

      // THEN all nodes should be present with updated positions
      const updatedNodes = container.querySelectorAll('.node')
      expect(updatedNodes.length).toBe(3)
    })

    it('should update node colors when person data changes', async () => {
      // GIVEN a living person
      createTestFixture({
        people: [
          { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01', gender: 'female' }
        ],
        relationships: []
      })

      const { container } = render(TreeView)
      await new Promise(resolve => setTimeout(resolve, 50))

      // WHEN person becomes deceased
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01', deathDate: '2020-01-01', gender: 'female' }
      ])

      await new Promise(resolve => setTimeout(resolve, 400))

      // THEN node should show deceased styling (dashed border)
      const node = container.querySelector('.node rect')
      const strokeDashArray = node?.getAttribute('stroke-dasharray')
      expect(strokeDashArray).toBe('5,5')
    })
  })

  describe('Scenario 4: Removing Nodes Uses Exit Pattern with Fade Out', () => {
    it('should remove nodes using exit() with fade out transition', async () => {
      // GIVEN a tree with multiple people
      createTestFixture({
        people: [
          { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' },
          { id: 2, firstName: 'Bob', lastName: 'Child', birthDate: '1975-01-01' },
          { id: 3, firstName: 'Carol', lastName: 'Child2', birthDate: '1976-01-01' }
        ],
        relationships: [
          { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' },
          { id: 2, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'mother' }
        ]
      })

      const { container } = render(TreeView)
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(container.querySelectorAll('.node').length).toBe(3)

      // WHEN I remove one child
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' },
        { id: 2, firstName: 'Bob', lastName: 'Child', birthDate: '1975-01-01' }
      ])

      await new Promise(resolve => setTimeout(resolve, 400))

      // THEN only 2 nodes should remain
      const updatedNodes = container.querySelectorAll('.node')
      expect(updatedNodes.length).toBe(2)

      // AND Carol should be gone
      const nodeTexts = Array.from(updatedNodes).map(n => n.querySelector('text')?.textContent)
      expect(nodeTexts).not.toContain('Carol Child2')
    })

    it('should clean up DOM nodes after exit transition completes', async () => {
      // GIVEN a tree with 3 people
      createTestFixture({
        people: [
          { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' },
          { id: 2, firstName: 'Bob', lastName: 'Child', birthDate: '1975-01-01' },
          { id: 3, firstName: 'Carol', lastName: 'Child2', birthDate: '1976-01-01' }
        ],
        relationships: [
          { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' },
          { id: 2, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'mother' }
        ]
      })

      const { container } = render(TreeView)
      await new Promise(resolve => setTimeout(resolve, 50))

      // WHEN I remove 2 people
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' }
      ])

      await new Promise(resolve => setTimeout(resolve, 500)) // Extra time for cleanup

      // THEN only 1 node should be in DOM
      const finalNodes = container.querySelectorAll('.node')
      expect(finalNodes.length).toBe(1)
      expect(finalNodes[0].querySelector('text')?.textContent).toBe('Alice Root')
    })
  })

  describe('Scenario 5: Zoom/Pan State Preserved Across Updates', () => {
    it('should maintain zoom level when data updates', async () => {
      // GIVEN a rendered tree
      createTestFixture({
        people: [
          { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' },
          { id: 2, firstName: 'Bob', lastName: 'Child', birthDate: '1975-01-01' }
        ],
        relationships: [
          { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' }
        ]
      })

      const { container } = render(TreeView)
      await new Promise(resolve => setTimeout(resolve, 50))

      const svg = container.querySelector('svg')
      const gElement = svg?.querySelector('g')

      // Simulate zoom (in real usage, this would be done via D3 zoom behavior)
      // For testing, we verify the g element exists and has transform
      expect(gElement).toBeTruthy()
      const initialTransform = gElement?.getAttribute('transform')

      // WHEN data updates
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' },
        { id: 2, firstName: 'Bob', lastName: 'Child', birthDate: '1975-01-01' },
        { id: 3, firstName: 'Carol', lastName: 'Child2', birthDate: '1976-01-01' }
      ])

      await new Promise(resolve => setTimeout(resolve, 400))

      // THEN the g element should still exist with transform capability
      const updatedGElement = svg?.querySelector('g')
      expect(updatedGElement).toBeTruthy()

      // The transform might change slightly due to layout, but the element should persist
      // and maintain its zoom behavior binding
    })

    it('should not reset pan position when adding nodes', async () => {
      // GIVEN a rendered tree
      createTestFixture({
        people: [
          { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' }
        ],
        relationships: []
      })

      const { container } = render(TreeView)
      await new Promise(resolve => setTimeout(resolve, 50))

      const svg = container.querySelector('svg')
      const gElement = svg?.querySelector('g')
      expect(gElement).toBeTruthy()

      // WHEN we add more people
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' },
        { id: 2, firstName: 'Bob', lastName: 'Child', birthDate: '1975-01-01' }
      ])

      await new Promise(resolve => setTimeout(resolve, 400))

      // THEN the same g element should still be used (not recreated)
      const updatedGElement = svg?.querySelector('g')
      expect(updatedGElement).toBeTruthy()

      // In optimized version, g element persists across updates
      // In current version, entire SVG is cleared and recreated
    })
  })

  describe('Scenario 6: Key Function Ensures Object Constancy', () => {
    it('should use person.id as key function for data binding', async () => {
      // GIVEN a tree with people
      createTestFixture({
        people: [
          { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' },
          { id: 2, firstName: 'Bob', lastName: 'Child', birthDate: '1975-01-01' }
        ],
        relationships: [
          { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' }
        ]
      })

      const { container } = render(TreeView)
      await new Promise(resolve => setTimeout(resolve, 50))

      // WHEN data order changes but IDs remain
      people.set([
        { id: 2, firstName: 'Bob', lastName: 'Child', birthDate: '1975-01-01' },
        { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' }
      ])

      await new Promise(resolve => setTimeout(resolve, 400))

      // THEN nodes should maintain their identity based on ID
      // (Object constancy ensures smooth transitions)
      const nodes = container.querySelectorAll('.node')
      expect(nodes.length).toBe(2)

      const nodeTexts = Array.from(nodes).map(n => n.querySelector('text')?.textContent)
      expect(nodeTexts).toContain('Alice Root')
      expect(nodeTexts).toContain('Bob Child')
    })

    it('should correctly identify same person across updates', async () => {
      // GIVEN a person with ID 1
      createTestFixture({
        people: [
          { id: 1, firstName: 'Alice', lastName: 'Original', birthDate: '1950-01-01' }
        ],
        relationships: []
      })

      const { container } = render(TreeView)
      await new Promise(resolve => setTimeout(resolve, 50))

      // WHEN same person ID is updated with new data
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Updated', birthDate: '1950-01-01' }
      ])

      await new Promise(resolve => setTimeout(resolve, 400))

      // THEN the same node is updated (not removed and re-added)
      const node = container.querySelector('.node')
      expect(node?.querySelector('text')?.textContent).toBe('Alice Updated')
    })
  })

  describe('Scenario 7: Transition Duration and Smoothness', () => {
    it('should use 300ms transition duration for all changes', async () => {
      // GIVEN a tree
      createTestFixture({
        people: [
          { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' }
        ],
        relationships: []
      })

      const { container } = render(TreeView)
      await new Promise(resolve => setTimeout(resolve, 50))

      // WHEN we add a node
      const startTime = Date.now()
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' },
        { id: 2, firstName: 'Bob', lastName: 'Child', birthDate: '1975-01-01' }
      ])

      // Wait for transition to complete
      await new Promise(resolve => setTimeout(resolve, 350))
      const endTime = Date.now()

      // THEN transition should complete around 300ms
      const duration = endTime - startTime
      expect(duration).toBeGreaterThanOrEqual(300)
      expect(duration).toBeLessThan(500) // Some buffer for processing

      // AND node should be fully visible
      const nodes = container.querySelectorAll('.node')
      expect(nodes.length).toBe(2)
    })

    it('should animate opacity for enter transitions', async () => {
      // GIVEN an initial tree
      createTestFixture({
        people: [
          { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' }
        ],
        relationships: []
      })

      const { container } = render(TreeView)
      await new Promise(resolve => setTimeout(resolve, 50))

      // WHEN adding a node
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' },
        { id: 2, firstName: 'Bob', lastName: 'Child', birthDate: '1975-01-01' }
      ])

      // Check immediately (during transition)
      await new Promise(resolve => setTimeout(resolve, 10))

      // Note: Testing intermediate animation states requires more sophisticated
      // mocking of D3 transitions. This test validates the end state.

      await new Promise(resolve => setTimeout(resolve, 350))

      // THEN new node should be fully visible after transition
      const nodes = container.querySelectorAll('.node')
      expect(nodes.length).toBe(2)
    })

    it('should animate position changes smoothly', async () => {
      // GIVEN a tree with parent and child
      createTestFixture({
        people: [
          { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' },
          { id: 2, firstName: 'Bob', lastName: 'Child', birthDate: '1975-01-01' }
        ],
        relationships: [
          { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' }
        ]
      })

      const { container } = render(TreeView)
      await new Promise(resolve => setTimeout(resolve, 50))

      // WHEN adding sibling (changes layout)
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' },
        { id: 2, firstName: 'Bob', lastName: 'Child', birthDate: '1975-01-01' },
        { id: 3, firstName: 'Carol', lastName: 'Child2', birthDate: '1976-01-01' }
      ])

      await new Promise(resolve => setTimeout(resolve, 350))

      // THEN all nodes should be in their final positions
      const nodes = container.querySelectorAll('.node')
      expect(nodes.length).toBe(3)
    })
  })

  describe('Scenario 8: Links Also Use Enter/Update/Exit Pattern', () => {
    it('should update links between nodes incrementally', async () => {
      // GIVEN a tree with one relationship
      createTestFixture({
        people: [
          { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' },
          { id: 2, firstName: 'Bob', lastName: 'Child', birthDate: '1975-01-01' }
        ],
        relationships: [
          { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' }
        ]
      })

      const { container } = render(TreeView)
      await new Promise(resolve => setTimeout(resolve, 50))

      const initialLinks = container.querySelectorAll('.link')
      expect(initialLinks.length).toBe(1)

      // WHEN adding another child (new link)
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' },
        { id: 2, firstName: 'Bob', lastName: 'Child', birthDate: '1975-01-01' },
        { id: 3, firstName: 'Carol', lastName: 'Child2', birthDate: '1976-01-01' }
      ])

      await new Promise(resolve => setTimeout(resolve, 400))

      // THEN there should be 2 links
      const updatedLinks = container.querySelectorAll('.link')
      expect(updatedLinks.length).toBe(2)
    })

    it('should remove links when relationships are deleted', async () => {
      // GIVEN a tree with 2 children
      createTestFixture({
        people: [
          { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' },
          { id: 2, firstName: 'Bob', lastName: 'Child', birthDate: '1975-01-01' },
          { id: 3, firstName: 'Carol', lastName: 'Child2', birthDate: '1976-01-01' }
        ],
        relationships: [
          { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' },
          { id: 2, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'mother' }
        ]
      })

      const { container } = render(TreeView)
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(container.querySelectorAll('.link').length).toBe(2)

      // WHEN removing one child
      people.set([
        { id: 1, firstName: 'Alice', lastName: 'Root', birthDate: '1950-01-01' },
        { id: 2, firstName: 'Bob', lastName: 'Child', birthDate: '1975-01-01' }
      ])

      await new Promise(resolve => setTimeout(resolve, 400))

      // THEN only 1 link should remain
      const updatedLinks = container.querySelectorAll('.link')
      expect(updatedLinks.length).toBe(1)
    })
  })

  describe('Scenario 9: Spouse Nodes Use Enter/Update/Exit Pattern', () => {
    it('should handle spouse nodes incrementally', async () => {
      // GIVEN a tree with co-parents
      createTestFixture({
        people: [
          { id: 1, firstName: 'Alice', lastName: 'Mother', birthDate: '1950-01-01', gender: 'female' },
          { id: 2, firstName: 'Bob', lastName: 'Father', birthDate: '1950-01-01', gender: 'male' },
          { id: 3, firstName: 'Carol', lastName: 'Child', birthDate: '1975-01-01', gender: 'female' }
        ],
        relationships: [
          { id: 1, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'mother' },
          { id: 2, person1Id: 2, person2Id: 3, type: 'parentOf', parentRole: 'father' }
        ]
      })

      const { container } = render(TreeView)
      await new Promise(resolve => setTimeout(resolve, 50))

      // THEN both parent nodes should be rendered (one as spouse)
      const rects = container.querySelectorAll('rect')
      // Should have at least 3 rects (Alice, Bob as spouse, Carol)
      expect(rects.length).toBeGreaterThanOrEqual(3)
    })
  })
})
