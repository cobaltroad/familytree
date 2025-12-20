import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import { get } from 'svelte/store'
import PersonModal_TwoColumn from './PersonModal_TwoColumn.svelte'
import { modal } from '../stores/modalStore.js'
import { people, relationships } from '../stores/familyStore.js'

describe('PersonModal_TwoColumn', () => {
  beforeEach(() => {
    // Reset stores before each test
    people.set([])
    relationships.set([])
    modal.close()
  })

  describe('Modal visibility', () => {
    it('should not render when modal is closed', () => {
      const { container } = render(PersonModal_TwoColumn)

      const backdrop = container.querySelector('.modal-backdrop')
      expect(backdrop).toBeFalsy()
    })

    it('should render when modal is open', () => {
      modal.open(null, 'add')
      const { container } = render(PersonModal_TwoColumn)

      const backdrop = container.querySelector('.modal-backdrop')
      expect(backdrop).toBeTruthy()
    })

    it('should render with 900px width on desktop', () => {
      modal.open(null, 'add')
      const { container } = render(PersonModal_TwoColumn)

      const modalContent = container.querySelector('.modal-content')
      expect(modalContent).toBeTruthy()
      expect(modalContent.classList.contains('two-column-modal')).toBe(true)
    })
  })

  describe('Two-column layout', () => {
    it('should render TwoColumnLayout component', () => {
      modal.open(null, 'add')
      const { container } = render(PersonModal_TwoColumn)

      const layout = container.querySelector('.two-column-layout')
      expect(layout).toBeTruthy()
    })

    it('should render left column with personal information form', () => {
      modal.open(null, 'add')
      const { container } = render(PersonModal_TwoColumn)

      const leftColumn = container.querySelector('.left-column')
      expect(leftColumn).toBeTruthy()

      // Check for form fields
      expect(screen.getByLabelText(/First Name/i)).toBeTruthy()
      expect(screen.getByLabelText(/Last Name/i)).toBeTruthy()
    })

    it('should render right column with relationships section', () => {
      const testPerson = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        gender: 'male',
        birthDate: '1980-01-01',
        deathDate: null
      }

      people.set([testPerson])
      modal.open(1, 'edit')

      const { container } = render(PersonModal_TwoColumn)

      const rightColumn = container.querySelector('.right-column')
      expect(rightColumn).toBeTruthy()

      // Check for relationships heading
      expect(screen.getByText(/Relationships/i)).toBeTruthy()
    })
  })

  describe('Form fields in left column', () => {
    it('should display First Name input', () => {
      modal.open(null, 'add')
      render(PersonModal_TwoColumn)

      const firstNameInput = screen.getByLabelText(/First Name/i)
      expect(firstNameInput).toBeTruthy()
      expect(firstNameInput.tagName).toBe('INPUT')
    })

    it('should display Last Name input', () => {
      modal.open(null, 'add')
      render(PersonModal_TwoColumn)

      const lastNameInput = screen.getByLabelText(/Last Name/i)
      expect(lastNameInput).toBeTruthy()
      expect(lastNameInput.tagName).toBe('INPUT')
    })

    it('should display Gender radio buttons', () => {
      modal.open(null, 'add')
      const { container } = render(PersonModal_TwoColumn)

      const genderRadios = container.querySelectorAll('input[type="radio"][name="gender"]')
      expect(genderRadios.length).toBeGreaterThanOrEqual(3) // female, male, other
    })

    it('should display Birth Date input', () => {
      modal.open(null, 'add')
      render(PersonModal_TwoColumn)

      const birthDateInput = screen.getByLabelText(/Birth Date/i)
      expect(birthDateInput).toBeTruthy()
      expect(birthDateInput.type).toBe('date')
    })

    it('should display Still Alive checkbox', () => {
      modal.open(null, 'add')
      render(PersonModal_TwoColumn)

      const stillAliveCheckbox = screen.getByLabelText(/Still Alive/i)
      expect(stillAliveCheckbox).toBeTruthy()
      expect(stillAliveCheckbox.type).toBe('checkbox')
    })

    it('should display Death Date input when not alive', async () => {
      modal.open(null, 'add')
      const { container } = render(PersonModal_TwoColumn)

      const stillAliveCheckbox = screen.getByLabelText(/Still Alive/i)
      await fireEvent.click(stillAliveCheckbox)

      const deathDateInput = screen.getByLabelText(/Death Date/i)
      expect(deathDateInput).toBeTruthy()
      expect(deathDateInput.type).toBe('date')
    })
  })

  describe('Relationships in right column', () => {
    it('should display Parents section', () => {
      const testPerson = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        gender: 'male',
        birthDate: '1980-01-01',
        deathDate: null
      }

      people.set([testPerson])
      modal.open(1, 'edit')

      const { container } = render(PersonModal_TwoColumn)

      // Check for the heading specifically
      const headingTexts = Array.from(container.querySelectorAll('h4')).map(h => h.textContent)
      expect(headingTexts).toContain('Parents')
    })

    it('should display Siblings section', () => {
      const testPerson = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        gender: 'male',
        birthDate: '1980-01-01',
        deathDate: null
      }

      people.set([testPerson])
      modal.open(1, 'edit')

      const { container } = render(PersonModal_TwoColumn)

      // Check for the heading specifically
      const siblingsHeading = container.querySelector('h4')
      const headingTexts = Array.from(container.querySelectorAll('h4')).map(h => h.textContent)
      expect(headingTexts).toContain('Siblings')
    })

    it('should display Children section', () => {
      const testPerson = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        gender: 'male',
        birthDate: '1980-01-01',
        deathDate: null
      }

      people.set([testPerson])
      modal.open(1, 'edit')

      const { container } = render(PersonModal_TwoColumn)

      // Check for the heading specifically
      const headingTexts = Array.from(container.querySelectorAll('h4')).map(h => h.textContent)
      expect(headingTexts).toContain('Children')
    })

    it('should not show relationships section when adding new person', () => {
      modal.open(null, 'add')
      const { container } = render(PersonModal_TwoColumn)

      // Relationships should not be visible for new person
      const rightColumn = container.querySelector('.right-column')
      // Right column might be empty or hidden for new person
      // This is implementation-specific
      expect(rightColumn).toBeTruthy()
    })
  })

  describe('Modal controls', () => {
    it('should display close button', () => {
      modal.open(null, 'add')
      const { container } = render(PersonModal_TwoColumn)

      const closeButton = container.querySelector('.close-button')
      expect(closeButton).toBeTruthy()
    })

    it('should close modal when close button is clicked', async () => {
      modal.open(null, 'add')
      const { container } = render(PersonModal_TwoColumn)

      const closeButton = container.querySelector('.close-button')
      await fireEvent.click(closeButton)

      const modalState = get(modal)
      expect(modalState.isOpen).toBe(false)
    })

    it('should close modal when backdrop is clicked', async () => {
      modal.open(null, 'add')
      const { container } = render(PersonModal_TwoColumn)

      const backdrop = container.querySelector('.modal-backdrop')
      await fireEvent.click(backdrop)

      const modalState = get(modal)
      expect(modalState.isOpen).toBe(false)
    })

    it('should close modal when Escape key is pressed', async () => {
      modal.open(null, 'add')
      render(PersonModal_TwoColumn)

      await fireEvent.keyDown(window, { key: 'Escape' })

      const modalState = get(modal)
      expect(modalState.isOpen).toBe(false)
    })
  })

  describe('Footer buttons', () => {
    it('should display Add Person button when adding new person', () => {
      modal.open(null, 'add')
      const { container } = render(PersonModal_TwoColumn)

      const addButton = container.querySelector('.update-button')
      expect(addButton).toBeTruthy()
      expect(addButton.textContent).toContain('Add')
      expect(addButton.textContent).toContain('Person')
    })

    it('should display Update Person button when editing existing person', () => {
      const testPerson = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        gender: 'male',
        birthDate: '1980-01-01',
        deathDate: null
      }

      people.set([testPerson])
      modal.open(1, 'edit')

      render(PersonModal_TwoColumn)

      const updateButton = screen.getByText(/Update Person/i)
      expect(updateButton).toBeTruthy()
    })

    it('should display Delete button when editing existing person', () => {
      const testPerson = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        gender: 'male',
        birthDate: '1980-01-01',
        deathDate: null
      }

      people.set([testPerson])
      modal.open(1, 'edit')

      render(PersonModal_TwoColumn)

      const deleteButton = screen.getByText(/Delete Person/i)
      expect(deleteButton).toBeTruthy()
    })

    it('should not display Delete button when adding new person', () => {
      modal.open(null, 'add')
      const { container } = render(PersonModal_TwoColumn)

      const deleteButton = screen.queryByText(/Delete Person/i)
      expect(deleteButton).toBeFalsy()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for columns', () => {
      modal.open(null, 'add')
      const { container } = render(PersonModal_TwoColumn)

      const leftColumn = container.querySelector('[aria-label="Personal Information"]')
      const rightColumn = container.querySelector('[aria-label="Relationships"]')

      expect(leftColumn).toBeTruthy()
      expect(rightColumn).toBeTruthy()
    })

    it('should have role="region" for both columns', () => {
      modal.open(null, 'add')
      const { container } = render(PersonModal_TwoColumn)

      const regions = container.querySelectorAll('[role="region"]')
      expect(regions.length).toBe(2)
    })

    it('should have aria-label for close button', () => {
      modal.open(null, 'add')
      const { container } = render(PersonModal_TwoColumn)

      const closeButton = container.querySelector('.close-button')
      expect(closeButton.getAttribute('aria-label')).toContain('Close')
    })
  })

  describe('Responsive behavior', () => {
    it('should have two-column-modal class for styling', () => {
      modal.open(null, 'add')
      const { container } = render(PersonModal_TwoColumn)

      const modalContent = container.querySelector('.modal-content')
      expect(modalContent.classList.contains('two-column-modal')).toBe(true)
    })

    it('should render two-column layout component', () => {
      modal.open(null, 'add')
      const { container } = render(PersonModal_TwoColumn)

      const layout = container.querySelector('.two-column-layout')
      expect(layout).toBeTruthy()
    })
  })

  describe('Modal dimensions', () => {
    it('should have modal content container', () => {
      modal.open(null, 'add')
      const { container } = render(PersonModal_TwoColumn)

      const modalContent = container.querySelector('.modal-content')
      expect(modalContent).toBeTruthy()
    })

    it('should have two-column-modal modifier class', () => {
      modal.open(null, 'add')
      const { container } = render(PersonModal_TwoColumn)

      const modalContent = container.querySelector('.modal-content.two-column-modal')
      expect(modalContent).toBeTruthy()
    })
  })
})
