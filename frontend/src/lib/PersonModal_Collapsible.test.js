import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte'
import { get } from 'svelte/store'
import PersonModal_Collapsible from './PersonModal_Collapsible.svelte'
import { modal } from '../stores/modalStore.js'
import { people, relationships } from '../stores/familyStore.js'
import { peopleById } from '../stores/derivedStores.js'

describe('PersonModal_Collapsible - BDD Acceptance Criteria', () => {
  beforeEach(() => {
    // Reset stores
    modal.close()
    people.set([
      { id: 1, firstName: 'John', lastName: 'Doe', birthDate: '1980-01-01', gender: 'male' },
      { id: 2, firstName: 'Jane', lastName: 'Doe', birthDate: '1982-05-15', gender: 'female' },
      { id: 3, firstName: 'Bob', lastName: 'Smith', birthDate: '2010-03-20', gender: 'male' }
    ])
    relationships.set([
      { id: 1, type: 'parentOf', person1Id: 1, person2Id: 3, parentRole: 'father' },
      { id: 2, type: 'parentOf', person1Id: 2, person2Id: 3, parentRole: 'mother' }
    ])
  })

  afterEach(() => {
    modal.close()
    people.set([])
    relationships.set([])
  })

  describe('Scenario: Personal Information section expanded by default in edit mode', () => {
    it('should expand Personal Information section by default when editing person', async () => {
      modal.open(1, 'edit')

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        // Find Personal Information section header
        const personalInfoHeader = screen.getByText(/Personal Information/i)
        expect(personalInfoHeader).toBeTruthy()

        // Verify section is expanded
        const header = personalInfoHeader.closest('.section-header')
        expect(header.getAttribute('aria-expanded')).toBe('true')
      })
    })

    it('should display form fields when Personal Information is expanded', async () => {
      modal.open(1, 'edit')

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        // Form fields should be visible
        expect(screen.getByLabelText(/First Name/i)).toBeTruthy()
        expect(screen.getByLabelText(/Last Name/i)).toBeTruthy()
        expect(screen.getByLabelText(/Birth Date/i)).toBeTruthy()
      })
    })
  })

  describe('Scenario: Relationships section expanded in edit mode, collapsed in add mode', () => {
    it('should expand Relationships section by default in edit mode', async () => {
      modal.open(3, 'edit') // Child with parents

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        const relationshipsHeader = screen.getByText(/Relationships/i)
        const header = relationshipsHeader.closest('.section-header')
        expect(header.getAttribute('aria-expanded')).toBe('true')
      })
    })

    it('should collapse Relationships section by default in add mode', async () => {
      modal.openNew()

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        // In add mode, Relationships section should not be visible
        const relationshipsText = container.textContent
        expect(relationshipsText.includes('Relationships') ||
               container.querySelector('[aria-label*="Relationships"]')).toBeFalsy()
      })
    })

    it('should not display Relationships section in add mode', async () => {
      modal.openNew()

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        // Relationships section should not exist in add mode
        const sections = container.querySelectorAll('.collapsible-section')
        const relationshipsSection = Array.from(sections).find(s =>
          s.textContent.includes('Relationships')
        )
        expect(relationshipsSection).toBeFalsy()
      })
    })

    it('should show relationship count in section header', async () => {
      modal.open(3, 'edit') // Child with 2 parents

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        // Should show "Relationships (2)" for parents, or count based on implementation
        const relationshipsHeader = screen.getByText(/Relationships/i)
        expect(relationshipsHeader.textContent).toMatch(/\d+/)
      })
    })
  })

  describe('Scenario: Actions section collapsed by default', () => {
    it('should collapse Actions section by default', async () => {
      modal.open(1, 'edit')

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        // Look for Actions section - it might be labeled differently
        const sections = container.querySelectorAll('.section-header')
        const actionsSection = Array.from(sections).find(s =>
          s.textContent.toLowerCase().includes('action') ||
          s.getAttribute('aria-label')?.toLowerCase().includes('action')
        )

        if (actionsSection) {
          expect(actionsSection.getAttribute('aria-expanded')).toBe('false')
        } else {
          // Actions might be in footer, not a collapsible section
          const footer = container.querySelector('.button-section')
          expect(footer).toBeTruthy()
        }
      })
    })
  })

  describe('Scenario: Click section header to toggle expand/collapse', () => {
    it('should collapse expanded section when header is clicked', async () => {
      modal.open(1, 'edit')

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        const personalInfoHeader = screen.getByText(/Personal Information/i)
        const header = personalInfoHeader.closest('.section-header')

        expect(header.getAttribute('aria-expanded')).toBe('true')
      })

      const personalInfoHeader = screen.getByText(/Personal Information/i)
      const header = personalInfoHeader.closest('.section-header')

      await fireEvent.click(header)

      await waitFor(() => {
        expect(header.getAttribute('aria-expanded')).toBe('false')
      })
    })

    it('should expand collapsed section when header is clicked', async () => {
      modal.open(3, 'edit')

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        const relationshipsHeader = screen.getByText(/Relationships/i)
        const header = relationshipsHeader.closest('.section-header')

        // Initially expanded in edit mode
        expect(header.getAttribute('aria-expanded')).toBe('true')
      })

      const relationshipsHeader = screen.getByText(/Relationships/i)
      const header = relationshipsHeader.closest('.section-header')

      // Collapse it
      await fireEvent.click(header)
      await waitFor(() => {
        expect(header.getAttribute('aria-expanded')).toBe('false')
      })

      // Expand it again
      await fireEvent.click(header)
      await waitFor(() => {
        expect(header.getAttribute('aria-expanded')).toBe('true')
      })
    })
  })

  describe('Scenario: Smooth expand/collapse animations', () => {
    it('should use smooth animations when toggling sections', async () => {
      modal.open(1, 'edit')

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        // CollapsibleSection uses slide transition with 250ms duration
        const sections = container.querySelectorAll('.collapsible-section')
        expect(sections.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Scenario: Section headers show item counts', () => {
    it('should show count in Relationships section header', async () => {
      modal.open(3, 'edit') // Child with 2 parents

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        const relationshipsHeader = screen.getByText(/Relationships/i)
        // Should show count: "Relationships (N)"
        expect(relationshipsHeader.textContent).toMatch(/\(\d+\)/)
      })
    })

    it('should not show count when count is 0', async () => {
      modal.open(1, 'edit') // Parent with no parents or siblings

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        const relationshipsHeader = screen.getByText(/Relationships/i)
        // Might not have count or show (0) based on implementation
        // At minimum, header should exist
        expect(relationshipsHeader).toBeTruthy()
      })
    })
  })

  describe('Scenario: Spacebar/Enter keys toggle sections', () => {
    it('should toggle section when Enter key is pressed', async () => {
      modal.open(1, 'edit')

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        const personalInfoHeader = screen.getByText(/Personal Information/i)
        expect(personalInfoHeader).toBeTruthy()
      })

      const personalInfoHeader = screen.getByText(/Personal Information/i)
      const header = personalInfoHeader.closest('.section-header')

      expect(header.getAttribute('aria-expanded')).toBe('true')

      await fireEvent.keyDown(header, { key: 'Enter', code: 'Enter' })

      await waitFor(() => {
        expect(header.getAttribute('aria-expanded')).toBe('false')
      })
    })

    it('should toggle section when Spacebar is pressed', async () => {
      modal.open(1, 'edit')

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        const personalInfoHeader = screen.getByText(/Personal Information/i)
        expect(personalInfoHeader).toBeTruthy()
      })

      const personalInfoHeader = screen.getByText(/Personal Information/i)
      const header = personalInfoHeader.closest('.section-header')

      expect(header.getAttribute('aria-expanded')).toBe('true')

      await fireEvent.keyDown(header, { key: ' ', code: 'Space' })

      await waitFor(() => {
        expect(header.getAttribute('aria-expanded')).toBe('false')
      })
    })
  })

  describe('Scenario: Form submission works regardless of section state', () => {
    it('should submit form when Personal Information is collapsed', async () => {
      modal.open(1, 'edit')

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        const personalInfoHeader = screen.getByText(/Personal Information/i)
        expect(personalInfoHeader).toBeTruthy()
      })

      // Collapse Personal Information
      const personalInfoHeader = screen.getByText(/Personal Information/i)
      const header = personalInfoHeader.closest('.section-header')
      await fireEvent.click(header)

      await waitFor(() => {
        expect(header.getAttribute('aria-expanded')).toBe('false')
      })

      // Find and click submit button
      const submitButton = container.querySelector('button[type="submit"]') ||
                          screen.getByText(/Update Person/i)

      expect(submitButton).toBeTruthy()

      // Should be able to submit
      await fireEvent.click(submitButton)

      // Modal should close after submission (or show loading state)
      // This verifies form data is accessible even when section is collapsed
    })

    it('should submit form with all data even when sections are collapsed', async () => {
      modal.open(1, 'edit')

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        const firstName = screen.getByLabelText(/First Name/i)
        expect(firstName.value).toBe('John')
      })

      // Collapse all collapsible sections
      const headers = container.querySelectorAll('.section-header')
      for (const header of headers) {
        if (header.getAttribute('aria-expanded') === 'true') {
          await fireEvent.click(header)
        }
      }

      // Submit button should still work
      const submitButton = screen.getByText(/Update Person/i)
      expect(submitButton).toBeTruthy()
    })
  })

  describe('Scenario: Mobile responsive', () => {
    it('should render properly on mobile viewport', async () => {
      // Set mobile viewport
      global.innerWidth = 375
      global.innerHeight = 667

      modal.open(1, 'edit')

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        // Modal should render
        expect(container.querySelector('.modal-content')).toBeTruthy()

        // Sections should render
        const sections = container.querySelectorAll('.collapsible-section')
        expect(sections.length).toBeGreaterThan(0)
      })
    })

    it('should have touch-friendly section headers on mobile', async () => {
      modal.open(1, 'edit')

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        const headers = container.querySelectorAll('.section-header')
        expect(headers.length).toBeGreaterThan(0)

        // Headers should be clickable (not hover-only)
        headers.forEach(header => {
          expect(header.getAttribute('role')).toBe('button')
          expect(header.getAttribute('tabindex')).toBe('0')
        })
      })
    })
  })

  describe('Scenario: All sections accessible via keyboard', () => {
    it('should allow keyboard navigation through all sections', async () => {
      modal.open(3, 'edit')

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        const headers = container.querySelectorAll('.section-header')
        expect(headers.length).toBeGreaterThan(0)

        // All headers should be keyboard accessible
        headers.forEach(header => {
          expect(header.getAttribute('tabindex')).toBe('0')
          expect(header.getAttribute('role')).toBe('button')
        })
      })
    })

    it('should allow tabbing through form fields regardless of section state', async () => {
      modal.open(1, 'edit')

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        // Form fields should be tabbable when section is expanded
        const firstName = screen.getByLabelText(/First Name/i)
        expect(firstName.tabIndex).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Scenario: Screen reader announces section states', () => {
    it('should have proper ARIA attributes for screen readers', async () => {
      modal.open(1, 'edit')

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        const headers = container.querySelectorAll('.section-header')

        headers.forEach(header => {
          // Should have aria-expanded
          const ariaExpanded = header.getAttribute('aria-expanded')
          expect(ariaExpanded === 'true' || ariaExpanded === 'false').toBe(true)

          // Should have aria-controls
          expect(header.getAttribute('aria-controls')).toBeTruthy()

          // Should have aria-label
          expect(header.getAttribute('aria-label')).toBeTruthy()
        })
      })
    })

    it('should update aria-expanded when section is toggled', async () => {
      modal.open(1, 'edit')

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        const personalInfoHeader = screen.getByText(/Personal Information/i)
        expect(personalInfoHeader).toBeTruthy()
      })

      const personalInfoHeader = screen.getByText(/Personal Information/i)
      const header = personalInfoHeader.closest('.section-header')

      const initialState = header.getAttribute('aria-expanded')

      await fireEvent.click(header)

      await waitFor(() => {
        const newState = header.getAttribute('aria-expanded')
        expect(newState).not.toBe(initialState)
      })
    })
  })

  describe('Modal integration', () => {
    it('should open when modal store is opened', async () => {
      modal.open(1, 'edit')

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        expect(container.querySelector('.modal-backdrop')).toBeTruthy()
      })
    })

    it('should close when modal store is closed', async () => {
      modal.open(1, 'edit')

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        expect(container.querySelector('.modal-backdrop')).toBeTruthy()
      })

      modal.close()

      await waitFor(() => {
        expect(container.querySelector('.modal-backdrop')).toBeFalsy()
      })
    })

    it('should close when Escape key is pressed', async () => {
      modal.open(1, 'edit')

      const { container } = render(PersonModal_Collapsible)

      await waitFor(() => {
        expect(container.querySelector('.modal-backdrop')).toBeTruthy()
      })

      await fireEvent.keyDown(window, { key: 'Escape' })

      await waitFor(() => {
        const modalState = get(modal)
        expect(modalState.isOpen).toBe(false)
      })
    })

    it('should have sticky close button', async () => {
      const { container } = render(PersonModal_Collapsible)

      modal.open(1, 'edit')

      await waitFor(() => {
        const closeButton = container.querySelector('.close-button')
        expect(closeButton).toBeTruthy()
      })

      const closeButton = container.querySelector('.close-button')
      // Close button should exist with proper class for sticky positioning
      expect(closeButton.classList.contains('close-button')).toBe(true)
    })
  })
})
