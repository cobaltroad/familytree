/**
 * RadialView Default Focus Tests (Story #82)
 *
 * AC2: Default focus person in RadialView
 * - Given: User with default person
 * - When: Navigate to RadialView
 * - Then: Focus defaults to user's default person (center of radial tree)
 *
 * AC3: Fallback for users without default person
 * - Given: User without default person
 * - When: Navigate to RadialView
 * - Then: Focus defaults to first root person
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/svelte'
import { writable } from 'svelte/store'
import RadialView from './RadialView.svelte'
import { people, relationships } from '../stores/familyStore.js'

// Mock $app/stores
vi.mock('$app/stores', () => ({
  page: writable({
    data: {
      session: null
    }
  })
}))

describe('RadialView - Default Focus Person (Story #82)', () => {
  let mockPage

  beforeEach(async () => {
    // Reset stores
    people.set([])
    relationships.set([])

    // Get fresh page store for each test
    const { page } = await import('$app/stores')
    mockPage = page
    mockPage.set({
      data: {
        session: null
      }
    })
  })

  describe('AC2: User with default person', () => {
    it('should default focus to user\'s default person at center of radial tree', async () => {
      // ARRANGE: Setup test data
      const testPeople = [
        {
          id: 1,
          firstName: 'Grandparent',
          lastName: 'Smith',
          birthDate: '1930-01-01',
          userId: 1
        },
        {
          id: 2,
          firstName: 'Parent',
          lastName: 'Smith',
          birthDate: '1955-05-10',
          userId: 1
        },
        {
          id: 3,
          firstName: 'Me',
          lastName: 'Smith',
          birthDate: '1985-12-25',
          userId: 1
        }
      ]

      const testRelationships = [
        {
          id: 1,
          person1Id: 1,
          person2Id: 2,
          type: 'parentOf',
          parentRole: 'mother',
          userId: 1
        },
        {
          id: 2,
          person1Id: 2,
          person2Id: 3,
          type: 'parentOf',
          parentRole: 'mother',
          userId: 1
        }
      ]

      people.set(testPeople)
      relationships.set(testRelationships)

      // Mock page store with user session containing defaultPersonId
      mockPage.set({
        data: {
          session: {
            user: {
              id: 1,
              email: 'test@example.com',
              defaultPersonId: 3 // "Me" is the default person
            }
          }
        }
      })

      // ACT: Render RadialView
      const { container } = render(RadialView)

      // ASSERT: Focus person selector should default to "Me" (id: 3)
      const focusSelector = container.querySelector('select')
      expect(focusSelector).toBeTruthy()
      expect(focusSelector.value).toBe('3')
    })

    it('should allow user to change focus person after defaulting to their profile', async () => {
      // ARRANGE: Setup test data
      const testPeople = [
        { id: 1, firstName: 'Person1', lastName: 'A', userId: 1 },
        { id: 2, firstName: 'Person2', lastName: 'B', userId: 1 },
        { id: 3, firstName: 'Person3', lastName: 'C', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      // Mock session with default person
      mockPage.set({
        data: {
          session: {
            user: { id: 1, defaultPersonId: 2 }
          }
        }
      })

      // ACT: Render view
      const { container } = render(RadialView)

      const focusSelector = container.querySelector('select')

      // ASSERT: Should start with default person
      expect(focusSelector.value).toBe('2')

      // ACT: Change focus person
      focusSelector.value = '1'
      focusSelector.dispatchEvent(new Event('change'))

      // ASSERT: Should update to new person
      expect(focusSelector.value).toBe('1')
    })
  })

  describe('AC3: Fallback for users without default person', () => {
    it('should default to first root person when user has no defaultPersonId', async () => {
      // ARRANGE: Setup test data with root people
      const testPeople = [
        { id: 10, firstName: 'Root1', lastName: 'Person', userId: 1 },
        { id: 20, firstName: 'Root2', lastName: 'Person', userId: 1 },
        { id: 30, firstName: 'Child', lastName: 'Person', userId: 1 }
      ]

      const testRelationships = [
        {
          id: 1,
          person1Id: 10,
          person2Id: 30,
          type: 'parentOf',
          parentRole: 'mother',
          userId: 1
        }
      ]

      people.set(testPeople)
      relationships.set(testRelationships)

      // Mock session without defaultPersonId
      mockPage.set({
        data: {
          session: {
            user: { id: 1 }
            // No defaultPersonId
          }
        }
      })

      // ACT: Render view
      const { container } = render(RadialView)

      const focusSelector = container.querySelector('select')

      // ASSERT: Should default to first root person (id: 10)
      expect(focusSelector.value).toBe('10')
    })

    it('should default to first root person when user is not logged in', async () => {
      // ARRANGE: Setup test data
      const testPeople = [
        { id: 5, firstName: 'Root', lastName: 'Person', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      // Mock no session
      mockPage.set({
        data: {
          session: null
        }
      })

      // ACT: Render view
      const { container } = render(RadialView)

      const focusSelector = container.querySelector('select')

      // ASSERT: Should default to first root person
      expect(focusSelector.value).toBe('5')
    })
  })

  describe('Edge cases', () => {
    it('should handle defaultPersonId that does not exist in people list', async () => {
      // ARRANGE: User's defaultPersonId references deleted person
      const testPeople = [
        { id: 7, firstName: 'Alice', lastName: 'Smith', userId: 1 },
        { id: 8, firstName: 'Bob', lastName: 'Jones', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      // Mock session with invalid defaultPersonId
      mockPage.set({
        data: {
          session: {
            user: { id: 1, defaultPersonId: 999 } // Non-existent
          }
        }
      })

      // ACT: Render view
      const { container } = render(RadialView)

      const focusSelector = container.querySelector('select')

      // ASSERT: Should fall back to first available person
      expect(focusSelector.value).toBe('7')
    })
  })
})
