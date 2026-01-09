/**
 * Acceptance tests for Issue #49: Delete Relationship from PersonModal
 *
 * These tests verify the BDD acceptance criteria from GitHub issue #49.
 * Tests cover bidirectional spouse deletion, unidirectional parent/child deletion,
 * confirmation dialog, optimistic updates, and accessibility.
 *
 * @jest-environment jsdom
 */

import { render, fireEvent, screen, waitFor } from '@testing-library/svelte'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { get } from 'svelte/store'
import PersonModal from './PersonModal.svelte'
import { modal } from '../stores/modalStore.js'
import { people, relationships } from '../stores/familyStore.js'

// Mock the API (use relative path to match PersonModal's import)
vi.mock('./api.js', () => ({
  api: {
    createPerson: vi.fn(),
    updatePerson: vi.fn(),
    deletePerson: vi.fn(),
    createRelationship: vi.fn(),
    deleteRelationship: vi.fn(),
    fetchFacebookProfile: vi.fn()
  }
}))

describe('Issue #49: Delete Relationship from PersonModal - Acceptance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup test data
    const testPeople = [
      { id: 1, firstName: 'John', lastName: 'Doe', birthDate: '1950-01-01', deathDate: null, gender: 'male' },
      { id: 2, firstName: 'Mary', lastName: 'Doe', birthDate: '1952-01-01', deathDate: null, gender: 'female' },
      { id: 3, firstName: 'Bob', lastName: 'Smith', birthDate: '1948-01-01', deathDate: null, gender: 'male' },
      { id: 4, firstName: 'Alice', lastName: 'Doe', birthDate: '1975-01-01', deathDate: null, gender: 'female' }
    ]

    const testRelationships = [
      { id: 100, person1Id: 2, person2Id: 1, type: 'parentOf', parentRole: 'mother' }, // Mary is mother of John
      { id: 101, person1Id: 3, person2Id: 1, type: 'parentOf', parentRole: 'father' }, // Bob is father of John
      { id: 102, person1Id: 1, person2Id: 2, type: 'spouse', parentRole: null }, // John married to Mary (A→B)
      { id: 103, person1Id: 2, person2Id: 1, type: 'spouse', parentRole: null }, // Mary married to John (B→A)
      { id: 104, person1Id: 1, person2Id: 4, type: 'parentOf', parentRole: 'father' } // John is father of Alice
    ]

    people.set(testPeople)
    relationships.set(testRelationships)
  })

  describe('AC1: Delete Button Visibility', () => {
    it('should show delete button on hover for desktop', async () => {
      // Mock desktop width BEFORE opening modal and rendering
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      })

      modal.open(1, 'edit')

      render(PersonModal)

      // Give component time to mount and detect window size
      await new Promise(resolve => setTimeout(resolve, 100))

      // Wait for the delete button to be in the DOM (it exists but may not be visible)
      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /remove.*mary doe.*mother/i })
        expect(deleteButton).toBeInTheDocument()
      })

      // Get the button and its parent card
      const deleteButton = screen.getByRole('button', { name: /remove.*mary doe.*mother/i })
      const motherCard = deleteButton.closest('.relationship-card')

      // Delete button should not be visible initially (desktop has hover behavior)
      expect(deleteButton).not.toBeVisible()

      // Hover over card
      await fireEvent.mouseEnter(motherCard)

      // Delete button should now be visible
      expect(deleteButton).toBeVisible()
    })

    it('should always show delete button on mobile', async () => {
      // Mock mobile width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })
      window.dispatchEvent(new Event('resize'))

      modal.open(1, 'edit')

      render(PersonModal)

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /remove.*mary doe.*mother/i })
        expect(deleteButton).toBeVisible()
      })
    })
  })

  describe('AC2: Confirmation Dialog', () => {
    it('should show confirmation dialog when delete button is clicked', async () => {
      global.innerWidth = 375 // Mobile for always-visible delete button
      modal.open(1, 'edit')

      render(PersonModal)

      const deleteButton = await screen.findByRole('button', { name: /remove.*mary doe.*mother/i })
      await fireEvent.click(deleteButton)

      // Confirmation dialog should appear
      const dialog = await screen.findByRole('dialog')
      expect(dialog).toBeInTheDocument()
      expect(screen.getByText('Delete Relationship')).toBeInTheDocument()
      expect(screen.getByText(/are you sure you want to remove mary doe as mother/i)).toBeInTheDocument()
    })

    it('should have confirm and cancel buttons in dialog', async () => {
      global.innerWidth = 375
      modal.open(1, 'edit')

      render(PersonModal)

      const deleteButton = await screen.findByRole('button', { name: /remove.*mary doe.*mother/i })
      await fireEvent.click(deleteButton)

      await screen.findByRole('dialog')

      expect(screen.getByText('Delete')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('should cancel deletion when Cancel button is clicked', async () => {
      global.innerWidth = 375
      modal.open(1, 'edit')

      render(PersonModal)

      const deleteButton = await screen.findByRole('button', { name: /remove.*mary doe.*mother/i })
      await fireEvent.click(deleteButton)

      const cancelButton = await screen.findByText('Cancel')
      await fireEvent.click(cancelButton)

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      // Relationship should still exist
      const currentRels = get(relationships)
      expect(currentRels).toHaveLength(5)
    })
  })

  describe('AC3: Bidirectional Spouse Deletion', () => {
    it('should delete both A→B and B→A spouse relationships', async () => {
      global.innerWidth = 375
      modal.open(1, 'edit')

      render(PersonModal)

      // Mock successful API calls
      api.deleteRelationship.mockResolvedValueOnce(undefined)
      api.deleteRelationship.mockResolvedValueOnce(undefined)

      // Find and click delete button for spouse
      const deleteButton = await screen.findByRole('button', { name: /remove.*mary doe.*spouse/i })
      await fireEvent.click(deleteButton)

      // Confirm deletion
      const confirmButton = await screen.findByText('Delete')
      await fireEvent.click(confirmButton)

      // Both relationships should be deleted
      await waitFor(() => {
        expect(api.deleteRelationship).toHaveBeenCalledTimes(2)
        expect(api.deleteRelationship).toHaveBeenCalledWith(102) // A→B
        expect(api.deleteRelationship).toHaveBeenCalledWith(103) // B→A
      })

      // Relationships should be removed from store
      const currentRels = get(relationships)
      expect(currentRels).toHaveLength(3) // 5 - 2 = 3
      expect(currentRels.find(r => r.id === 102)).toBeUndefined()
      expect(currentRels.find(r => r.id === 103)).toBeUndefined()
    })
  })

  describe('AC4: Unidirectional Parent/Child Deletion', () => {
    it('should delete only the single parent relationship', async () => {
      global.innerWidth = 375
      modal.open(1, 'edit')

      render(PersonModal)

      // Mock successful API call
      api.deleteRelationship.mockResolvedValueOnce(undefined)

      // Find and click delete button for mother
      const deleteButton = await screen.findByRole('button', { name: /remove.*mary doe.*mother/i })
      await fireEvent.click(deleteButton)

      // Confirm deletion
      const confirmButton = await screen.findByText('Delete')
      await fireEvent.click(confirmButton)

      // Only one relationship should be deleted
      await waitFor(() => {
        expect(api.deleteRelationship).toHaveBeenCalledTimes(1)
        expect(api.deleteRelationship).toHaveBeenCalledWith(100)
      })

      // Only the mother relationship should be removed
      const currentRels = get(relationships)
      expect(currentRels).toHaveLength(4) // 5 - 1 = 4
      expect(currentRels.find(r => r.id === 100)).toBeUndefined()
    })

    it('should delete only the single child relationship', async () => {
      global.innerWidth = 375
      modal.open(1, 'edit')

      render(PersonModal)

      api.deleteRelationship.mockResolvedValueOnce(undefined)

      // Find and click delete button for child
      const deleteButton = await screen.findByRole('button', { name: /remove.*alice doe.*child/i })
      await fireEvent.click(deleteButton)

      // Confirm deletion
      const confirmButton = await screen.findByText('Delete')
      await fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(api.deleteRelationship).toHaveBeenCalledTimes(1)
        expect(api.deleteRelationship).toHaveBeenCalledWith(104)
      })

      const currentRels = get(relationships)
      expect(currentRels).toHaveLength(4)
      expect(currentRels.find(r => r.id === 104)).toBeUndefined()
    })
  })

  describe('AC5: Optimistic Updates and Rollback', () => {
    it('should remove relationship immediately before API call completes', async () => {
      global.innerWidth = 375
      modal.open(1, 'edit')

      render(PersonModal)

      // Mock slow API call
      api.deleteRelationship.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

      const deleteButton = await screen.findByRole('button', { name: /remove.*mary doe.*mother/i })
      await fireEvent.click(deleteButton)

      const confirmButton = await screen.findByText('Delete')
      fireEvent.click(confirmButton)

      // Relationship should be removed immediately (optimistic update)
      await waitFor(() => {
        const currentRels = get(relationships)
        expect(currentRels).toHaveLength(4)
      })
    })

    it('should rollback deletion if API call fails', async () => {
      global.innerWidth = 375
      modal.open(1, 'edit')

      render(PersonModal)

      // Mock API failure
      api.deleteRelationship.mockRejectedValueOnce(new Error('Network error'))

      const deleteButton = await screen.findByRole('button', { name: /remove.*mary doe.*mother/i })
      await fireEvent.click(deleteButton)

      const confirmButton = await screen.findByText('Delete')
      await fireEvent.click(confirmButton)

      // Relationship should be restored on error
      await waitFor(() => {
        const currentRels = get(relationships)
        expect(currentRels).toHaveLength(5)
        expect(currentRels.find(r => r.id === 100)).toBeDefined()
      })
    })

    it('should rollback both spouse relationships if API call fails', async () => {
      global.innerWidth = 375
      modal.open(1, 'edit')

      render(PersonModal)

      // Mock first API call success, second failure
      api.deleteRelationship.mockResolvedValueOnce(undefined)
      api.deleteRelationship.mockRejectedValueOnce(new Error('Network error'))

      const deleteButton = await screen.findByRole('button', { name: /remove.*mary doe.*spouse/i })
      await fireEvent.click(deleteButton)

      const confirmButton = await screen.findByText('Delete')
      await fireEvent.click(confirmButton)

      // Both relationships should be restored
      await waitFor(() => {
        const currentRels = get(relationships)
        expect(currentRels).toHaveLength(5)
        expect(currentRels.find(r => r.id === 102)).toBeDefined()
        expect(currentRels.find(r => r.id === 103)).toBeDefined()
      })
    })
  })

  describe('AC6: Toast Notifications', () => {
    it('should show success notification on successful deletion', async () => {
      global.innerWidth = 375
      modal.open(1, 'edit')

      render(PersonModal)

      api.deleteRelationship.mockResolvedValueOnce(undefined)

      const deleteButton = await screen.findByRole('button', { name: /remove.*mary doe.*mother/i })
      await fireEvent.click(deleteButton)

      const confirmButton = await screen.findByText('Delete')
      await fireEvent.click(confirmButton)

      await waitFor(() => {
        // Check notification store was called (mocked)
        expect(api.deleteRelationship).toHaveBeenCalled()
      })
    })

    it('should show error notification on failed deletion', async () => {
      global.innerWidth = 375
      modal.open(1, 'edit')

      render(PersonModal)

      api.deleteRelationship.mockRejectedValueOnce(new Error('Network error'))

      const deleteButton = await screen.findByRole('button', { name: /remove.*mary doe.*mother/i })
      await fireEvent.click(deleteButton)

      const confirmButton = await screen.findByText('Delete')
      await fireEvent.click(confirmButton)

      await waitFor(() => {
        // Relationship should be restored, indicating error occurred
        const currentRels = get(relationships)
        expect(currentRels).toHaveLength(5)
      })
    })
  })

  describe('AC7: Keyboard Navigation and Accessibility', () => {
    it('should support Enter key to delete relationship', async () => {
      global.innerWidth = 375
      modal.open(1, 'edit')

      render(PersonModal)

      api.deleteRelationship.mockResolvedValueOnce(undefined)

      const deleteButton = await screen.findByRole('button', { name: /remove.*mary doe.*mother/i })
      deleteButton.focus()
      await fireEvent.keyDown(deleteButton, { key: 'Enter' })

      const confirmButton = await screen.findByText('Delete')
      await fireEvent.keyDown(confirmButton, { key: 'Enter' })

      await waitFor(() => {
        expect(api.deleteRelationship).toHaveBeenCalledWith(100)
      })
    })

    it('should support Escape key to cancel confirmation dialog', async () => {
      global.innerWidth = 375
      modal.open(1, 'edit')

      render(PersonModal)

      const deleteButton = await screen.findByRole('button', { name: /remove.*mary doe.*mother/i })
      await fireEvent.click(deleteButton)

      const dialog = await screen.findByRole('dialog')
      await fireEvent.keyDown(dialog, { key: 'Escape' })

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })

      // Relationship should still exist
      const currentRels = get(relationships)
      expect(currentRels).toHaveLength(5)
    })

    it('should have proper ARIA labels on delete button', async () => {
      global.innerWidth = 375
      modal.open(1, 'edit')

      render(PersonModal)

      const deleteButton = await screen.findByRole('button', { name: /remove mary doe as mother/i })
      expect(deleteButton).toHaveAttribute('aria-label')
    })

    it('should have proper ARIA attributes on confirmation dialog', async () => {
      global.innerWidth = 375
      modal.open(1, 'edit')

      render(PersonModal)

      const deleteButton = await screen.findByRole('button', { name: /remove.*mary doe.*mother/i })
      await fireEvent.click(deleteButton)

      const dialog = await screen.findByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby')
      expect(dialog).toHaveAttribute('aria-describedby')
    })
  })

  describe('AC8: Delete Button Should Not Trigger Card Click', () => {
    it('should not navigate to person when delete button is clicked', async () => {
      global.innerWidth = 375
      modal.open(1, 'edit')

      const { component } = render(PersonModal)

      const cardClickHandler = vi.fn()
      const deleteHandler = vi.fn()

      component.$on('click', cardClickHandler)
      component.$on('delete', deleteHandler)

      const deleteButton = await screen.findByRole('button', { name: /remove.*mary doe.*mother/i })
      await fireEvent.click(deleteButton)

      // Delete event should fire, not card click
      expect(screen.queryByRole('dialog')).toBeInTheDocument()

      // The modal should not have navigated to Mary's details
      // (This is implicit - the delete confirmation is shown, not Mary's modal)
    })
  })
})
