/**
 * PersonModal "Set as My Profile" Button Tests (Issue #129)
 *
 * User Story: As a family historian, I want to set any person record as my profile
 * directly from the PersonModal so that I can quickly associate myself with a person
 * I'm viewing without navigating away.
 *
 * Acceptance Criteria:
 * - AC1: Button renders when user is authenticated
 * - AC2: Button hidden when user is unauthenticated
 * - AC3: Button shows "Unset as My Profile" when viewing current default person
 * - AC4: Click handler calls API with correct person ID
 * - AC5: Success toast notification appears on successful update
 * - AC6: Error toast notification appears on API failure
 * - AC7: Visual indicator appears when viewing default person
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/svelte'
import { writable } from 'svelte/store'
import PersonModal from './PersonModal.svelte'
import { people, relationships } from '../stores/familyStore.js'
import { modal } from '../stores/modalStore.js'
import { notifications } from '../stores/notificationStore.js'
import { get } from 'svelte/store'
import * as apiModule from './api.js'

// Mock $app/stores
vi.mock('$app/stores', () => ({
  page: writable({
    data: {
      session: null
    }
  })
}))

describe('PersonModal - Set as My Profile Button (Issue #129)', () => {
  let mockPage
  let mockUpdateDefaultPerson

  beforeEach(async () => {
    // Reset stores
    people.set([])
    relationships.set([])
    modal.close()
    notifications.set([])

    // Get fresh page store
    const { page } = await import('$app/stores')
    mockPage = page
    mockPage.set({
      data: {
        session: null
      }
    })

    // Mock API method
    mockUpdateDefaultPerson = vi.fn()
    vi.spyOn(apiModule.api, 'updateDefaultPerson').mockImplementation(mockUpdateDefaultPerson)

    // Set window width for desktop layout
    global.innerWidth = 1920
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('AC1: Button renders when user is authenticated', () => {
    it('should show "Set as My Profile" button when authenticated and viewing non-default person', async () => {
      // ARRANGE: Setup authenticated user viewing person who is not default
      const testPeople = [
        { id: 1, firstName: 'Alice', lastName: 'Smith', userId: 1 },
        { id: 2, firstName: 'Bob', lastName: 'Jones', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      mockPage.set({
        data: {
          session: {
            user: {
              id: 1,
              email: 'test@example.com',
              defaultPersonId: 1 // Alice is default
            }
          }
        }
      })

      // Open modal for Bob (not the default person)
      modal.open(2, 'edit')

      // ACT: Render PersonModal
      const { container } = render(PersonModal)

      // ASSERT: Button should be visible
      const setProfileButton = container.querySelector('[data-testid="set-profile-button"]')
      expect(setProfileButton).toBeTruthy()
      expect(setProfileButton.textContent).toContain('Set as My Profile')
    })

    it('should render button in sticky footer section', async () => {
      // ARRANGE
      const testPeople = [
        { id: 1, firstName: 'Alice', lastName: 'Smith', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      mockPage.set({
        data: {
          session: {
            user: {
              id: 1,
              email: 'test@example.com',
              defaultPersonId: null
            }
          }
        }
      })

      modal.open(1, 'edit')

      // ACT
      const { container } = render(PersonModal)

      // ASSERT: Button should be in sticky footer
      const buttonSection = container.querySelector('.button-section')
      expect(buttonSection).toBeTruthy()

      const setProfileButton = buttonSection.querySelector('[data-testid="set-profile-button"]')
      expect(setProfileButton).toBeTruthy()
    })
  })

  describe('AC2: Button hidden when user is unauthenticated', () => {
    it('should NOT show button when user is not logged in', async () => {
      // ARRANGE: No session (unauthenticated)
      const testPeople = [
        { id: 1, firstName: 'Alice', lastName: 'Smith', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      mockPage.set({
        data: {
          session: null
        }
      })

      modal.open(1, 'edit')

      // ACT
      const { container } = render(PersonModal)

      // ASSERT: Button should NOT be visible
      const setProfileButton = container.querySelector('[data-testid="set-profile-button"]')
      expect(setProfileButton).toBeFalsy()
    })

    it('should NOT show button when session has no user', async () => {
      // ARRANGE: Session without user
      const testPeople = [
        { id: 1, firstName: 'Alice', lastName: 'Smith', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      mockPage.set({
        data: {
          session: { user: null }
        }
      })

      modal.open(1, 'edit')

      // ACT
      const { container } = render(PersonModal)

      // ASSERT
      const setProfileButton = container.querySelector('[data-testid="set-profile-button"]')
      expect(setProfileButton).toBeFalsy()
    })
  })

  describe('AC3: Button shows "Unset as My Profile" when viewing current default person', () => {
    it('should show "Unset as My Profile" when viewing default person', async () => {
      // ARRANGE: Viewing the default person
      const testPeople = [
        { id: 1, firstName: 'Alice', lastName: 'Smith', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      mockPage.set({
        data: {
          session: {
            user: {
              id: 1,
              email: 'test@example.com',
              defaultPersonId: 1 // Alice is default
            }
          }
        }
      })

      modal.open(1, 'edit') // Open modal for Alice (the default person)

      // ACT
      const { container } = render(PersonModal)

      // ASSERT
      const setProfileButton = container.querySelector('[data-testid="set-profile-button"]')
      expect(setProfileButton).toBeTruthy()
      expect(setProfileButton.textContent).toContain('Unset as My Profile')
      expect(setProfileButton.textContent).not.toContain('Set as My Profile')
    })

    it('should have secondary/gray styling when showing "Unset"', async () => {
      // ARRANGE
      const testPeople = [
        { id: 1, firstName: 'Alice', lastName: 'Smith', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

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

      modal.open(1, 'edit')

      // ACT
      const { container } = render(PersonModal)

      // ASSERT: Should have secondary class
      const setProfileButton = container.querySelector('[data-testid="set-profile-button"]')
      expect(setProfileButton.classList.contains('secondary') ||
             setProfileButton.classList.contains('set-profile-button-secondary')).toBe(true)
    })
  })

  describe('AC4: Click handler calls API with correct person ID', () => {
    it('should call updateDefaultPerson API with personId when clicked', async () => {
      // ARRANGE
      const testPeople = [
        { id: 5, firstName: 'Bob', lastName: 'Jones', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      mockPage.set({
        data: {
          session: {
            user: {
              id: 1,
              email: 'test@example.com',
              defaultPersonId: null
            }
          }
        }
      })

      mockUpdateDefaultPerson.mockResolvedValue({ success: true, personId: 5 })

      modal.open(5, 'edit')

      // ACT
      const { container } = render(PersonModal)
      const setProfileButton = container.querySelector('[data-testid="set-profile-button"]')

      await fireEvent.click(setProfileButton)

      // ASSERT: API should be called with correct personId
      await waitFor(() => {
        expect(mockUpdateDefaultPerson).toHaveBeenCalledWith(5)
      })
    })

    it('should call updateDefaultPerson with null when unsetting profile', async () => {
      // ARRANGE: Viewing default person
      const testPeople = [
        { id: 3, firstName: 'Alice', lastName: 'Smith', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      mockPage.set({
        data: {
          session: {
            user: {
              id: 1,
              defaultPersonId: 3 // Alice is default
            }
          }
        }
      })

      mockUpdateDefaultPerson.mockResolvedValue({ success: true, personId: null })

      modal.open(3, 'edit')

      // ACT
      const { container } = render(PersonModal)
      const unsetProfileButton = container.querySelector('[data-testid="set-profile-button"]')

      await fireEvent.click(unsetProfileButton)

      // ASSERT: API should be called with null to unset
      await waitFor(() => {
        expect(mockUpdateDefaultPerson).toHaveBeenCalledWith(null)
      })
    })
  })

  describe('AC5: Success toast notification appears on successful update', () => {
    it('should show success notification when setting profile', async () => {
      // ARRANGE
      const testPeople = [
        { id: 2, firstName: 'Jane', lastName: 'Doe', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      mockPage.set({
        data: {
          session: {
            user: {
              id: 1,
              defaultPersonId: null
            }
          }
        }
      })

      mockUpdateDefaultPerson.mockResolvedValue({ success: true, personId: 2 })

      modal.open(2, 'edit')

      // ACT
      const { container } = render(PersonModal)
      const setProfileButton = container.querySelector('[data-testid="set-profile-button"]')

      await fireEvent.click(setProfileButton)

      // ASSERT: Success notification should appear
      await waitFor(() => {
        const currentNotifications = get(notifications)
        expect(currentNotifications.length).toBeGreaterThan(0)
        expect(currentNotifications[0].type).toBe('success')
        expect(currentNotifications[0].message).toContain('profile')
      })
    })

    it('should show success notification when unsetting profile', async () => {
      // ARRANGE
      const testPeople = [
        { id: 1, firstName: 'Alice', lastName: 'Smith', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

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

      mockUpdateDefaultPerson.mockResolvedValue({ success: true, personId: null })

      modal.open(1, 'edit')

      // ACT
      const { container } = render(PersonModal)
      const unsetProfileButton = container.querySelector('[data-testid="set-profile-button"]')

      await fireEvent.click(unsetProfileButton)

      // ASSERT
      await waitFor(() => {
        const currentNotifications = get(notifications)
        expect(currentNotifications.length).toBeGreaterThan(0)
        expect(currentNotifications[0].type).toBe('success')
        expect(currentNotifications[0].message).toContain('unset')
      })
    })
  })

  describe('AC6: Error toast notification appears on API failure', () => {
    it('should show error notification when API call fails', async () => {
      // ARRANGE
      const testPeople = [
        { id: 1, firstName: 'Alice', lastName: 'Smith', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      mockPage.set({
        data: {
          session: {
            user: {
              id: 1,
              defaultPersonId: null
            }
          }
        }
      })

      mockUpdateDefaultPerson.mockRejectedValue(new Error('Network error'))

      modal.open(1, 'edit')

      // ACT
      const { container } = render(PersonModal)
      const setProfileButton = container.querySelector('[data-testid="set-profile-button"]')

      await fireEvent.click(setProfileButton)

      // ASSERT: Error notification should appear
      await waitFor(() => {
        const currentNotifications = get(notifications)
        expect(currentNotifications.length).toBeGreaterThan(0)
        expect(currentNotifications[0].type).toBe('error')
        expect(currentNotifications[0].message).toContain('Failed')
      })
    })

    it('should preserve button state on error', async () => {
      // ARRANGE
      const testPeople = [
        { id: 1, firstName: 'Alice', lastName: 'Smith', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      mockPage.set({
        data: {
          session: {
            user: {
              id: 1,
              defaultPersonId: null
            }
          }
        }
      })

      mockUpdateDefaultPerson.mockRejectedValue(new Error('Person not found'))

      modal.open(1, 'edit')

      // ACT
      const { container } = render(PersonModal)
      const setProfileButton = container.querySelector('[data-testid="set-profile-button"]')

      await fireEvent.click(setProfileButton)

      // ASSERT: Button should still show "Set as My Profile" after error
      await waitFor(() => {
        expect(setProfileButton.textContent).toContain('Set as My Profile')
      })
    })
  })

  describe('AC7: Visual indicator appears when viewing default person', () => {
    it('should show "Your Profile" badge when viewing default person', async () => {
      // ARRANGE
      const testPeople = [
        { id: 1, firstName: 'Alice', lastName: 'Smith', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

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

      modal.open(1, 'edit')

      // ACT
      const { container } = render(PersonModal)

      // ASSERT: Badge should be visible (this feature already exists, just verifying)
      const profileBadge = container.querySelector('.profile-badge')
      expect(profileBadge).toBeTruthy()
      expect(profileBadge.textContent).toContain('Your Profile')
    })
  })

  describe('Responsive layout', () => {
    it('should show button on mobile layout', async () => {
      // ARRANGE: Mobile viewport
      global.innerWidth = 375

      const testPeople = [
        { id: 1, firstName: 'Alice', lastName: 'Smith', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      mockPage.set({
        data: {
          session: {
            user: {
              id: 1,
              defaultPersonId: null
            }
          }
        }
      })

      modal.open(1, 'edit')

      // ACT
      const { container } = render(PersonModal)

      // ASSERT: Button should be visible on mobile
      const setProfileButton = container.querySelector('[data-testid="set-profile-button"]')
      expect(setProfileButton).toBeTruthy()
    })

    it('should show button on tablet layout', async () => {
      // ARRANGE: Tablet viewport
      global.innerWidth = 800

      const testPeople = [
        { id: 1, firstName: 'Alice', lastName: 'Smith', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      mockPage.set({
        data: {
          session: {
            user: {
              id: 1,
              defaultPersonId: null
            }
          }
        }
      })

      modal.open(1, 'edit')

      // ACT
      const { container } = render(PersonModal)

      // ASSERT
      const setProfileButton = container.querySelector('[data-testid="set-profile-button"]')
      expect(setProfileButton).toBeTruthy()
    })
  })

  describe('Button loading state', () => {
    it('should show "Updating..." text and disable button during API call', async () => {
      // ARRANGE
      const testPeople = [
        { id: 1, firstName: 'Alice', lastName: 'Smith', userId: 1 }
      ]

      people.set(testPeople)
      relationships.set([])

      mockPage.set({
        data: {
          session: {
            user: {
              id: 1,
              defaultPersonId: null
            }
          }
        }
      })

      // Create a promise that we can control
      let resolvePromise
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockUpdateDefaultPerson.mockReturnValue(pendingPromise)

      modal.open(1, 'edit')

      // ACT
      const { container } = render(PersonModal)
      const setProfileButton = container.querySelector('[data-testid="set-profile-button"]')

      fireEvent.click(setProfileButton)

      // ASSERT: Button should show loading state
      await waitFor(() => {
        expect(setProfileButton.textContent).toContain('Updating...')
        expect(setProfileButton.disabled).toBe(true)
      })

      // Cleanup: resolve the promise
      resolvePromise({ success: true, personId: 1 })
    })
  })
})
