import { writable } from 'svelte/store'

/**
 * Modal Store - Centralized modal state management
 *
 * Manages the state of the PersonModal component, including:
 * - isOpen: Whether the modal is currently displayed
 * - personId: ID of the person being viewed/edited (null for add mode)
 * - mode: Modal mode - 'view', 'edit', or 'add'
 *
 * This store eliminates the need for the modalKey workaround and provides
 * a clean, reactive interface for modal state management.
 */

// Create the store with initial state
function createModalStore() {
  const initialState = {
    isOpen: false,
    personId: null,
    mode: 'view'
  }

  const { subscribe, set } = writable(initialState)

  return {
    subscribe,

    /**
     * Open modal for a specific person
     * @param {number|string} personId - ID of the person to display
     * @param {string} mode - Modal mode: 'view' or 'edit' (defaults to 'view')
     */
    open: (personId, mode = 'view') => {
      set({
        isOpen: true,
        personId,
        mode
      })
    },

    /**
     * Open modal in add mode (for creating a new person)
     */
    openNew: () => {
      set({
        isOpen: true,
        personId: null,
        mode: 'add'
      })
    },

    /**
     * Close modal and reset to initial state
     */
    close: () => {
      set(initialState)
    }
  }
}

// Export singleton instance
export const modal = createModalStore()
