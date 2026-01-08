import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/svelte'
import PersonModal from './PersonModal.svelte'
import { modal } from '../stores/modalStore.js'
import { people, relationships } from '../stores/familyStore.js'
import { get } from 'svelte/store'

// Mock $app/stores
vi.mock('$app/stores', () => ({
  page: {
    subscribe: (fn) => {
      fn({ data: { session: null } })
      return () => {}
    }
  }
}))

describe('PersonModal - SmartRelationshipCreator Integration', () => {
  const mockPeople = [
    { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', birthDate: '1949-01-01' },
    { id: 2, firstName: 'Jane', lastName: 'Smith', gender: 'female', birthDate: '1952-02-02' },
    { id: 3, firstName: 'Alice', lastName: 'Doe', gender: 'female', birthDate: '1980-03-03' }
  ]

  const mockRelationships = [
    { id: 1, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'father' },
    { id: 2, person1Id: 2, person2Id: 3, type: 'parentOf', parentRole: 'mother' }
  ]

  beforeEach(() => {
    people.set(mockPeople)
    relationships.set(mockRelationships)
    modal.close()

    // Set window width for desktop mode
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    })
  })

  afterEach(() => {
    modal.close()
  })

  describe.skip('Add from Facebook button - TEMPORARILY DISABLED', () => {
    // These tests are skipped because Facebook buttons are temporarily hidden
    // To re-enable: remove .skip and change {#if false} to {#if true} in PersonModal.svelte
    it('should display "Add from Facebook" button in relationships section on desktop', async () => {
      modal.open(1, 'edit') // Open modal for John Doe

      const { container } = render(PersonModal)

      // The button should appear in the relationships section
      const addFromFacebookButton = screen.queryByTestId('add-from-facebook-button')

      expect(addFromFacebookButton).toBeTruthy()
      expect(addFromFacebookButton.textContent).toContain('Add from Facebook')
    })

    it('should display "Add from Facebook" button in relationships section on mobile', async () => {
      // Set mobile width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })

      modal.open(1, 'edit')

      const { container } = render(PersonModal)

      const addFromFacebookButton = screen.queryByTestId('add-from-facebook-button')

      expect(addFromFacebookButton).toBeTruthy()
      expect(addFromFacebookButton.textContent).toContain('Add from Facebook')
    })

    it('should not display "Add from Facebook" button when adding new person', async () => {
      modal.openNew() // Open modal for new person

      const { container } = render(PersonModal)

      const addFromFacebookButton = screen.queryByTestId('add-from-facebook-button')

      // Should not show button for new person (no relationships section yet)
      expect(addFromFacebookButton).toBeFalsy()
    })
  })

  describe.skip('SmartRelationshipCreator modal opening - TEMPORARILY DISABLED', () => {
    it('should open SmartRelationshipCreator modal when "Add from Facebook" button is clicked', async () => {
      modal.open(1, 'edit')

      const { container } = render(PersonModal)

      const addFromFacebookButton = screen.getByTestId('add-from-facebook-button')
      await fireEvent.click(addFromFacebookButton)

      // Check if SmartRelationshipCreator modal is rendered
      const smartRelationshipModal = screen.queryByTestId('smart-relationship-modal')

      expect(smartRelationshipModal).toBeTruthy()
    })

    it('should pass correct focusPersonId to SmartRelationshipCreator', async () => {
      modal.open(2, 'edit') // Open modal for Jane Smith (id: 2)

      const { container } = render(PersonModal)

      const addFromFacebookButton = screen.getByTestId('add-from-facebook-button')
      await fireEvent.click(addFromFacebookButton)

      // Check if SmartRelationshipCreator shows correct person name
      const modalTitle = screen.queryByText(/Add Family Member for Jane Smith/i)

      expect(modalTitle).toBeTruthy()
    })

    it('should close SmartRelationshipCreator when user cancels', async () => {
      modal.open(1, 'edit')

      const { container } = render(PersonModal)

      // Open SmartRelationshipCreator
      const addFromFacebookButton = screen.getByTestId('add-from-facebook-button')
      await fireEvent.click(addFromFacebookButton)

      let smartRelationshipModal = screen.queryByTestId('smart-relationship-modal')
      expect(smartRelationshipModal).toBeTruthy()

      // Click cancel button
      const cancelButton = screen.getAllByText('Cancel').find(btn =>
        btn.closest('[data-testid="smart-relationship-modal"]')
      )
      await fireEvent.click(cancelButton)

      // Modal should be closed
      smartRelationshipModal = screen.queryByTestId('smart-relationship-modal')
      expect(smartRelationshipModal).toBeFalsy()
    })
  })

  describe.skip('Modal stacking - TEMPORARILY DISABLED', () => {
    it('should render SmartRelationshipCreator on top of PersonModal', async () => {
      modal.open(1, 'edit')

      const { container } = render(PersonModal)

      const addFromFacebookButton = screen.getByTestId('add-from-facebook-button')
      await fireEvent.click(addFromFacebookButton)

      // Both modals should be visible
      const personModal = container.querySelector('.modal-backdrop')
      const smartRelationshipModal = screen.queryByTestId('smart-relationship-modal')

      expect(personModal).toBeTruthy()
      expect(smartRelationshipModal).toBeTruthy()

      // SmartRelationshipCreator modal should exist and be rendered
      // (z-index is verified in CSS: SmartRelationshipCreator has z-index: 2000, PersonModal has z-index: 1000)
      const smartModalBackdrop = smartRelationshipModal.closest('.modal-backdrop')
      expect(smartModalBackdrop).toBeTruthy()
    })
  })

  describe.skip('Accessibility - TEMPORARILY DISABLED', () => {
    it('should have proper ARIA label for "Add from Facebook" button', async () => {
      modal.open(1, 'edit')

      const { container } = render(PersonModal)

      const addFromFacebookButton = screen.getByTestId('add-from-facebook-button')

      expect(addFromFacebookButton.getAttribute('aria-label')).toBeTruthy()
      expect(addFromFacebookButton.getAttribute('aria-label')).toContain('Add family member from Facebook')
    })
  })

  describe('Add from Facebook button hidden (temporary)', () => {
    it('should NOT display "Add from Facebook" button in relationships section on desktop', () => {
      modal.open(1, 'edit')

      const { container } = render(PersonModal)

      const addFromFacebookButton = screen.queryByTestId('add-from-facebook-button')
      expect(addFromFacebookButton).toBeFalsy()
    })

    it('should NOT display "Add from Facebook" button in relationships section on mobile', () => {
      // Set mobile width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })

      modal.open(1, 'edit')

      const { container } = render(PersonModal)

      const addFromFacebookButton = screen.queryByTestId('add-from-facebook-button')
      expect(addFromFacebookButton).toBeFalsy()
    })
  })
})
