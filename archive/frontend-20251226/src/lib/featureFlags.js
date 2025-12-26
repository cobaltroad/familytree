import { writable } from 'svelte/store'

/**
 * Feature Flags Store - Centralized feature flag management
 *
 * Manages feature flags with localStorage persistence.
 * Flags are dynamic and can be enabled/disabled at runtime.
 *
 * This enables A/B testing, gradual rollouts, and easy feature toggling
 * during development and QA.
 */

const STORAGE_KEY = 'featureFlags'

// Default flag values (empty - no predefined flags)
const DEFAULT_FLAGS = {}

// Load flags from localStorage or use defaults
function loadFlags() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...DEFAULT_FLAGS, ...parsed }
    }
  } catch (err) {
    console.warn('Failed to load feature flags from localStorage:', err)
  }
  return { ...DEFAULT_FLAGS }
}

// Save flags to localStorage
function saveFlags(flags) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flags))
  } catch (err) {
    console.warn('Failed to save feature flags to localStorage:', err)
  }
}

// Create the store with initial state from localStorage
function createFeatureFlagsStore() {
  const initialState = loadFlags()
  const { subscribe, set, update } = writable(initialState)

  return {
    subscribe,

    /**
     * Enable a feature flag (dynamically creates flag if it doesn't exist)
     * @param {string} flagName - Name of the flag to enable
     */
    enable: (flagName) => {
      update(flags => {
        const newFlags = { ...flags, [flagName]: true }
        saveFlags(newFlags)
        return newFlags
      })
    },

    /**
     * Disable a feature flag (dynamically creates flag if it doesn't exist)
     * @param {string} flagName - Name of the flag to disable
     */
    disable: (flagName) => {
      update(flags => {
        const newFlags = { ...flags, [flagName]: false }
        saveFlags(newFlags)
        return newFlags
      })
    },

    /**
     * Reset all flags to default values and clear localStorage
     */
    reset: () => {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch (err) {
        console.warn('Failed to remove feature flags from localStorage:', err)
      }
      set({ ...DEFAULT_FLAGS })
    }
  }
}

// Export singleton instance
export const featureFlags = createFeatureFlagsStore()

// Helper function to enable a flag
export function enableFlag(flagName) {
  featureFlags.enable(flagName)
}

// Helper function to disable a flag
export function disableFlag(flagName) {
  featureFlags.disable(flagName)
}

// Helper function to check if a flag is enabled
export function isEnabled(flagName) {
  let currentValue = false
  const unsubscribe = featureFlags.subscribe(flags => {
    currentValue = flags[flagName] || false
  })
  unsubscribe()
  return currentValue
}

// Helper function to reset all flags
export function resetFlags() {
  featureFlags.reset()
}
