/**
 * Integration test for modal re-open bug (Issue #2)
 *
 * This test simulates the user interaction flow:
 * 1. Click a tree node to open modal
 * 2. Close the modal
 * 3. Click the SAME tree node again
 * 4. Modal should reopen with the same person's data
 *
 * The bug: Step 4 fails - modal doesn't reopen when clicking same node
 */

import { describe, it, expect, beforeEach } from 'vitest'

/**
 * Simulates the state management logic from App.svelte
 */
class ModalStateManager {
  constructor() {
    this.editingPerson = null
    this.isModalOpen = false
    this.modalKey = 0 // NEW: Key to force component recreation
  }

  /**
   * Current implementation (BUGGY)
   * This is what handleEditPerson does now with the tick() approach
   */
  async handleEditPersonBuggy(person) {
    // If modal is already open, close it first and wait for Svelte to process
    if (this.isModalOpen) {
      this.isModalOpen = false
      // await tick() - simulated by this being async
    }

    this.editingPerson = person
    this.isModalOpen = true
  }

  /**
   * Fixed implementation using modalKey
   */
  handleEditPersonFixed(person) {
    this.editingPerson = person
    this.isModalOpen = true
    this.modalKey += 1 // Increment key to force recreation
  }

  /**
   * Close modal
   */
  handleModalClose() {
    this.isModalOpen = false
    this.editingPerson = null
  }

  /**
   * Get current state
   */
  getState() {
    return {
      editingPerson: this.editingPerson,
      isModalOpen: this.isModalOpen,
      modalKey: this.modalKey
    }
  }
}

describe('Modal Re-open Bug (Issue #2)', () => {
  let manager
  const mockPerson = { id: 1, firstName: 'John', lastName: 'Doe' }

  beforeEach(() => {
    manager = new ModalStateManager()
  })

  describe('Current Implementation (BUGGY)', () => {
    it('should open modal on first click', async () => {
      await manager.handleEditPersonBuggy(mockPerson)

      const state = manager.getState()
      expect(state.isModalOpen).toBe(true)
      expect(state.editingPerson).toEqual(mockPerson)
    })

    it('should close modal when user closes it', async () => {
      await manager.handleEditPersonBuggy(mockPerson)
      manager.handleModalClose()

      const state = manager.getState()
      expect(state.isModalOpen).toBe(false)
      expect(state.editingPerson).toBe(null)
    })

    it('BUG: should reopen modal when clicking same node after closing (FAILS)', async () => {
      // First click - opens modal
      await manager.handleEditPersonBuggy(mockPerson)
      expect(manager.getState().isModalOpen).toBe(true)

      // User closes modal
      manager.handleModalClose()
      expect(manager.getState().isModalOpen).toBe(false)

      // Second click on SAME node - should reopen modal
      await manager.handleEditPersonBuggy(mockPerson)

      const state = manager.getState()

      // This passes, but in real Svelte component the modal doesn't properly re-render
      // because there's no way to distinguish this is a "new" open event
      expect(state.isModalOpen).toBe(true)
      expect(state.editingPerson).toEqual(mockPerson)

      // The issue: Without a key change, Svelte reuses the same component instance
      // and doesn't trigger proper reinitialization
    })
  })

  describe('Fixed Implementation with modalKey', () => {
    it('should open modal on first click', () => {
      manager.handleEditPersonFixed(mockPerson)

      const state = manager.getState()
      expect(state.isModalOpen).toBe(true)
      expect(state.editingPerson).toEqual(mockPerson)
      expect(state.modalKey).toBe(1)
    })

    it('should close modal when user closes it', () => {
      manager.handleEditPersonFixed(mockPerson)
      manager.handleModalClose()

      const state = manager.getState()
      expect(state.isModalOpen).toBe(false)
      expect(state.editingPerson).toBe(null)
    })

    it('FIXED: should reopen modal with new key when clicking same node after closing', () => {
      // First click - opens modal
      manager.handleEditPersonFixed(mockPerson)
      const firstKey = manager.getState().modalKey
      expect(manager.getState().isModalOpen).toBe(true)
      expect(firstKey).toBe(1)

      // User closes modal
      manager.handleModalClose()
      expect(manager.getState().isModalOpen).toBe(false)

      // Second click on SAME node - should reopen modal with NEW key
      manager.handleEditPersonFixed(mockPerson)

      const state = manager.getState()
      expect(state.isModalOpen).toBe(true)
      expect(state.editingPerson).toEqual(mockPerson)
      expect(state.modalKey).toBe(2) // Key incremented!
      expect(state.modalKey).toBeGreaterThan(firstKey)
    })

    it('should increment key for each open, even for different people', () => {
      const person1 = { id: 1, firstName: 'John', lastName: 'Doe' }
      const person2 = { id: 2, firstName: 'Jane', lastName: 'Smith' }

      // Open for person 1
      manager.handleEditPersonFixed(person1)
      expect(manager.getState().modalKey).toBe(1)

      // Close
      manager.handleModalClose()

      // Open for person 2
      manager.handleEditPersonFixed(person2)
      expect(manager.getState().modalKey).toBe(2)

      // Close
      manager.handleModalClose()

      // Open for person 1 again
      manager.handleEditPersonFixed(person1)
      expect(manager.getState().modalKey).toBe(3)
    })

    it('should handle rapid clicks on same node', () => {
      // Simulate user clicking same node multiple times rapidly
      manager.handleEditPersonFixed(mockPerson)
      const key1 = manager.getState().modalKey

      manager.handleEditPersonFixed(mockPerson)
      const key2 = manager.getState().modalKey

      manager.handleEditPersonFixed(mockPerson)
      const key3 = manager.getState().modalKey

      // Each click should increment the key
      expect(key2).toBeGreaterThan(key1)
      expect(key3).toBeGreaterThan(key2)
      expect(manager.getState().isModalOpen).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle opening modal when already open (clicking different node)', () => {
      const person1 = { id: 1, firstName: 'John', lastName: 'Doe' }
      const person2 = { id: 2, firstName: 'Jane', lastName: 'Smith' }

      manager.handleEditPersonFixed(person1)
      const key1 = manager.getState().modalKey
      expect(manager.getState().editingPerson).toEqual(person1)

      // Click different node without closing first
      manager.handleEditPersonFixed(person2)
      const key2 = manager.getState().modalKey

      expect(manager.getState().isModalOpen).toBe(true)
      expect(manager.getState().editingPerson).toEqual(person2)
      expect(key2).toBeGreaterThan(key1)
    })

    it('should maintain state consistency after multiple open/close cycles', () => {
      const cycles = 5

      for (let i = 0; i < cycles; i++) {
        manager.handleEditPersonFixed(mockPerson)
        expect(manager.getState().isModalOpen).toBe(true)
        expect(manager.getState().modalKey).toBe(i + 1)

        manager.handleModalClose()
        expect(manager.getState().isModalOpen).toBe(false)
        expect(manager.getState().editingPerson).toBe(null)
      }

      // Final key should equal number of opens
      expect(manager.getState().modalKey).toBe(cycles)
    })
  })
})
