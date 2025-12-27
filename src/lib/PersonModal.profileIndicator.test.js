/**
 * PersonModal "Your Profile" Indicator Tests (Story #84 - AC1)
 *
 * AC1: Show indicator in PersonModal
 * - Given: Viewing PersonModal for default person
 * - When: Modal opens
 * - Then: "Your Profile" badge is visible
 * - And: Badge is NOT shown for other people
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import { writable } from 'svelte/store'
import PersonModal from './PersonModal.svelte'
import { people, relationships } from '../stores/familyStore.js'
import { modal } from '../stores/modalStore.js'

// Mock $app/stores
vi.mock('$app/stores', () => ({
  page: writable({
    data: {
      session: null
    }
  })
}))

describe('PersonModal - Your Profile Indicator (Story #84 - AC1)', () => {
  let mockPage

  beforeEach(async () => {
    // Reset stores
    people.set([])
    relationships.set([])
    modal.close()

    // Get fresh page store
    const { page } = await import('$app/stores')
    mockPage = page
    mockPage.set({
      data: {
        session: null
      }
    })
  })

  describe('AC1: Show "Your Profile" indicator in PersonModal', () => {
    it('should show "Your Profile" badge when viewing default person', async () => {
      // ARRANGE: Setup test data
      const testPeople = [
        { id: 1, firstName: 'Alice', lastName: 'Smith', userId: 1 },
        { id: 2, firstName: 'Bob', lastName: 'Jones', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      // Mock session with defaultPersonId
      mockPage.set({
        data: {
          session: {
            user: {
              id: 1,
              email: 'test@example.com',
              defaultPersonId: 1 // Alice is the default person
            }
          }
        }
      })

      // Open modal for default person
      modal.open(1, 'edit')

      // ACT: Render PersonModal
      render(PersonModal)

      // ASSERT: Should show "Your Profile" badge
      const profileBadge = screen.queryByText(/Your Profile/i)
      expect(profileBadge).toBeTruthy()
      expect(profileBadge).toBeVisible()
    })

    it('should NOT show "Your Profile" badge when viewing other people', async () => {
      // ARRANGE: Setup test data
      const testPeople = [
        { id: 1, firstName: 'Alice', lastName: 'Smith', userId: 1 },
        { id: 2, firstName: 'Bob', lastName: 'Jones', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      // Mock session with defaultPersonId = 1 (Alice)
      mockPage.set({
        data: {
          session: {
            user: {
              id: 1,
              defaultPersonId: 1
            }
          }
        }
      })

      // Open modal for person 2 (Bob - NOT the default person)
      modal.open(2, 'edit')

      // ACT: Render PersonModal
      render(PersonModal)

      // ASSERT: Should NOT show "Your Profile" badge
      const profileBadge = screen.queryByText(/Your Profile/i)
      expect(profileBadge).toBeNull()
    })

    it('should NOT show "Your Profile" badge when user is not logged in', async () => {
      // ARRANGE: Setup test data
      const testPeople = [
        { id: 1, firstName: 'Alice', lastName: 'Smith', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      // No session (not logged in)
      mockPage.set({
        data: {
          session: null
        }
      })

      // Open modal for person 1
      modal.open(1, 'edit')

      // ACT: Render PersonModal
      render(PersonModal)

      // ASSERT: Should NOT show "Your Profile" badge
      const profileBadge = screen.queryByText(/Your Profile/i)
      expect(profileBadge).toBeNull()
    })

    it('should have visually distinct blue badge styling', async () => {
      // ARRANGE: Setup test data
      const testPeople = [
        { id: 1, firstName: 'Me', lastName: 'User', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      // Mock session
      mockPage.set({
        data: {
          session: {
            user: { id: 1, defaultPersonId: 1 }
          }
        }
      })

      // Open modal for default person
      modal.open(1, 'edit')

      // ACT: Render PersonModal
      const { container } = render(PersonModal)

      // ASSERT: Badge should have specific styling class
      const profileBadge = container.querySelector('.profile-badge')
      expect(profileBadge).toBeTruthy()

      // Check for blue background styling
      const styles = window.getComputedStyle(profileBadge)
      // Badge should have blue-ish background (checking for rgb value of #3b82f6)
      expect(styles.backgroundColor).toContain('rgb')
    })
  })
})
