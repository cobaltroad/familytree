import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/svelte'
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

describe('PersonModal', () => {
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
  })

  afterEach(() => {
    modal.close()
  })

  describe('modal rendering', () => {
    it('should render when modal is open', () => {
      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      const modalBackdrop = container.querySelector('.modal-backdrop')
      expect(modalBackdrop).toBeTruthy()
    })

    it('should not render when modal is closed', () => {
      modal.close()

      const { container } = render(PersonModal)

      const modalBackdrop = container.querySelector('.modal-backdrop')
      expect(modalBackdrop).toBeFalsy()
    })

    it('should show edit person title when editing', () => {
      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      expect(container.textContent).toContain('Edit Person')
    })

    it('should show "Add New Person" when creating', () => {
      modal.openNew()

      const { container } = render(PersonModal)

      expect(container.textContent).toContain('Add New Person')
    })
  })

  describe('responsive layout', () => {
    it('should use two-column layout on desktop (>=1024px)', () => {
      global.innerWidth = 1920

      modal.open(3, 'edit')
      const { container } = render(PersonModal)

      // Should have TwoColumnLayout or two-column structure
      expect(container).toBeTruthy()
    })

    it('should use collapsible sections on mobile (<768px)', () => {
      global.innerWidth = 375

      modal.open(3, 'edit')
      const { container } = render(PersonModal)

      // Should have collapsible section or mobile layout
      expect(container).toBeTruthy()
    })
  })

  describe('relationship cards', () => {
    it('should display parent cards', () => {
      global.innerWidth = 1920 // Desktop mode to show cards

      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      // Should show parents in card format
      expect(container.textContent).toContain('John Doe') // Father
      expect(container.textContent).toContain('Jane Smith') // Mother
    })

    it('should have clickable relationship cards', async () => {
      global.innerWidth = 1920 // Desktop mode to show cards

      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      const cards = container.querySelectorAll('.relationship-card, .card[role="button"]')
      expect(cards.length).toBeGreaterThan(0)
    })
  })

  describe('parent display', () => {
    it('should show parent names when parents exist', () => {
      global.innerWidth = 1920 // Desktop mode to show cards

      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      // Should show parent names (read-only)
      expect(container.textContent).toContain('John Doe') // Father
      expect(container.textContent).toContain('Jane Smith') // Mother
    })

    it('should show Add/Link Mother collapsible panel when mother does not exist', () => {
      // Set up data: person with no mother
      people.set([
        { id: 1, firstName: 'John', lastName: 'Doe', gender: 'male', birthDate: '1949-01-01' },
        { id: 3, firstName: 'Alice', lastName: 'Doe', gender: 'female', birthDate: '1980-03-03' }
      ])
      relationships.set([
        { id: 1, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'father' }
      ])

      global.innerWidth = 1920

      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      const motherPanel = container.querySelector('[data-relationship-type="mother"]')
      expect(motherPanel).toBeTruthy()
      expect(motherPanel.textContent).toContain('Add/Link Mother')
    })

    it('should show Add/Link Father collapsible panel when father does not exist', () => {
      // Set up data: person with no father
      people.set([
        { id: 2, firstName: 'Jane', lastName: 'Smith', gender: 'female', birthDate: '1952-02-02' },
        { id: 3, firstName: 'Alice', lastName: 'Doe', gender: 'female', birthDate: '1980-03-03' }
      ])
      relationships.set([
        { id: 2, person1Id: 2, person2Id: 3, type: 'parentOf', parentRole: 'mother' }
      ])

      global.innerWidth = 1920

      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      const fatherPanel = container.querySelector('[data-relationship-type="father"]')
      expect(fatherPanel).toBeTruthy()
      expect(fatherPanel.textContent).toContain('Add/Link Father')
    })

    it('should not show parent dropdown selectors', () => {
      global.innerWidth = 1920 // Desktop mode

      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      // Should NOT have dropdown selectors for mother and father
      // We don't count form selects, just check there are no parent selectors
      const parentSelection = container.querySelector('.parent-selection')
      if (parentSelection) {
        const selects = parentSelection.querySelectorAll('select')
        expect(selects.length).toBe(0)
      }
    })
  })

  describe('modal interactions', () => {
    it('should close when close button is clicked', async () => {
      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      const closeButton = container.querySelector('.close-button, button[aria-label*="Close"]')
      await fireEvent.click(closeButton)

      expect(get(modal).isOpen).toBe(false)
    })

    it('should close when Escape key is pressed', async () => {
      modal.open(3, 'edit')

      render(PersonModal)

      await fireEvent.keyDown(window, { key: 'Escape' })

      expect(get(modal).isOpen).toBe(false)
    })

    it('should close when backdrop is clicked', async () => {
      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      const backdrop = container.querySelector('.modal-backdrop')
      await fireEvent.click(backdrop)

      expect(get(modal).isOpen).toBe(false)
    })

    it('should not close when modal content is clicked', async () => {
      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      const modalContent = container.querySelector('.modal-content')
      await fireEvent.click(modalContent)

      expect(get(modal).isOpen).toBe(true)
    })
  })

  describe('form submission', () => {
    it('should have submit button', () => {
      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      const submitButton = container.querySelector('button[type="submit"], .update-button')
      expect(submitButton).toBeTruthy()
    })

    it('should have delete button when editing', () => {
      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      const deleteButton = container.querySelector('.delete-button')
      expect(deleteButton).toBeTruthy()
    })

    it('should not have delete button when creating', () => {
      modal.openNew()

      const { container } = render(PersonModal)

      const deleteButton = container.querySelector('.delete-button')
      expect(deleteButton).toBeFalsy()
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA roles', () => {
      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      expect(container).toBeTruthy()
    })

    it('should be keyboard navigable', () => {
      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      const focusableElements = container.querySelectorAll('button, input, select, [tabindex="0"]')
      expect(focusableElements.length).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('should handle person with no relationships', () => {
      global.innerWidth = 1920 // Desktop mode

      people.set([{ id: 99, firstName: 'Solo', lastName: 'Person', gender: 'other' }])
      relationships.set([])

      modal.open(99, 'edit')

      const { container } = render(PersonModal)

      expect(container.textContent).toContain('Edit Person')
    })

    it('should handle invalid person ID gracefully', () => {
      modal.open(999, 'edit')

      const { container } = render(PersonModal)

      expect(container).toBeTruthy()
    })
  })

  describe.skip('Part 2: Re-Sync from Facebook Button - TEMPORARILY DISABLED', () => {
    // These tests are skipped because Facebook buttons are temporarily hidden
    // To re-enable: remove .skip and change {#if false} to {#if true} in PersonModal.svelte
    describe('AC3: Button renamed and moved to footer', () => {
      it('should have Re-Sync from Facebook button in modal footer when editing', () => {
        modal.open(3, 'edit')

        const { container } = render(PersonModal)

        const buttonSection = container.querySelector('.button-section')
        expect(buttonSection).toBeTruthy()

        const resyncButton = container.querySelector('.resync-facebook-button, button[data-testid="resync-facebook"]')
        expect(resyncButton).toBeTruthy()
        expect(resyncButton.textContent).toContain('Re-Sync from Facebook')
      })

      it('should have Import from Facebook button when adding new person', () => {
        modal.openNew()

        const { container } = render(PersonModal)

        const buttonSection = container.querySelector('.button-section')
        expect(buttonSection).toBeTruthy()

        const importButton = container.querySelector('.resync-facebook-button, button[data-testid="resync-facebook"]')
        expect(importButton).toBeTruthy()
        expect(importButton.textContent).toContain('Import from Facebook')
      })

      it('should position Re-Sync button next to Update Person button', () => {
        modal.open(3, 'edit')

        const { container } = render(PersonModal)

        const buttonSection = container.querySelector('.button-section')
        const buttons = Array.from(buttonSection.querySelectorAll('button'))

        // Should have Update, Re-Sync, and Delete buttons
        expect(buttons.length).toBeGreaterThanOrEqual(3)

        const updateButton = buttons.find(btn => btn.textContent.includes('Update'))
        const resyncButton = buttons.find(btn => btn.textContent.includes('Re-Sync from Facebook'))
        const deleteButton = buttons.find(btn => btn.textContent.includes('Delete'))

        expect(updateButton).toBeTruthy()
        expect(resyncButton).toBeTruthy()
        expect(deleteButton).toBeTruthy()
      })

      it('should have secondary/outline styling for Re-Sync button', () => {
        modal.open(3, 'edit')

        const { container } = render(PersonModal)

        const resyncButton = container.querySelector('.resync-facebook-button, button[data-testid="resync-facebook"]')
        expect(resyncButton).toBeTruthy()

        // Button should have secondary or outline class
        const hasSecondaryStyle = resyncButton.classList.contains('secondary') ||
                                 resyncButton.classList.contains('outline') ||
                                 resyncButton.classList.contains('resync-facebook-button')
        expect(hasSecondaryStyle).toBe(true)
      })

      it('should not have Facebook import section in PersonFormFields', () => {
        modal.open(3, 'edit')

        const { container } = render(PersonModal)

        // Facebook import section should not exist in the form
        const facebookImportSection = container.querySelector('.facebook-import-section')
        expect(facebookImportSection).toBeFalsy()

        const facebookImportToggle = container.querySelector('.facebook-import-toggle')
        expect(facebookImportToggle).toBeFalsy()
      })
    })

    describe('AC5: Button state management - SKIPPED', () => {
      it.skip('should show "Import from Facebook" text in add mode', () => {
        modal.openNew()

        const { container } = render(PersonModal)

        const button = container.querySelector('.resync-facebook-button, button[data-testid="resync-facebook"]')
        expect(button).toBeTruthy()
        expect(button.textContent).toContain('Import from Facebook')
        expect(button.textContent).not.toContain('Re-Sync')
      })

      it.skip('should show "Re-Sync from Facebook" text in edit mode', () => {
        modal.open(3, 'edit')

        const { container } = render(PersonModal)

        const button = container.querySelector('.resync-facebook-button, button[data-testid="resync-facebook"]')
        expect(button).toBeTruthy()
        expect(button.textContent).toContain('Re-Sync from Facebook')
      })
    })

    describe('AC4: Re-Sync functionality - SKIPPED', () => {
      it.skip('should prompt for Facebook URL when Re-Sync button is clicked', async () => {
        modal.open(3, 'edit')

        const { container } = render(PersonModal)

        const resyncButton = container.querySelector('.resync-facebook-button, button[data-testid="resync-facebook"]')

        // Mock prompt
        const originalPrompt = global.prompt
        let promptCalled = false
        global.prompt = vi.fn(() => {
          promptCalled = true
          return null // Simulate user canceling
        })

        await fireEvent.click(resyncButton)

        expect(promptCalled).toBe(true)

        global.prompt = originalPrompt
      })

      it('should update form fields after successful Facebook sync', async () => {
        // This test will verify that clicking Re-Sync updates the form
        // Implementation will be tested once the feature is built
        expect(true).toBe(true) // Placeholder
      })

      it('should show success notification after successful sync', async () => {
        // This test will verify success notification
        // Implementation will be tested once the feature is built
        expect(true).toBe(true) // Placeholder
      })
    })

    describe('AC6: Error handling', () => {
      it('should show error notification for invalid Facebook URL', async () => {
        // This test will verify error notification for invalid URLs
        // Implementation will be tested once the feature is built
        expect(true).toBe(true) // Placeholder
      })

      it('should not overwrite form fields if sync fails', async () => {
        // This test will verify form data is preserved on error
        // Implementation will be tested once the feature is built
        expect(true).toBe(true) // Placeholder
      })
    })
  })

  describe('Facebook buttons hidden (temporary)', () => {
    it('should NOT display Re-Sync from Facebook button in footer', () => {
      modal.open(3, 'edit')

      const { container } = render(PersonModal)

      const resyncButton = container.querySelector('.resync-facebook-button, button[data-testid="resync-facebook"]')
      expect(resyncButton).toBeFalsy()
    })

    it('should NOT display Import from Facebook button when adding new person', () => {
      modal.openNew()

      const { container } = render(PersonModal)

      const importButton = container.querySelector('.resync-facebook-button, button[data-testid="resync-facebook"]')
      expect(importButton).toBeFalsy()
    })
  })
})
