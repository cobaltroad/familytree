import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/svelte'
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

describe('RelationshipCard', () => {
  const mockPerson = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '1980-05-15',
    deathDate: null,
    gender: 'male'
  }

  const mockDeceasedPerson = {
    id: 2,
    firstName: 'Jane',
    lastName: 'Smith',
    birthDate: '1950-03-20',
    deathDate: '2020-12-01',
    gender: 'female'
  }

  describe('rendering', () => {
    it('should render person name', () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother'
        }
      })

      expect(container.textContent).toContain('John Doe')
    })

    it('should render relationship type', () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Father'
        }
      })

      expect(container.textContent).toContain('Father')
    })

    it('should render birth date when available', () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Sibling'
        }
      })

      expect(container.textContent).toContain('1980')
    })

    it('should render death date when person is deceased', () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: mockDeceasedPerson,
          relationshipType: 'Mother'
        }
      })

      expect(container.textContent).toContain('1950')
      expect(container.textContent).toContain('2020')
    })

    it('should show "present" when person is alive', () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Father'
        }
      })

      expect(container.textContent.toLowerCase()).toContain('present')
    })

    it('should display photo preview component', () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Sibling'
        }
      })

      // Should render PhotoPreview component
      const photoPreview = container.querySelector('.photo-preview-container, .photo-placeholder')
      expect(photoPreview).toBeTruthy()
    })

    it('should handle person without birth date', () => {
      const personNoDates = {
        id: 3,
        firstName: 'Bob',
        lastName: 'Jones',
        birthDate: null,
        deathDate: null,
        gender: 'male'
      }

      const { container } = render(RelationshipCard, {
        props: {
          person: personNoDates,
          relationshipType: 'Child'
        }
      })

      expect(container.textContent).toContain('Bob Jones')
    })
  })

  describe('interactivity', () => {
    it('should be clickable', async () => {
      const { container, component } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother'
        }
      })

      let clickEmitted = false
      component.$on('click', () => {
        clickEmitted = true
      })

      const card = container.querySelector('.relationship-card, .card, [role="button"]')
      expect(card).toBeTruthy()

      await fireEvent.click(card)
      expect(clickEmitted).toBe(true)
    })

    it('should emit person data when clicked', async () => {
      const { container, component } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Father'
        }
      })

      let emittedPerson = null
      component.$on('click', (event) => {
        emittedPerson = event.detail.person
      })

      const card = container.querySelector('.relationship-card, .card, [role="button"]')
      await fireEvent.click(card)

      expect(emittedPerson).toEqual(mockPerson)
    })

    it('should have role="button" for accessibility', () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Sibling'
        }
      })

      const card = container.querySelector('[role="button"]')
      expect(card).toBeTruthy()
    })

    it('should be keyboard accessible with tabindex', () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Child'
        }
      })

      const card = container.querySelector('[role="button"]')
      expect(card.getAttribute('tabindex')).toBe('0')
    })

    it('should handle Enter key press', async () => {
      const { container, component } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother'
        }
      })

      let clickEmitted = false
      component.$on('click', () => {
        clickEmitted = true
      })

      const card = container.querySelector('[role="button"]')
      await fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' })

      expect(clickEmitted).toBe(true)
    })

    it('should handle Space key press', async () => {
      const { container, component } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Father'
        }
      })

      let clickEmitted = false
      component.$on('click', () => {
        clickEmitted = true
      })

      const card = container.querySelector('[role="button"]')
      await fireEvent.keyDown(card, { key: ' ', code: 'Space' })

      expect(clickEmitted).toBe(true)
    })

    it('should not emit on other keys', async () => {
      const { container, component } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Sibling'
        }
      })

      let clickEmitted = false
      component.$on('click', () => {
        clickEmitted = true
      })

      const card = container.querySelector('[role="button"]')
      await fireEvent.keyDown(card, { key: 'a', code: 'KeyA' })

      expect(clickEmitted).toBe(false)
    })
  })

  describe('hover interactions', () => {
    it('should have hover class for elevation effect', () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother'
        }
      })

      const card = container.querySelector('.relationship-card, .card')
      expect(card).toBeTruthy()
      // Card should have styling that changes on hover
      // This will be tested via CSS classes
    })

    it('should show visual feedback on hover', async () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Father'
        }
      })

      const card = container.querySelector('[role="button"]')

      // Trigger hover event
      await fireEvent.mouseEnter(card)

      // Card should be in DOM and respond to hover
      expect(card).toBeTruthy()
    })
  })

  describe('accessibility (WCAG 2.1 AA)', () => {
    it('should have descriptive aria-label', () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother'
        }
      })

      const card = container.querySelector('[role="button"]')
      const ariaLabel = card.getAttribute('aria-label')

      expect(ariaLabel).toBeTruthy()
      expect(ariaLabel.toLowerCase()).toContain('john doe')
      expect(ariaLabel.toLowerCase()).toContain('mother')
    })

    it('should be focusable for keyboard navigation', () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Father'
        }
      })

      const card = container.querySelector('[role="button"]')
      expect(card.getAttribute('tabindex')).toBe('0')
    })

    it('should announce relationship type to screen readers', () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Sibling'
        }
      })

      const relationshipLabel = container.textContent
      expect(relationshipLabel).toContain('Sibling')
    })
  })

  describe('visual styling', () => {
    it('should have card class for styling', () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Child'
        }
      })

      const card = container.querySelector('.relationship-card, .card')
      expect(card).toBeTruthy()
    })

    it('should render with proper structure for flex layout', () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother'
        }
      })

      const card = container.querySelector('.relationship-card, .card')
      expect(card).toBeTruthy()
      expect(card.children.length).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('should handle very long names gracefully', () => {
      const longNamePerson = {
        id: 4,
        firstName: 'A'.repeat(50),
        lastName: 'B'.repeat(50),
        birthDate: '1990-01-01',
        deathDate: null,
        gender: 'other'
      }

      const { container } = render(RelationshipCard, {
        props: {
          person: longNamePerson,
          relationshipType: 'Sibling'
        }
      })

      expect(container.textContent).toContain('A'.repeat(50))
    })

    it('should handle missing person data gracefully', () => {
      const minimalPerson = {
        id: 5,
        firstName: 'Test',
        lastName: 'User',
        gender: ''
      }

      const { container } = render(RelationshipCard, {
        props: {
          person: minimalPerson,
          relationshipType: 'Unknown'
        }
      })

      expect(container.textContent).toContain('Test User')
    })

    it('should handle null person gracefully', () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: null,
          relationshipType: 'None'
        }
      })

      // Should render without crashing
      expect(container).toBeTruthy()
    })
  })

  describe('responsive behavior', () => {
    it('should render on mobile viewport', () => {
      global.innerWidth = 375
      global.innerHeight = 667

      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother'
        }
      })

      const card = container.querySelector('.relationship-card, .card')
      expect(card).toBeTruthy()
    })

    it('should render on tablet viewport', () => {
      global.innerWidth = 768
      global.innerHeight = 1024

      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Father'
        }
      })

      const card = container.querySelector('.relationship-card, .card')
      expect(card).toBeTruthy()
    })

    it('should render on desktop viewport', () => {
      global.innerWidth = 1920
      global.innerHeight = 1080

      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Sibling'
        }
      })

      const card = container.querySelector('.relationship-card, .card')
      expect(card).toBeTruthy()
    })
  })

  describe('delete button functionality', () => {
    const mockRelationship = {
      id: 100,
      person1Id: 1,
      person2Id: 2,
      type: 'parentOf',
      parentRole: 'mother'
    }

    it('should NOT show delete button when relationship prop is missing', () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother',
          relationship: null, // No relationship object
          isMobile: false
        }
      })

      const deleteButton = container.querySelector('.delete-button, button[aria-label*="Remove"]')
      expect(deleteButton).toBeFalsy()
    })

    it('should show delete button when relationship prop is provided on desktop (always visible)', () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother',
          relationship: mockRelationship,
          isMobile: false
        }
      })

      // Delete button should be visible immediately without hovering
      const deleteButton = container.querySelector('.delete-button, button[aria-label*="Remove"]')
      expect(deleteButton).toBeTruthy()
    })

    it('should show delete button when relationship prop is provided on mobile', () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Father',
          relationship: mockRelationship,
          isMobile: true
        }
      })

      const deleteButton = container.querySelector('.delete-button, button[aria-label*="Remove"]')
      expect(deleteButton).toBeTruthy()
    })

    it('should emit delete event when delete button is clicked', async () => {
      const { container, component } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother',
          relationship: mockRelationship,
          isMobile: false
        }
      })

      let deleteEventEmitted = false
      let emittedData = null

      component.$on('delete', (event) => {
        deleteEventEmitted = true
        emittedData = event.detail
      })

      const deleteButton = container.querySelector('.delete-button, button[aria-label*="Remove"]')
      expect(deleteButton).toBeTruthy()

      await fireEvent.click(deleteButton)

      expect(deleteEventEmitted).toBe(true)
      expect(emittedData).toBeTruthy()
      expect(emittedData.relationship).toEqual(mockRelationship)
      expect(emittedData.person).toEqual(mockPerson)
      expect(emittedData.relationshipType).toBe('Mother')
    })

    it('should not trigger card click when delete button is clicked', async () => {
      const { container, component } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Father',
          relationship: mockRelationship,
          isMobile: false
        }
      })

      let cardClickEmitted = false
      let deleteClickEmitted = false

      component.$on('click', () => {
        cardClickEmitted = true
      })

      component.$on('delete', () => {
        deleteClickEmitted = true
      })

      const deleteButton = container.querySelector('.delete-button, button[aria-label*="Remove"]')
      await fireEvent.click(deleteButton)

      expect(deleteClickEmitted).toBe(true)
      expect(cardClickEmitted).toBe(false) // Card click should not be triggered
    })

    it('should have accessible aria-label for delete button', () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother',
          relationship: mockRelationship,
          isMobile: false
        }
      })

      const deleteButton = container.querySelector('.delete-button, button[aria-label*="Remove"]')
      expect(deleteButton).toBeTruthy()

      const ariaLabel = deleteButton.getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
      expect(ariaLabel.toLowerCase()).toContain('john doe')
      expect(ariaLabel.toLowerCase()).toContain('mother')
    })

    it('should support keyboard access for delete button (Enter key)', async () => {
      const { container, component } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Father',
          relationship: mockRelationship,
          isMobile: false
        }
      })

      let deleteEventEmitted = false
      component.$on('delete', () => {
        deleteEventEmitted = true
      })

      const deleteButton = container.querySelector('.delete-button, button[aria-label*="Remove"]')
      await fireEvent.keyDown(deleteButton, { key: 'Enter', code: 'Enter' })

      expect(deleteEventEmitted).toBe(true)
    })

    it('should support keyboard access for delete button (Space key)', async () => {
      const { container, component } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother',
          relationship: mockRelationship,
          isMobile: false
        }
      })

      let deleteEventEmitted = false
      component.$on('delete', () => {
        deleteEventEmitted = true
      })

      const deleteButton = container.querySelector('.delete-button, button[aria-label*="Remove"]')
      await fireEvent.keyDown(deleteButton, { key: ' ', code: 'Space' })

      expect(deleteEventEmitted).toBe(true)
    })

    it('should show delete button for parent relationships', () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother',
          relationship: mockRelationship,
          isMobile: false
        }
      })

      const deleteButton = container.querySelector('.delete-button')
      expect(deleteButton).toBeTruthy()
    })

    it('should show delete button for child relationships', () => {
      const childRelationship = {
        id: 101,
        person1Id: 2,
        person2Id: 1,
        type: 'parentOf',
        parentRole: 'mother'
      }

      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Child',
          relationship: childRelationship,
          isMobile: false
        }
      })

      const deleteButton = container.querySelector('.delete-button')
      expect(deleteButton).toBeTruthy()
    })

    it('should show delete button for spouse relationships', () => {
      const spouseRelationship = {
        id: 102,
        person1Id: 1,
        person2Id: 2,
        type: 'spouse'
      }

      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Spouse',
          relationship: spouseRelationship,
          isMobile: false
        }
      })

      const deleteButton = container.querySelector('.delete-button')
      expect(deleteButton).toBeTruthy()
    })

    it('should NOT show delete button for sibling relationships (computed, not stored)', () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Sibling',
          relationship: null, // Siblings don't have stored relationships
          isMobile: false
        }
      })

      const deleteButton = container.querySelector('.delete-button')
      expect(deleteButton).toBeFalsy()
    })
  })
})
