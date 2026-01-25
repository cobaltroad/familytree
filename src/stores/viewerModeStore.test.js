import { describe, it, expect, beforeEach, vi } from 'vitest'
import { get } from 'svelte/store'

/**
 * Tests for viewerModeStore
 *
 * The viewer mode store detects whether the application is running in
 * static site mode (viewer mode) where editing features should be disabled.
 *
 * Detection is based on the VITE_VIEWER_MODE environment variable.
 */

describe('viewerModeStore', () => {
  beforeEach(() => {
    // Reset modules between tests to allow different env var values
    vi.resetModules()
  })

  describe('when VITE_VIEWER_MODE is "true"', () => {
    it('should expose isViewerMode as true', async () => {
      // Set environment variable
      vi.stubEnv('VITE_VIEWER_MODE', 'true')

      // Dynamically import to get fresh module with new env
      const { isViewerMode } = await import('./viewerModeStore.js')

      expect(get(isViewerMode)).toBe(true)
    })
  })

  describe('when VITE_VIEWER_MODE is "false"', () => {
    it('should expose isViewerMode as false', async () => {
      vi.stubEnv('VITE_VIEWER_MODE', 'false')

      const { isViewerMode } = await import('./viewerModeStore.js')

      expect(get(isViewerMode)).toBe(false)
    })
  })

  describe('when VITE_VIEWER_MODE is undefined', () => {
    it('should default isViewerMode to false', async () => {
      vi.stubEnv('VITE_VIEWER_MODE', undefined)

      const { isViewerMode } = await import('./viewerModeStore.js')

      expect(get(isViewerMode)).toBe(false)
    })
  })

  describe('when VITE_VIEWER_MODE is empty string', () => {
    it('should treat empty string as false', async () => {
      vi.stubEnv('VITE_VIEWER_MODE', '')

      const { isViewerMode } = await import('./viewerModeStore.js')

      expect(get(isViewerMode)).toBe(false)
    })
  })

  describe('store behavior', () => {
    it('should be a readable store', async () => {
      vi.stubEnv('VITE_VIEWER_MODE', 'true')

      const { isViewerMode } = await import('./viewerModeStore.js')

      // Readable stores have subscribe method
      expect(typeof isViewerMode.subscribe).toBe('function')

      // Should not have set/update methods (is read-only)
      expect(isViewerMode.set).toBeUndefined()
      expect(isViewerMode.update).toBeUndefined()
    })

    it('should support reactive subscriptions', async () => {
      vi.stubEnv('VITE_VIEWER_MODE', 'true')

      const { isViewerMode } = await import('./viewerModeStore.js')

      let value = null
      const unsubscribe = isViewerMode.subscribe(v => { value = v })

      expect(value).toBe(true)

      unsubscribe()
    })
  })
})
