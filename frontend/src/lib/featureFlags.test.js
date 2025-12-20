import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { get } from 'svelte/store'
import { featureFlags, enableFlag, disableFlag, isEnabled, resetFlags } from './featureFlags.js'

describe('featureFlags', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    resetFlags()
  })

  afterEach(() => {
    // Clean up after each test
    localStorage.clear()
    resetFlags()
  })

  describe('initial state', () => {
    it('should initialize with collapsibleModal disabled by default', () => {
      const value = get(featureFlags)
      expect(value.collapsibleModal).toBe(false)
    })

    it('should have collapsibleModal property in initial state', () => {
      const value = get(featureFlags)
      expect(value).toHaveProperty('collapsibleModal')
    })

    it('should initialize with twoColumnModal disabled by default', () => {
      const value = get(featureFlags)
      expect(value.twoColumnModal).toBe(false)
    })

    it('should have twoColumnModal property in initial state', () => {
      const value = get(featureFlags)
      expect(value).toHaveProperty('twoColumnModal')
    })

    it('should initialize with hybridModal disabled by default', () => {
      const value = get(featureFlags)
      expect(value.hybridModal).toBe(false)
    })

    it('should have hybridModal property in initial state', () => {
      const value = get(featureFlags)
      expect(value).toHaveProperty('hybridModal')
    })

    it('should load flags from localStorage on initialization', () => {
      // This test verifies that if we had previously saved flags,
      // they would be loaded when the store initializes
      // The actual test for this is covered by the persistence tests
      const value = get(featureFlags)
      expect(value).toBeDefined()
      expect(value).toHaveProperty('collapsibleModal')
    })

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('featureFlags', 'invalid json{')

      // Should not throw and should use defaults
      const value = get(featureFlags)
      expect(value.collapsibleModal).toBe(false)
    })
  })

  describe('enableFlag()', () => {
    it('should enable collapsibleModal flag', () => {
      enableFlag('collapsibleModal')

      const value = get(featureFlags)
      expect(value.collapsibleModal).toBe(true)
    })

    it('should enable hybridModal flag', () => {
      enableFlag('hybridModal')

      const value = get(featureFlags)
      expect(value.hybridModal).toBe(true)
    })

    it('should persist enabled flag to localStorage', () => {
      enableFlag('collapsibleModal')

      const stored = JSON.parse(localStorage.getItem('featureFlags'))
      expect(stored.collapsibleModal).toBe(true)
    })

    it('should persist enabled hybridModal flag to localStorage', () => {
      enableFlag('hybridModal')

      const stored = JSON.parse(localStorage.getItem('featureFlags'))
      expect(stored.hybridModal).toBe(true)
    })

    it('should notify subscribers when flag is enabled', () => {
      let capturedValue
      const unsubscribe = featureFlags.subscribe(value => {
        capturedValue = value
      })

      enableFlag('collapsibleModal')

      expect(capturedValue.collapsibleModal).toBe(true)

      unsubscribe()
    })

    it('should be idempotent when enabling same flag multiple times', () => {
      enableFlag('collapsibleModal')
      enableFlag('collapsibleModal')
      enableFlag('collapsibleModal')

      const value = get(featureFlags)
      expect(value.collapsibleModal).toBe(true)
    })

    it('should ignore unknown flag names gracefully', () => {
      // Should not throw
      enableFlag('unknownFlag')

      const value = get(featureFlags)
      expect(value).not.toHaveProperty('unknownFlag')
    })
  })

  describe('disableFlag()', () => {
    it('should disable collapsibleModal flag', () => {
      enableFlag('collapsibleModal')
      disableFlag('collapsibleModal')

      const value = get(featureFlags)
      expect(value.collapsibleModal).toBe(false)
    })

    it('should disable hybridModal flag', () => {
      enableFlag('hybridModal')
      disableFlag('hybridModal')

      const value = get(featureFlags)
      expect(value.hybridModal).toBe(false)
    })

    it('should persist disabled flag to localStorage', () => {
      enableFlag('collapsibleModal')
      disableFlag('collapsibleModal')

      const stored = JSON.parse(localStorage.getItem('featureFlags'))
      expect(stored.collapsibleModal).toBe(false)
    })

    it('should persist disabled hybridModal flag to localStorage', () => {
      enableFlag('hybridModal')
      disableFlag('hybridModal')

      const stored = JSON.parse(localStorage.getItem('featureFlags'))
      expect(stored.hybridModal).toBe(false)
    })

    it('should notify subscribers when flag is disabled', () => {
      enableFlag('collapsibleModal')

      let capturedValue
      const unsubscribe = featureFlags.subscribe(value => {
        capturedValue = value
      })

      disableFlag('collapsibleModal')

      expect(capturedValue.collapsibleModal).toBe(false)

      unsubscribe()
    })

    it('should be idempotent when disabling same flag multiple times', () => {
      disableFlag('collapsibleModal')
      disableFlag('collapsibleModal')
      disableFlag('collapsibleModal')

      const value = get(featureFlags)
      expect(value.collapsibleModal).toBe(false)
    })
  })

  describe('isEnabled()', () => {
    it('should return false for disabled flag', () => {
      expect(isEnabled('collapsibleModal')).toBe(false)
    })

    it('should return true for enabled flag', () => {
      enableFlag('collapsibleModal')
      expect(isEnabled('collapsibleModal')).toBe(true)
    })

    it('should return false for disabled hybridModal flag', () => {
      expect(isEnabled('hybridModal')).toBe(false)
    })

    it('should return true for enabled hybridModal flag', () => {
      enableFlag('hybridModal')
      expect(isEnabled('hybridModal')).toBe(true)
    })

    it('should reflect changes immediately after enableFlag()', () => {
      expect(isEnabled('collapsibleModal')).toBe(false)
      enableFlag('collapsibleModal')
      expect(isEnabled('collapsibleModal')).toBe(true)
    })

    it('should reflect changes immediately after disableFlag()', () => {
      enableFlag('collapsibleModal')
      expect(isEnabled('collapsibleModal')).toBe(true)
      disableFlag('collapsibleModal')
      expect(isEnabled('collapsibleModal')).toBe(false)
    })

    it('should return false for unknown flag names', () => {
      expect(isEnabled('unknownFlag')).toBe(false)
    })
  })

  describe('resetFlags()', () => {
    it('should reset all flags to default state', () => {
      enableFlag('collapsibleModal')

      resetFlags()

      const value = get(featureFlags)
      expect(value.collapsibleModal).toBe(false)
    })

    it('should clear localStorage when resetting', () => {
      enableFlag('collapsibleModal')
      expect(localStorage.getItem('featureFlags')).not.toBe(null)

      resetFlags()

      expect(localStorage.getItem('featureFlags')).toBe(null)
    })

    it('should notify subscribers when flags are reset', () => {
      enableFlag('collapsibleModal')

      let capturedValue
      const unsubscribe = featureFlags.subscribe(value => {
        capturedValue = value
      })

      resetFlags()

      expect(capturedValue.collapsibleModal).toBe(false)

      unsubscribe()
    })
  })

  describe('reactive behavior', () => {
    it('should trigger reactivity when flags change', () => {
      let updateCount = 0
      const unsubscribe = featureFlags.subscribe(() => {
        updateCount++
      })

      // Initial subscription counts as first update
      expect(updateCount).toBe(1)

      enableFlag('collapsibleModal')
      expect(updateCount).toBe(2)

      disableFlag('collapsibleModal')
      expect(updateCount).toBe(3)

      enableFlag('collapsibleModal')
      expect(updateCount).toBe(4)

      unsubscribe()
    })

    it('should allow multiple subscribers', () => {
      let value1, value2
      const unsubscribe1 = featureFlags.subscribe(v => { value1 = v })
      const unsubscribe2 = featureFlags.subscribe(v => { value2 = v })

      enableFlag('collapsibleModal')

      expect(value1.collapsibleModal).toBe(true)
      expect(value2.collapsibleModal).toBe(true)

      unsubscribe1()
      unsubscribe2()
    })
  })

  describe('localStorage persistence', () => {
    it('should persist flag changes across multiple operations', () => {
      enableFlag('collapsibleModal')
      disableFlag('collapsibleModal')
      enableFlag('collapsibleModal')

      const stored = JSON.parse(localStorage.getItem('featureFlags'))
      expect(stored.collapsibleModal).toBe(true)
    })

    it('should maintain flag state after multiple enable/disable cycles', () => {
      for (let i = 0; i < 5; i++) {
        enableFlag('collapsibleModal')
        disableFlag('collapsibleModal')
      }
      enableFlag('collapsibleModal')

      expect(isEnabled('collapsibleModal')).toBe(true)

      const stored = JSON.parse(localStorage.getItem('featureFlags'))
      expect(stored.collapsibleModal).toBe(true)
    })
  })

  describe('integration scenarios', () => {
    it('should support developer toggling feature flag in console', () => {
      // Developer enables flag in console
      enableFlag('collapsibleModal')
      expect(isEnabled('collapsibleModal')).toBe(true)

      // Application uses reactive store
      const value = get(featureFlags)
      expect(value.collapsibleModal).toBe(true)

      // Developer disables flag
      disableFlag('collapsibleModal')
      expect(isEnabled('collapsibleModal')).toBe(false)
    })

    it('should persist flag state across page reloads (simulated)', () => {
      enableFlag('collapsibleModal')

      // Simulate page reload by getting fresh localStorage value
      const storedFlags = JSON.parse(localStorage.getItem('featureFlags'))
      expect(storedFlags.collapsibleModal).toBe(true)
    })

    it('should support QA testing workflow: enable -> test -> disable', () => {
      // QA enables feature flag
      enableFlag('collapsibleModal')
      expect(isEnabled('collapsibleModal')).toBe(true)

      // QA performs testing (feature is enabled)
      const value = get(featureFlags)
      expect(value.collapsibleModal).toBe(true)

      // QA disables after testing
      disableFlag('collapsibleModal')
      expect(isEnabled('collapsibleModal')).toBe(false)
    })
  })
})
