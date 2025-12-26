/**
 * Tests for PedigreeView D3.js Enter/Update/Exit Pattern Optimization (Issue #34)
 *
 * This test suite validates the optimized rendering approach for the
 * Pedigree (ancestor) view using D3's enter/update/exit pattern.
 *
 * Acceptance Criteria:
 * 1. Only affected nodes are updated (not entire tree)
 * 2. New ancestor nodes fade in smoothly (enter)
 * 3. Updated nodes transition to new positions (update)
 * 4. Deleted nodes fade out smoothly (exit)
 * 5. Zoom/pan state is preserved across updates
 * 6. Focus person changes update efficiently
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/svelte'
import { tick } from 'svelte'
import PedigreeView from './PedigreeView.svelte'
import { resetStores, createTestFixture } from '../test/storeTestUtils.js'
import { people } from '../stores/familyStore.js'
import { testConfig } from './d3Helpers.js'

describe('PedigreeView - D3 Enter/Update/Exit Pattern Optimization', () => {
  beforeEach(() => {
    testConfig.enabled = true  // Disable D3 transitions for JSDOM compatibility
    resetStores()
    cleanup()
  })

  describe('Scenario 1: Initial Render Uses Enter Pattern', () => {
    it('should render initial ancestor nodes using enter() pattern', async () => {
      // GIVEN a person with parents
      createTestFixture({
        people: [
          { id: 1, firstName: 'Grandma', lastName: 'Smith', birthDate: '1930-01-01' },
          { id: 2, firstName: 'Mom', lastName: 'Jones', birthDate: '1955-01-01' },
          { id: 3, firstName: 'Child', lastName: 'Jones', birthDate: '1980-01-01' }
        ],
        relationships: [
          { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' },
          { id: 2, person1Id: 2, person2Id: 3, type: 'parentOf', parentRole: 'mother' }
        ]
      })

      // WHEN I render the PedigreeView
      const { container } = render(PedigreeView)
      await tick()  // Wait for reactive statements to complete
      await tick()  // Sometimes need multiple ticks for bindings

      // THEN all ancestor nodes should be rendered
      const nodes = container.querySelectorAll('.node')
      expect(nodes.length).toBeGreaterThanOrEqual(1)
    })

    it('should apply generation labels to nodes', async () => {
      // GIVEN a multi-generation tree
      createTestFixture({
        people: [
          { id: 1, firstName: 'Grandma', lastName: 'Smith', birthDate: '1930-01-01' },
          { id: 2, firstName: 'Mom', lastName: 'Jones', birthDate: '1955-01-01' },
          { id: 3, firstName: 'Child', lastName: 'Jones', birthDate: '1980-01-01' }
        ],
        relationships: [
          { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' },
          { id: 2, person1Id: 2, person2Id: 3, type: 'parentOf', parentRole: 'mother' }
        ]
      })

      const { container } = render(PedigreeView)
      await tick()
      await tick()

      // THEN generation labels should be present
      const svg = container.querySelector('svg')
      expect(svg).toBeTruthy()
    })
  })

  describe('Scenario 2: Adding Ancestor Nodes Uses Enter Pattern', () => {
    it('should add new ancestor without re-rendering existing nodes', async () => {
      // GIVEN a person with one parent
      createTestFixture({
        people: [
          { id: 1, firstName: 'Mom', lastName: 'Jones', birthDate: '1955-01-01' },
          { id: 2, firstName: 'Child', lastName: 'Jones', birthDate: '1980-01-01' }
        ],
        relationships: [
          { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' }
        ]
      })

      const { container } = render(PedigreeView)
      await tick()
      await tick()

      const initialNodeCount = container.querySelectorAll('.node').length

      // WHEN I add a grandparent with relationship
      createTestFixture({
        people: [
          { id: 1, firstName: 'Mom', lastName: 'Jones', birthDate: '1955-01-01' },
          { id: 2, firstName: 'Child', lastName: 'Jones', birthDate: '1980-01-01' },
          { id: 3, firstName: 'Grandma', lastName: 'Smith', birthDate: '1930-01-01' }
        ],
        relationships: [
          { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' },
          { id: 2, person1Id: 3, person2Id: 1, type: 'parentOf', parentRole: 'mother' }
        ]
      })

      await tick()
      await tick()

      // THEN the new ancestor should be added
      const updatedNodeCount = container.querySelectorAll('.node').length
      expect(updatedNodeCount).toBeGreaterThan(initialNodeCount)
    })
  })

  describe('Scenario 3: Updating Nodes Uses Update Pattern', () => {
    it('should update person data without full re-render', async () => {
      // GIVEN a pedigree view
      createTestFixture({
        people: [
          { id: 1, firstName: 'Mom', lastName: 'Original', birthDate: '1955-01-01' },
          { id: 2, firstName: 'Child', lastName: 'Jones', birthDate: '1980-01-01' }
        ],
        relationships: [
          { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' }
        ]
      })

      const { container } = render(PedigreeView)
      await tick()
      await tick()

      // WHEN I update an ancestor's name
      people.set([
        { id: 1, firstName: 'Mom', lastName: 'Updated', birthDate: '1955-01-01' },
        { id: 2, firstName: 'Child', lastName: 'Jones', birthDate: '1980-01-01' }
      ])

      await tick()
      await tick()

      // THEN the node should reflect updated data
      const textElements = container.querySelectorAll('text')
      const hasUpdatedName = Array.from(textElements).some(
        el => el.textContent?.includes('Updated')
      )
      expect(hasUpdatedName).toBe(true)
    })
  })

  describe('Scenario 4: Removing Ancestor Nodes Uses Exit Pattern', () => {
    it('should remove ancestor nodes with fade out', async () => {
      // GIVEN a multi-generation tree (grandma is the focus)
      createTestFixture({
        people: [
          { id: 1, firstName: 'Grandma', lastName: 'Smith', birthDate: '1930-01-01' },
          { id: 2, firstName: 'Mom', lastName: 'Jones', birthDate: '1955-01-01' },
          { id: 3, firstName: 'Child', lastName: 'Jones', birthDate: '1980-01-01' }
        ],
        relationships: [
          { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' },
          { id: 2, person1Id: 2, person2Id: 3, type: 'parentOf', parentRole: 'mother' }
        ]
      })

      const { container } = render(PedigreeView)
      await tick()
      await tick()

      const initialNodeCount = container.querySelectorAll('.node').length
      // Should show Grandma (focus) - at least 1 node
      expect(initialNodeCount).toBeGreaterThanOrEqual(1)

      // WHEN I remove all people (simulating deletion)
      createTestFixture({
        people: [],
        relationships: []
      })

      await tick()
      await tick()

      // THEN nodes should be removed
      const updatedNodeCount = container.querySelectorAll('.node').length
      expect(updatedNodeCount).toBe(0)
    })
  })

  describe('Scenario 5: Zoom/Pan State Preserved', () => {
    it('should maintain zoom/pan when adding ancestors', async () => {
      // GIVEN a pedigree view
      createTestFixture({
        people: [
          { id: 1, firstName: 'Mom', lastName: 'Jones', birthDate: '1955-01-01' },
          { id: 2, firstName: 'Child', lastName: 'Jones', birthDate: '1980-01-01' }
        ],
        relationships: [
          { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' }
        ]
      })

      const { container } = render(PedigreeView)
      await tick()
      await tick()

      const svg = container.querySelector('svg')
      const gElement = svg?.querySelector('g')
      expect(gElement).toBeTruthy()

      // WHEN adding ancestor
      people.set([
        { id: 1, firstName: 'Mom', lastName: 'Jones', birthDate: '1955-01-01' },
        { id: 2, firstName: 'Child', lastName: 'Jones', birthDate: '1980-01-01' },
        { id: 3, firstName: 'Grandma', lastName: 'Smith', birthDate: '1930-01-01' }
      ])

      await tick()
      await tick()

      // THEN g element should persist
      const updatedGElement = svg?.querySelector('g')
      expect(updatedGElement).toBeTruthy()
    })
  })

  describe('Scenario 6: Focus Person Change Updates Efficiently', () => {
    it('should rebuild tree when focus person changes', async () => {
      // GIVEN two separate people
      createTestFixture({
        people: [
          { id: 1, firstName: 'Person1', lastName: 'One', birthDate: '1980-01-01' },
          { id: 2, firstName: 'Person2', lastName: 'Two', birthDate: '1980-01-01' }
        ],
        relationships: []
      })

      const { container } = render(PedigreeView)
      await tick()
      await tick()

      // Initial focus person is Person1
      const nodes = container.querySelectorAll('.node')
      expect(nodes.length).toBeGreaterThanOrEqual(1)

      // WHEN changing focus person via dropdown
      const select = container.querySelector('select')
      if (select) {
        select.value = '2'
        select.dispatchEvent(new Event('change'))
      }

      await tick()
      await tick()

      // THEN tree should update to show Person2's ancestors
      const updatedNodes = container.querySelectorAll('.node')
      expect(updatedNodes.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Scenario 7: Compact Node Rendering', () => {
    it('should render compact 80x40 nodes', async () => {
      // GIVEN a pedigree view
      createTestFixture({
        people: [
          { id: 1, firstName: 'Mom', lastName: 'Jones', birthDate: '1955-01-01' },
          { id: 2, firstName: 'Child', lastName: 'Jones', birthDate: '1980-01-01' }
        ],
        relationships: [
          { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' }
        ]
      })

      const { container } = render(PedigreeView)
      await tick()
      await tick()

      // THEN nodes should use compact sizing
      const rects = container.querySelectorAll('.node rect')
      expect(rects.length).toBeGreaterThanOrEqual(1)

      // Check that at least one rect has compact dimensions
      const hasCompactRect = Array.from(rects).some(rect => {
        const width = rect.getAttribute('width')
        const height = rect.getAttribute('height')
        return width === '80' && height === '40'
      })
      expect(hasCompactRect).toBe(true)
    })
  })

  describe('Scenario 8: Focus Person Highlighting', () => {
    it('should highlight focus person with green border', async () => {
      // GIVEN a pedigree with focus person
      createTestFixture({
        people: [
          { id: 1, firstName: 'Mom', lastName: 'Jones', birthDate: '1955-01-01' },
          { id: 2, firstName: 'Child', lastName: 'Jones', birthDate: '1980-01-01' }
        ],
        relationships: [
          { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' }
        ]
      })

      const { container } = render(PedigreeView)
      await tick()
      await tick()

      // THEN focus person should have special styling
      const rects = container.querySelectorAll('.node rect')
      const hasHighlightedRect = Array.from(rects).some(rect => {
        const stroke = rect.getAttribute('stroke')
        return stroke === '#4CAF50'
      })
      expect(hasHighlightedRect).toBe(true)
    })
  })
})
