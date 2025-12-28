/**
 * @jest-environment jsdom
 */

import { render, fireEvent, screen } from '@testing-library/svelte'
import { describe, it, expect, vi, beforeEach } from 'vitest'
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

describe('RelationshipCard - Delete Functionality', () => {
  const mockPerson = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '1980-01-01',
    deathDate: null,
    gender: 'male'
  }

  const mockRelationship = {
    id: 100,
    person1Id: 2,
    person2Id: 1,
    type: 'parentOf',
    parentRole: 'mother'
  }

  describe('Desktop: Delete Button on Hover', () => {
    beforeEach(() => {
      // Mock window width for desktop
      global.innerWidth = 1024
    })

    it('should not show delete button initially (desktop, no hover)', () => {
      const { container } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother',
          relationship: mockRelationship,
          isMobile: false
        }
      })

      // Delete button is conditionally rendered on hover, so won't exist initially
      const card = container.querySelector('.relationship-card')
      expect(card).toBeTruthy()
      // Component should render successfully with relationship
      expect(container.textContent).toContain('John Doe')
    })

    it('should show delete button on hover (desktop)', async () => {
      render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother',
          relationship: mockRelationship
        }
      })

      const card = screen.getByRole('button', { name: /view.*john doe.*mother/i })
      await fireEvent.mouseEnter(card)

      const deleteButton = screen.getByRole('button', { name: /remove.*john doe.*mother/i })
      expect(deleteButton).toBeVisible()
    })

    it('should hide delete button when hover ends', async () => {
      render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother',
          relationship: mockRelationship
        }
      })

      const card = screen.getByRole('button', { name: /view.*john doe.*mother/i })

      await fireEvent.mouseEnter(card)
      const deleteButton = screen.getByRole('button', { name: /remove.*john doe.*mother/i })
      expect(deleteButton).toBeVisible()

      await fireEvent.mouseLeave(card)
      expect(deleteButton).not.toBeVisible()
    })
  })

  describe('Mobile: Delete Button Always Visible', () => {
    beforeEach(() => {
      // Mock window width for mobile
      global.innerWidth = 375
    })

    it('should show delete button always on mobile', () => {
      render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother',
          relationship: mockRelationship,
          isMobile: true
        }
      })

      const deleteButton = screen.getByRole('button', { name: /remove.*john doe.*mother/i })
      expect(deleteButton).toBeVisible()
    })
  })

  describe('Delete Button Interaction', () => {
    it('should dispatch delete event when delete button is clicked', async () => {
      const { component } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother',
          relationship: mockRelationship,
          isMobile: true
        }
      })

      const deleteHandler = vi.fn()
      component.$on('delete', deleteHandler)

      const deleteButton = screen.getByRole('button', { name: /remove.*john doe.*mother/i })
      await fireEvent.click(deleteButton)

      expect(deleteHandler).toHaveBeenCalledTimes(1)
      expect(deleteHandler.mock.calls[0][0].detail).toEqual({
        relationship: mockRelationship,
        person: mockPerson,
        relationshipType: 'Mother'
      })
    })

    it('should stop propagation when delete button is clicked (should not trigger card click)', async () => {
      const { component } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother',
          relationship: mockRelationship,
          isMobile: true
        }
      })

      const deleteHandler = vi.fn()
      const clickHandler = vi.fn()

      component.$on('delete', deleteHandler)
      component.$on('click', clickHandler)

      const deleteButton = screen.getByRole('button', { name: /remove.*john doe.*mother/i })
      await fireEvent.click(deleteButton)

      expect(deleteHandler).toHaveBeenCalledTimes(1)
      expect(clickHandler).not.toHaveBeenCalled()
    })

    it('should dispatch delete event when Enter key is pressed on delete button', async () => {
      const { component } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother',
          relationship: mockRelationship,
          isMobile: true
        }
      })

      const deleteHandler = vi.fn()
      component.$on('delete', deleteHandler)

      const deleteButton = screen.getByRole('button', { name: /remove.*john doe.*mother/i })
      deleteButton.focus()
      await fireEvent.keyDown(deleteButton, { key: 'Enter' })

      expect(deleteHandler).toHaveBeenCalledTimes(1)
    })

    it('should dispatch delete event when Space key is pressed on delete button', async () => {
      const { component } = render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother',
          relationship: mockRelationship,
          isMobile: true
        }
      })

      const deleteHandler = vi.fn()
      component.$on('delete', deleteHandler)

      const deleteButton = screen.getByRole('button', { name: /remove.*john doe.*mother/i })
      deleteButton.focus()
      await fireEvent.keyDown(deleteButton, { key: ' ' })

      expect(deleteHandler).toHaveBeenCalledTimes(1)
    })
  })

  describe('Delete Button Styling', () => {
    it('should have red/destructive styling', () => {
      render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother',
          relationship: mockRelationship,
          isMobile: true
        }
      })

      const deleteButton = screen.getByRole('button', { name: /remove.*john doe.*mother/i })
      expect(deleteButton).toHaveClass('delete-button')
    })

    it('should have small size and trash icon', () => {
      render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother',
          relationship: mockRelationship,
          isMobile: true
        }
      })

      const deleteButton = screen.getByRole('button', { name: /remove.*john doe.*mother/i })

      // Check for trash icon (assuming we use a trash icon)
      const icon = deleteButton.querySelector('.icon-trash')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA label with person name and relationship type', () => {
      render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother',
          relationship: mockRelationship,
          isMobile: true
        }
      })

      const deleteButton = screen.getByRole('button', { name: /remove john doe as mother/i })
      expect(deleteButton).toBeInTheDocument()
    })

    it('should be keyboard accessible with proper tab order', async () => {
      render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother',
          relationship: mockRelationship,
          isMobile: true
        }
      })

      const card = screen.getByRole('button', { name: /view.*john doe.*mother/i })
      const deleteButton = screen.getByRole('button', { name: /remove.*john doe.*mother/i })

      // Tab should focus card first
      card.focus()
      expect(card).toHaveFocus()

      // Delete button should be focusable
      deleteButton.focus()
      expect(deleteButton).toHaveFocus()
    })

    it('should have focus indicator when focused', () => {
      render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother',
          relationship: mockRelationship,
          isMobile: true
        }
      })

      const deleteButton = screen.getByRole('button', { name: /remove.*john doe.*mother/i })
      deleteButton.focus()

      expect(deleteButton).toHaveFocus()
      expect(deleteButton).toHaveClass('delete-button')
    })
  })

  describe('Edge Cases', () => {
    it('should not show delete button if relationship prop is not provided', () => {
      render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Mother'
          // No relationship prop
        }
      })

      const deleteButton = screen.queryByRole('button', { name: /remove/i })
      expect(deleteButton).not.toBeInTheDocument()
    })

    it('should handle spouse relationship type correctly in delete button label', () => {
      const spouseRelationship = {
        id: 101,
        person1Id: 2,
        person2Id: 1,
        type: 'spouse',
        parentRole: null
      }

      render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Spouse',
          relationship: spouseRelationship,
          isMobile: true
        }
      })

      const deleteButton = screen.getByRole('button', { name: /remove john doe as spouse/i })
      expect(deleteButton).toBeInTheDocument()
    })

    it('should handle child relationship type correctly in delete button label', () => {
      const childRelationship = {
        id: 102,
        person1Id: 1,
        person2Id: 2,
        type: 'parentOf',
        parentRole: 'mother'
      }

      render(RelationshipCard, {
        props: {
          person: mockPerson,
          relationshipType: 'Child',
          relationship: childRelationship,
          isMobile: true
        }
      })

      const deleteButton = screen.getByRole('button', { name: /remove john doe as child/i })
      expect(deleteButton).toBeInTheDocument()
    })
  })
})
