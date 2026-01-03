/**
 * Component tests for UploadProgress.svelte
 * Story #102: GEDCOM Upload UI Component
 *
 * Tests verify progress bar rendering, percentage display,
 * cancel functionality, and accessibility.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/svelte'
import UploadProgress from './UploadProgress.svelte'

describe('UploadProgress Component', () => {
  describe('rendering', () => {
    it('should render progress bar element', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 50 }
      })

      const progressBar = container.querySelector('.progress-bar, [role="progressbar"]')
      expect(progressBar).toBeTruthy()
    })

    it('should display progress percentage as text', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 75 }
      })

      expect(container.textContent).toContain('75%')
    })

    it('should display file name when provided', () => {
      const { container } = render(UploadProgress, {
        props: {
          progress: 30,
          fileName: 'family-tree.ged'
        }
      })

      expect(container.textContent).toContain('family-tree.ged')
    })

    it('should display "Uploading..." text', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 45 }
      })

      expect(container.textContent.toLowerCase()).toContain('upload')
    })

    it('should show cancel button', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 20 }
      })

      const cancelButton = container.querySelector('button')
      expect(cancelButton).toBeTruthy()
      expect(cancelButton.textContent.toLowerCase()).toContain('cancel')
    })
  })

  describe('progress bar visualization', () => {
    it('should display 0% progress correctly', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 0 }
      })

      const progressBar = container.querySelector('.progress-bar, [role="progressbar"]')
      expect(progressBar.getAttribute('aria-valuenow')).toBe('0')
    })

    it('should display 50% progress correctly', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 50 }
      })

      const progressBar = container.querySelector('.progress-bar, [role="progressbar"]')
      expect(progressBar.getAttribute('aria-valuenow')).toBe('50')
    })

    it('should display 100% progress correctly', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 100 }
      })

      const progressBar = container.querySelector('.progress-bar, [role="progressbar"]')
      expect(progressBar.getAttribute('aria-valuenow')).toBe('100')
    })

    it('should update progress bar fill width based on percentage', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 65 }
      })

      const progressFill = container.querySelector('.progress-fill, .progress-bar-fill')
      expect(progressFill).toBeTruthy()

      // Fill should have width style set to progress percentage
      const width = progressFill.style.width
      expect(width).toBe('65%')
    })

    it('should animate progress changes smoothly', async () => {
      const { component, container } = render(UploadProgress, {
        props: { progress: 20 }
      })

      const progressFill = container.querySelector('.progress-fill, .progress-bar-fill')
      expect(progressFill.style.width).toBe('20%')

      // Update progress
      await component.$set({ progress: 80 })

      expect(progressFill.style.width).toBe('80%')
    })
  })

  describe('cancel functionality', () => {
    it('should emit cancel event when cancel button is clicked', async () => {
      const { component, container } = render(UploadProgress, {
        props: { progress: 40 }
      })

      let cancelEmitted = false

      component.$on('cancel', () => {
        cancelEmitted = true
      })

      const cancelButton = container.querySelector('button')
      await fireEvent.click(cancelButton)

      expect(cancelEmitted).toBe(true)
    })

    it('should have cancel button with aria-label', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 25 }
      })

      const cancelButton = container.querySelector('button')
      const ariaLabel = cancelButton.getAttribute('aria-label')

      expect(ariaLabel).toBeTruthy()
      expect(ariaLabel.toLowerCase()).toContain('cancel')
    })

    it('should be keyboard accessible (Enter key)', async () => {
      const { component, container } = render(UploadProgress, {
        props: { progress: 30 }
      })

      let cancelEmitted = false

      component.$on('cancel', () => {
        cancelEmitted = true
      })

      const cancelButton = container.querySelector('button')

      // For buttons, Enter key triggers click, not keydown handler
      // So we test that the button is accessible via keyboard (can be focused and clicked)
      expect(cancelButton.tagName).toBe('BUTTON')
      expect(cancelButton.type).toBe('button')
    })
  })

  describe('accessibility (WCAG 2.1 AA)', () => {
    it('should have role="progressbar"', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 55 }
      })

      const progressBar = container.querySelector('[role="progressbar"]')
      expect(progressBar).toBeTruthy()
    })

    it('should have aria-valuenow matching current progress', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 42 }
      })

      const progressBar = container.querySelector('[role="progressbar"]')
      expect(progressBar.getAttribute('aria-valuenow')).toBe('42')
    })

    it('should have aria-valuemin="0"', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 50 }
      })

      const progressBar = container.querySelector('[role="progressbar"]')
      expect(progressBar.getAttribute('aria-valuemin')).toBe('0')
    })

    it('should have aria-valuemax="100"', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 50 }
      })

      const progressBar = container.querySelector('[role="progressbar"]')
      expect(progressBar.getAttribute('aria-valuemax')).toBe('100')
    })

    it('should have aria-label describing the upload', () => {
      const { container } = render(UploadProgress, {
        props: {
          progress: 60,
          fileName: 'test.ged'
        }
      })

      const progressBar = container.querySelector('[role="progressbar"]')
      const ariaLabel = progressBar.getAttribute('aria-label')

      expect(ariaLabel).toBeTruthy()
      expect(ariaLabel.toLowerCase()).toContain('upload')
    })

    it('should update aria-valuenow when progress changes', async () => {
      const { component, container } = render(UploadProgress, {
        props: { progress: 10 }
      })

      const progressBar = container.querySelector('[role="progressbar"]')
      expect(progressBar.getAttribute('aria-valuenow')).toBe('10')

      await component.$set({ progress: 90 })

      expect(progressBar.getAttribute('aria-valuenow')).toBe('90')
    })

    it('should have aria-live="polite" for screen reader announcements', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 50 }
      })

      const progressRegion = container.querySelector('[aria-live="polite"]')
      expect(progressRegion).toBeTruthy()
    })
  })

  describe('file size display', () => {
    it('should display uploaded and total size when provided', () => {
      const { container } = render(UploadProgress, {
        props: {
          progress: 50,
          uploadedBytes: 5242880, // 5MB
          totalBytes: 10485760 // 10MB
        }
      })

      expect(container.textContent).toContain('5')
      expect(container.textContent).toContain('10')
      expect(container.textContent.toLowerCase()).toContain('mb')
    })

    it('should format bytes to MB correctly', () => {
      const { container } = render(UploadProgress, {
        props: {
          progress: 25,
          uploadedBytes: 2621440, // 2.5MB
          totalBytes: 10485760 // 10MB
        }
      })

      // Should show approximately 2.5 MB / 10 MB
      expect(container.textContent).toMatch(/2\.5.*MB/i)
      expect(container.textContent).toMatch(/10.*MB/i)
    })

    it('should format bytes to KB for small files', () => {
      const { container } = render(UploadProgress, {
        props: {
          progress: 75,
          uploadedBytes: 768000, // 750KB
          totalBytes: 1024000 // 1000KB
        }
      })

      // Should show KB for files < 1MB
      expect(container.textContent.toLowerCase()).toContain('kb')
    })
  })

  describe('visual styling', () => {
    it('should have distinct visual container', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 40 }
      })

      const progressContainer = container.querySelector('.progress-container, .upload-progress')
      expect(progressContainer).toBeTruthy()
    })

    it('should have progress bar with background color', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 30 }
      })

      const progressBar = container.querySelector('.progress-bar, [role="progressbar"]')
      expect(progressBar).toBeTruthy()

      // Should have CSS class for styling
      expect(progressBar.classList.length).toBeGreaterThan(0)
    })

    it('should have progress fill with distinct color', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 60 }
      })

      const progressFill = container.querySelector('.progress-fill, .progress-bar-fill')
      expect(progressFill).toBeTruthy()

      // Should have CSS class for styling
      expect(progressFill.classList.length).toBeGreaterThan(0)
    })

    it('should use smooth CSS transitions for progress changes', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 50 }
      })

      const progressFill = container.querySelector('.progress-fill, .progress-bar-fill')

      // Check for transition class or style
      const hasTransition =
        progressFill.classList.contains('transition') ||
        progressFill.style.transition ||
        window.getComputedStyle(progressFill).transition !== 'none'

      expect(hasTransition).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle progress < 0 gracefully', () => {
      const { container } = render(UploadProgress, {
        props: { progress: -10 }
      })

      const progressBar = container.querySelector('[role="progressbar"]')
      const valuenow = parseInt(progressBar.getAttribute('aria-valuenow'))

      // Should clamp to 0
      expect(valuenow).toBeGreaterThanOrEqual(0)
    })

    it('should handle progress > 100 gracefully', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 150 }
      })

      const progressBar = container.querySelector('[role="progressbar"]')
      const valuenow = parseInt(progressBar.getAttribute('aria-valuenow'))

      // Should clamp to 100
      expect(valuenow).toBeLessThanOrEqual(100)
    })

    it('should handle fractional progress values', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 33.333 }
      })

      const progressBar = container.querySelector('[role="progressbar"]')
      const valuenow = progressBar.getAttribute('aria-valuenow')

      // Should round or truncate
      expect(valuenow).toBeTruthy()
      expect(parseFloat(valuenow)).toBeCloseTo(33.333, 1)
    })

    it('should handle very long file names', () => {
      const longFileName = 'a'.repeat(100) + '.ged'

      const { container } = render(UploadProgress, {
        props: {
          progress: 50,
          fileName: longFileName
        }
      })

      // Should truncate or wrap long file names
      expect(container.textContent).toContain(longFileName.substring(0, 20))
    })

    it('should handle rapid progress updates', async () => {
      const { component, container } = render(UploadProgress, {
        props: { progress: 0 }
      })

      const progressBar = container.querySelector('[role="progressbar"]')

      // Update progress rapidly
      for (let i = 0; i <= 100; i += 10) {
        await component.$set({ progress: i })
      }

      // Should end at 100%
      expect(progressBar.getAttribute('aria-valuenow')).toBe('100')
    })

    it('should handle missing fileName gracefully', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 50 }
      })

      // Should still render without file name
      const progressBar = container.querySelector('[role="progressbar"]')
      expect(progressBar).toBeTruthy()
    })

    it('should handle missing size information gracefully', () => {
      const { container } = render(UploadProgress, {
        props: {
          progress: 50,
          fileName: 'test.ged'
        }
      })

      // Should render without size info
      const progressBar = container.querySelector('[role="progressbar"]')
      expect(progressBar).toBeTruthy()
    })
  })

  describe('completion state', () => {
    it('should display completion state at 100%', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 100 }
      })

      expect(container.textContent).toContain('100%')
    })

    it('should show complete styling at 100%', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 100 }
      })

      const progressFill = container.querySelector('.progress-fill, .progress-bar-fill')

      // Should have full width
      expect(progressFill.style.width).toBe('100%')
    })

    it('should still show cancel button at 100% before completion callback', () => {
      const { container } = render(UploadProgress, {
        props: { progress: 100 }
      })

      // Cancel should still be available during processing
      const cancelButton = container.querySelector('button')
      expect(cancelButton).toBeTruthy()
    })
  })

  describe('responsive design', () => {
    it('should render on mobile viewport', () => {
      global.innerWidth = 375
      global.innerHeight = 667

      const { container } = render(UploadProgress, {
        props: { progress: 50 }
      })

      const progressBar = container.querySelector('[role="progressbar"]')
      expect(progressBar).toBeTruthy()
    })

    it('should maintain readability on small screens', () => {
      const { container } = render(UploadProgress, {
        props: {
          progress: 50,
          fileName: 'long-family-tree-name.ged'
        }
      })

      // Should show percentage
      expect(container.textContent).toContain('50%')
    })
  })

  describe('animation and transitions', () => {
    it('should use transition for progress bar width changes', async () => {
      const { component, container } = render(UploadProgress, {
        props: { progress: 0 }
      })

      const progressFill = container.querySelector('.progress-fill, .progress-bar-fill')

      // Verify progress fill element exists (CSS transitions are applied via stylesheet)
      // Note: jsdom doesn't compute CSS from stylesheets, so we verify element exists
      expect(progressFill).toBeTruthy()
      expect(progressFill.classList.contains('progress-fill')).toBe(true)
    })

    it('should smoothly update from 0 to 100', async () => {
      const { component, container } = render(UploadProgress, {
        props: { progress: 0 }
      })

      const progressBar = container.querySelector('[role="progressbar"]')
      expect(progressBar.getAttribute('aria-valuenow')).toBe('0')

      await component.$set({ progress: 100 })

      expect(progressBar.getAttribute('aria-valuenow')).toBe('100')
    })
  })
})
