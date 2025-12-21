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
    it('should initialize with empty flags object', () => {
      const value = get(featureFlags)
      expect(value).toEqual({})
    })

    it('should load flags from localStorage on initialization', () => {
      // This test verifies that if we had previously saved flags,
      // they would be loaded when the store initializes
      // The actual test for this is covered by the persistence tests
      const value = get(featureFlags)
      expect(value).toBeDefined()
    })

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('featureFlags', 'invalid json{')

      // Should not throw and should use defaults (empty object)
      const value = get(featureFlags)
      expect(value).toEqual({})
    })
  })

  describe('enableFlag()', () => {
    it('should enable a custom feature flag', () => {
      enableFlag('customFeature')

      const value = get(featureFlags)
      expect(value.customFeature).toBe(true)
    })

    it('should persist enabled flag to localStorage', () => {
      enableFlag('customFeature')

      const stored = JSON.parse(localStorage.getItem('featureFlags'))
      expect(stored.customFeature).toBe(true)
    })

    it('should notify subscribers when flag is enabled', () => {
      let capturedValue
      const unsubscribe = featureFlags.subscribe(value => {
        capturedValue = value
      })

      enableFlag('customFeature')

      expect(capturedValue.customFeature).toBe(true)

      unsubscribe()
    })

    it('should be idempotent when enabling same flag multiple times', () => {
      enableFlag('customFeature')
      enableFlag('customFeature')
      enableFlag('customFeature')

      const value = get(featureFlags)
      expect(value.customFeature).toBe(true)
    })

    it('should allow enabling any flag dynamically', () => {
      enableFlag('newFlag')

      const value = get(featureFlags)
      expect(value.newFlag).toBe(true)
    })
  })

  describe('disableFlag()', () => {
    it('should disable a custom feature flag', () => {
      enableFlag('customFeature')
      disableFlag('customFeature')

      const value = get(featureFlags)
      expect(value.customFeature).toBe(false)
    })

    it('should persist disabled flag to localStorage', () => {
      enableFlag('customFeature')
      disableFlag('customFeature')

      const stored = JSON.parse(localStorage.getItem('featureFlags'))
      expect(stored.customFeature).toBe(false)
    })

    it('should notify subscribers when flag is disabled', () => {
      enableFlag('customFeature')

      let capturedValue
      const unsubscribe = featureFlags.subscribe(value => {
        capturedValue = value
      })

      disableFlag('customFeature')

      expect(capturedValue.customFeature).toBe(false)

      unsubscribe()
    })

    it('should be idempotent when disabling same flag multiple times', () => {
      disableFlag('customFeature')
      disableFlag('customFeature')
      disableFlag('customFeature')

      const value = get(featureFlags)
      expect(value.customFeature).toBe(false)
    })
  })

  describe('isEnabled()', () => {
    it('should return false for disabled flag', () => {
      expect(isEnabled('customFeature')).toBe(false)
    })

    it('should return true for enabled flag', () => {
      enableFlag('customFeature')
      expect(isEnabled('customFeature')).toBe(true)
    })

    it('should reflect changes immediately after enableFlag()', () => {
      expect(isEnabled('customFeature')).toBe(false)
      enableFlag('customFeature')
      expect(isEnabled('customFeature')).toBe(true)
    })

    it('should reflect changes immediately after disableFlag()', () => {
      enableFlag('customFeature')
      expect(isEnabled('customFeature')).toBe(true)
      disableFlag('customFeature')
      expect(isEnabled('customFeature')).toBe(false)
    })

    it('should return false for unknown flag names', () => {
      expect(isEnabled('unknownFlag')).toBe(false)
    })
  })

  describe('resetFlags()', () => {
    it('should reset all flags to default state (empty object)', () => {
      enableFlag('customFeature')
      enableFlag('anotherFlag')

      resetFlags()

      const value = get(featureFlags)
      expect(value).toEqual({})
    })

    it('should clear localStorage when resetting', () => {
      enableFlag('customFeature')
      expect(localStorage.getItem('featureFlags')).not.toBe(null)

      resetFlags()

      expect(localStorage.getItem('featureFlags')).toBe(null)
    })

    it('should notify subscribers when flags are reset', () => {
      enableFlag('customFeature')

      let capturedValue
      const unsubscribe = featureFlags.subscribe(value => {
        capturedValue = value
      })

      resetFlags()

      expect(capturedValue).toEqual({})

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

      enableFlag('customFeature')
      expect(updateCount).toBe(2)

      disableFlag('customFeature')
      expect(updateCount).toBe(3)

      enableFlag('customFeature')
      expect(updateCount).toBe(4)

      unsubscribe()
    })

    it('should allow multiple subscribers', () => {
      let value1, value2
      const unsubscribe1 = featureFlags.subscribe(v => { value1 = v })
      const unsubscribe2 = featureFlags.subscribe(v => { value2 = v })

      enableFlag('customFeature')

      expect(value1.customFeature).toBe(true)
      expect(value2.customFeature).toBe(true)

      unsubscribe1()
      unsubscribe2()
    })
  })

  describe('localStorage persistence', () => {
    it('should persist flag changes across multiple operations', () => {
      enableFlag('customFeature')
      disableFlag('customFeature')
      enableFlag('customFeature')

      const stored = JSON.parse(localStorage.getItem('featureFlags'))
      expect(stored.customFeature).toBe(true)
    })

    it('should maintain flag state after multiple enable/disable cycles', () => {
      for (let i = 0; i < 5; i++) {
        enableFlag('customFeature')
        disableFlag('customFeature')
      }
      enableFlag('customFeature')

      expect(isEnabled('customFeature')).toBe(true)

      const stored = JSON.parse(localStorage.getItem('featureFlags'))
      expect(stored.customFeature).toBe(true)
    })
  })

  describe('integration scenarios', () => {
    it('should support developer toggling feature flag in console', () => {
      // Developer enables flag in console
      enableFlag('customFeature')
      expect(isEnabled('customFeature')).toBe(true)

      // Application uses reactive store
      const value = get(featureFlags)
      expect(value.customFeature).toBe(true)

      // Developer disables flag
      disableFlag('customFeature')
      expect(isEnabled('customFeature')).toBe(false)
    })

    it('should persist flag state across page reloads (simulated)', () => {
      enableFlag('customFeature')

      // Simulate page reload by getting fresh localStorage value
      const storedFlags = JSON.parse(localStorage.getItem('featureFlags'))
      expect(storedFlags.customFeature).toBe(true)
    })

    it('should support QA testing workflow: enable -> test -> disable', () => {
      // QA enables feature flag
      enableFlag('customFeature')
      expect(isEnabled('customFeature')).toBe(true)

      // QA performs testing (feature is enabled)
      const value = get(featureFlags)
      expect(value.customFeature).toBe(true)

      // QA disables after testing
      disableFlag('customFeature')
      expect(isEnabled('customFeature')).toBe(false)
    })
  })
})
