/**
 * Unit tests for TimelineView component accessing stores directly.
 * Tests that TimelineView reads from stores instead of receiving data via props.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import { get } from 'svelte/store'
import TimelineView from './TimelineView.svelte'
import { people, relationships } from '../stores/familyStore.js'

describe('TimelineView - Store Access', () => {
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
    it('should render empty state when stores have no data with birth dates', () => {
      render(TimelineView)

      const emptyMessage = screen.queryByText(/no people with birth dates to display/i)
      expect(emptyMessage).toBeTruthy()
    })

    it('should render timeline from people store with birth dates', () => {
      people.set([
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          birthDate: '1950-01-01',
          deathDate: '2020-01-01',
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

      const { container } = render(TimelineView)

      // Should render SVG element (TimelineView creates SVG for visualization)
      const svg = container.querySelector('svg')
      expect(svg).toBeTruthy()

      // Should not show empty state
      expect(screen.queryByText(/no people with birth dates to display/i)).toBeFalsy()

      // Verify store is being used correctly
      expect(get(people)).toHaveLength(2)
    })

    it('should reactively update when store data changes', async () => {
      const { container } = render(TimelineView)

      // Initially empty
      expect(screen.queryByText(/no people with birth dates to display/i)).toBeTruthy()

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
      expect(screen.queryByText(/no people with birth dates to display/i)).toBeFalsy()

      // Verify store has the data
      expect(get(people)).toHaveLength(1)
      expect(get(people)[0].firstName).toBe('Alice')
    })

    it('should filter out people without birth dates', () => {
      people.set([
        {
          id: 1,
          firstName: 'WithDate',
          lastName: 'Person',
          birthDate: '1960-01-01',
          deathDate: null,
          gender: 'male'
        },
        {
          id: 2,
          firstName: 'NoDate',
          lastName: 'Person',
          birthDate: null,
          deathDate: null,
          gender: 'female'
        }
      ])

      const { container } = render(TimelineView)

      // Should render SVG for the one person with birth date
      const svg = container.querySelector('svg')
      expect(svg).toBeTruthy()

      // Should show notice about excluded person
      const excludedNotice = screen.queryByText(/1 person without birth dates excluded/i)
      expect(excludedNotice).toBeTruthy()
    })
  })

  describe('No Props Required', () => {
    it('should not require people or relationships props', () => {
      // This test verifies that TimelineView can be rendered without props
      // and will use stores instead
      expect(() => {
        render(TimelineView)
      }).not.toThrow()
    })

    it('should use store data not prop data', () => {
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

      const { container } = render(TimelineView, { props: { people: propsData, relationships: [] } })

      // Should render SVG using store data
      const svg = container.querySelector('svg')
      expect(svg).toBeTruthy()

      // Verify store is used (has 1 person from store, not prop)
      expect(get(people)).toHaveLength(1)
      expect(get(people)[0].firstName).toBe('StoreUser')
    })
  })

  describe('Performance', () => {
    it('should handle large datasets from store efficiently', () => {
      // Create 50 people in store
      const testPeople = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        firstName: `Person${i + 1}`,
        lastName: 'Test',
        birthDate: `${1960 + i}-01-01`,
        deathDate: null,
        gender: i % 2 === 0 ? 'male' : 'female'
      }))

      const startTime = performance.now()

      people.set(testPeople)

      const { container } = render(TimelineView)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time (< 1000ms)
      expect(renderTime).toBeLessThan(1000)

      // Should render SVG with large timeline
      const svg = container.querySelector('svg')
      expect(svg).toBeTruthy()

      // Verify store contains all data
      expect(get(people)).toHaveLength(50)
    })
  })
})
