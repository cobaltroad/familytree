/**
 * PedigreeView Default Focus Tests (Story #82)
 *
 * AC1: Default focus person in PedigreeView
 * - Given: User with default person
 * - When: Navigate to PedigreeView
 * - Then: Focus defaults to user's default person
 *
 * AC3: Fallback for users without default person
 * - Given: User without default person
 * - When: Navigate to PedigreeView
 * - Then: Focus defaults to first root person
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/svelte'
import { writable } from 'svelte/store'
import PedigreeView from './PedigreeView.svelte'
import { people, relationships } from '../stores/familyStore.js'

// Mock $app/stores
vi.mock('$app/stores', () => ({
  page: writable({
    data: {
      session: null
    }
  })
}))

describe('PedigreeView - Default Focus Person (Story #82)', () => {
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

  describe('AC1: User with default person', () => {
    it('should default focus to user\'s default person when session has defaultPersonId', async () => {
      // ARRANGE: Setup test data with multiple people
      const testPeople = [
        {
          id: 1,
          firstName: 'Alice',
          lastName: 'Smith',
          birthDate: '1950-01-01',
          userId: 1
        },
        {
          id: 2,
          firstName: 'Bob',
          lastName: 'Jones',
          birthDate: '1945-05-10',
          userId: 1
        },
        {
          id: 3,
          firstName: 'Charlie',
          lastName: 'Brown',
          birthDate: '1975-12-25',
          userId: 1
        }
      ]

      const testRelationships = [
        {
          id: 1,
          person1Id: 1,
          person2Id: 3,
          type: 'parentOf',
          parentRole: 'mother',
          userId: 1
        }
      ]

      people.set(testPeople)
      relationships.set(testRelationships)

      // Mock page store with user session containing defaultPersonId
      // Story #82: defaultPersonId is exposed at top level by +layout.server.js
      mockPage.set({
        data: {
          session: {
            user: {
              id: 1,
              email: 'test@example.com',
              defaultPersonId: 3 // Charlie is the default person
            }
          },
          defaultPersonId: 3 // Exposed at top level by +layout.server.js
        }
      })

      // ACT: Render PedigreeView
      const { container } = render(PedigreeView)

      // ASSERT: Focus person selector should default to Charlie (id: 3)
      const focusSelector = container.querySelector('select')
      expect(focusSelector).toBeTruthy()
      expect(focusSelector.value).toBe('3')
    })

    it('should allow user to change focus person after defaulting to their profile', async () => {
      // ARRANGE: Setup test data
      const testPeople = [
        { id: 1, firstName: 'Alice', lastName: 'Smith', userId: 1 },
        { id: 2, firstName: 'Bob', lastName: 'Jones', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      // Mock session with default person
      // Story #82: defaultPersonId is exposed at top level by +layout.server.js
      mockPage.set({
        data: {
          session: {
            user: { id: 1, defaultPersonId: 1 }
          },
          defaultPersonId: 1 // Exposed at top level by +layout.server.js
        }
      })

      // ACT: Render view
      const { container } = render(PedigreeView)

      const focusSelector = container.querySelector('select')

      // ASSERT: Should start with default person
      expect(focusSelector.value).toBe('1')

      // ACT: Change focus person
      focusSelector.value = '2'
      focusSelector.dispatchEvent(new Event('change'))

      // ASSERT: Should update to new person
      expect(focusSelector.value).toBe('2')
    })
  })

  describe('AC3: Fallback for users without default person', () => {
    it('should default to first root person when user has no defaultPersonId', async () => {
      // ARRANGE: Setup test data
      const testPeople = [
        { id: 1, firstName: 'Root1', lastName: 'Person', birthDate: '1950-01-01', userId: 1 },
        { id: 2, firstName: 'Root2', lastName: 'Person', birthDate: '1955-01-01', userId: 1 },
        { id: 3, firstName: 'Child', lastName: 'Person', birthDate: '1980-01-01', userId: 1 }
      ]

      const testRelationships = [
        {
          id: 1,
          person1Id: 1,
          person2Id: 3,
          type: 'parentOf',
          parentRole: 'father',
          userId: 1
        }
      ]

      people.set(testPeople)
      relationships.set(testRelationships)

      // Mock session without defaultPersonId
      // Story #82: defaultPersonId is null when user has no default person
      mockPage.set({
        data: {
          session: {
            user: {
              id: 1,
              email: 'test@example.com'
              // No defaultPersonId
            }
          },
          defaultPersonId: null // No default person
        }
      })

      // ACT: Render view
      const { container } = render(PedigreeView)

      const focusSelector = container.querySelector('select')

      // ASSERT: Should default to first root person (id: 1)
      expect(focusSelector.value).toBe('1')
    })

    it('should default to first root person when user is not logged in', async () => {
      // ARRANGE: Setup test data
      const testPeople = [
        { id: 1, firstName: 'Root', lastName: 'Person', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      // Mock no session (user not logged in)
      // Story #82: defaultPersonId is null when user is not logged in
      mockPage.set({
        data: {
          session: null,
          defaultPersonId: null
        }
      })

      // ACT: Render view
      const { container } = render(PedigreeView)

      const focusSelector = container.querySelector('select')

      // ASSERT: Should default to first root person
      expect(focusSelector.value).toBe('1')
    })
  })

  describe('Edge cases', () => {
    it('should handle defaultPersonId that does not exist in people list', async () => {
      // ARRANGE: User's defaultPersonId references a person that was deleted
      const testPeople = [
        { id: 1, firstName: 'Alice', lastName: 'Smith', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      // Mock session with invalid defaultPersonId
      // Story #82: defaultPersonId exposed at top level
      mockPage.set({
        data: {
          session: {
            user: { id: 1, defaultPersonId: 999 } // Non-existent person
          },
          defaultPersonId: 999 // Non-existent person
        }
      })

      // ACT: Render view
      const { container } = render(PedigreeView)

      const focusSelector = container.querySelector('select')

      // ASSERT: Should fall back to first available person
      expect(focusSelector.value).toBe('1')
    })
  })
})
