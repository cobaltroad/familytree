/**
 * RelationshipCard "You" Badge Tests (Story #84 - AC2)
 *
 * AC2: Show indicator in RelationshipCard
 * - Given: Viewing RelationshipCard for default person
 * - When: Card is rendered
 * - Then: "You" badge is visible
 * - And: Badge is NOT shown for other people
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import { writable } from 'svelte/store'
import RelationshipCard from './RelationshipCard.svelte'

// Mock $app/stores
vi.mock('$app/stores', () => ({
  page: writable({
    data: {
      session: null
    }
  })
}))

describe('RelationshipCard - "You" Badge (Story #84 - AC2)', () => {
  let mockPage

  beforeEach(async () => {
    // Get fresh page store
    const { page } = await import('$app/stores')
    mockPage = page
    mockPage.set({
      data: {
        session: null
      }
    })
  })

  describe('AC2: Show "You" indicator in RelationshipCard', () => {
    it('should show "You" badge when card displays default person', async () => {
      // ARRANGE: Setup person and session
      const testPerson = {
        id: 5,
        firstName: 'Alice',
        lastName: 'Smith'
      }

      // Mock session with defaultPersonId
      mockPage.set({
        data: {
          session: {
            user: {
              id: 1,
              defaultPersonId: 5 // Alice is the default person
            }
          }
        }
      })

      // ACT: Render RelationshipCard for default person
      render(RelationshipCard, {
        props: {
          person: testPerson,
          relationshipType: 'Mother'
        }
      })

      // ASSERT: Should show "You" badge
      const youBadge = screen.queryByText(/You/i)
      expect(youBadge).toBeTruthy()
      expect(youBadge).toBeVisible()
    })

    it('should NOT show "You" badge when card displays other people', async () => {
      // ARRANGE: Setup person and session
      const testPerson = {
        id: 10,
        firstName: 'Bob',
        lastName: 'Jones'
      }

      // Mock session with defaultPersonId = 5 (not this person)
      mockPage.set({
        data: {
          session: {
            user: {
              id: 1,
              defaultPersonId: 5 // Different person
            }
          }
        }
      })

      // ACT: Render RelationshipCard for non-default person
      render(RelationshipCard, {
        props: {
          person: testPerson,
          relationshipType: 'Father'
        }
      })

      // ASSERT: Should NOT show "You" badge
      const youBadge = screen.queryByText(/You/i)
      expect(youBadge).toBeNull()
    })

    it('should NOT show "You" badge when user is not logged in', async () => {
      // ARRANGE: Setup person
      const testPerson = {
        id: 7,
        firstName: 'Charlie',
        lastName: 'Brown'
      }

      // No session (not logged in)
      mockPage.set({
        data: {
          session: null
        }
      })

      // ACT: Render RelationshipCard
      render(RelationshipCard, {
        props: {
          person: testPerson,
          relationshipType: 'Sibling'
        }
      })

      // ASSERT: Should NOT show "You" badge
      const youBadge = screen.queryByText(/You/i)
      expect(youBadge).toBeNull()
    })

    it('should have visually distinct badge styling', async () => {
      // ARRANGE: Setup person and session
      const testPerson = {
        id: 3,
        firstName: 'Me',
        lastName: 'User'
      }

      mockPage.set({
        data: {
          session: {
            user: { id: 1, defaultPersonId: 3 }
          }
        }
      })

      // ACT: Render RelationshipCard
      const { container } = render(RelationshipCard, {
        props: {
          person: testPerson,
          relationshipType: 'Child'
        }
      })

      // ASSERT: Badge should have specific styling class
      const youBadge = container.querySelector('.you-badge')
      expect(youBadge).toBeTruthy()
    })

    it('should show "You" badge in all contexts (modal, lists)', async () => {
      // ARRANGE: Setup default person
      const testPerson = {
        id: 15,
        firstName: 'Test',
        lastName: 'User'
      }

      mockPage.set({
        data: {
          session: {
            user: { id: 1, defaultPersonId: 15 }
          }
        }
      })

      // ACT: Render card in desktop mode
      const { rerender } = render(RelationshipCard, {
        props: {
          person: testPerson,
          relationshipType: 'Spouse',
          isMobile: false
        }
      })

      // ASSERT: Badge shown on desktop
      let youBadge = screen.queryByText(/You/i)
      expect(youBadge).toBeTruthy()

      // ACT: Re-render in mobile mode
      await rerender({
        person: testPerson,
        relationshipType: 'Spouse',
        isMobile: true
      })

      // ASSERT: Badge still shown on mobile
      youBadge = screen.queryByText(/You/i)
      expect(youBadge).toBeTruthy()
    })
  })
})
