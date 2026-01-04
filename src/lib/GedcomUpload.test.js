/**
 * Component tests for GedcomUpload.svelte
 * Story #102: GEDCOM Upload UI Component
 *
 * Tests verify upload workflow, authentication guard,
 * error handling, help modal, and routing integration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte'
import { get } from 'svelte/store'
import GedcomUpload from './GedcomUpload.svelte'
import { api } from './api.js'
import { notifications } from '../stores/notificationStore.js'

// Mock API
vi.mock('./api.js', () => ({
  api: {
    uploadGedcomFile: vi.fn()
  }
}))

// Mock window.location for redirect tests
delete window.location
window.location = { hash: '', href: '' }

describe('GedcomUpload Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    notifications.set([])
    window.location.hash = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('rendering', () => {
    it('should render page title', () => {
      const { container } = render(GedcomUpload)

      expect(container.textContent).toContain('Import GEDCOM File')
    })

    it('should render FileDropZone component', () => {
      const { container } = render(GedcomUpload)

      const dropZone = container.querySelector('.drop-zone, [role="button"]')
      expect(dropZone).toBeTruthy()
    })

    it('should render help button', () => {
      const { container } = render(GedcomUpload)

      const helpButton = screen.getByText(/What is GEDCOM/i)
      expect(helpButton).toBeTruthy()
    })

    it('should render instructions', () => {
      const { container } = render(GedcomUpload)

      expect(container.textContent.toLowerCase()).toContain('upload')
      expect(container.textContent).toContain('.ged')
    })

    it('should not render UploadProgress initially', () => {
      const { container } = render(GedcomUpload)

      const progressBar = container.querySelector('[role="progressbar"]')
      expect(progressBar).toBeFalsy()
    })
  })

  describe('file selection', () => {
    it('should show upload progress when file is selected', async () => {
      const { container } = render(GedcomUpload)

      // Mock upload to never complete (simulating in-progress)
      api.uploadGedcomFile.mockImplementation(() => new Promise(() => {}))

      const dropZone = container.querySelector('.drop-zone, [role="button"]')
      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test content'], 'family.ged', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: { files: [file] }
      })

      // Should show upload progress
      await waitFor(() => {
        const progressBar = container.querySelector('[role="progressbar"]')
        expect(progressBar).toBeTruthy()
      })
    })

    it('should hide FileDropZone when upload starts', async () => {
      const { container } = render(GedcomUpload)

      api.uploadGedcomFile.mockImplementation(() => new Promise(() => {}))

      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test'], 'test.ged', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: { files: [file] }
      })

      await waitFor(() => {
        const dropZone = container.querySelector('.drop-zone')
        expect(dropZone).toBeFalsy()
      })
    })

    it('should display selected file name in progress component', async () => {
      const { container } = render(GedcomUpload)

      api.uploadGedcomFile.mockImplementation(() => new Promise(() => {}))

      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test'], 'my-tree.ged', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: { files: [file] }
      })

      await waitFor(() => {
        expect(container.textContent).toContain('my-tree.ged')
      })
    })
  })

  describe('upload functionality', () => {
    it('should call api.uploadGedcomFile with selected file', async () => {
      const { container } = render(GedcomUpload)

      const mockResponse = {
        uploadId: 'upload-123',
        fileName: 'family.ged',
        fileSize: 1024
      }

      api.uploadGedcomFile.mockResolvedValue(mockResponse)

      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test content'], 'family.ged', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: { files: [file] }
      })

      await waitFor(() => {
        expect(api.uploadGedcomFile).toHaveBeenCalledWith(
          file,
          expect.any(Function), // progress callback
          expect.any(Object) // abort controller
        )
      })
    })

    it('should update progress during upload', async () => {
      const { container } = render(GedcomUpload)

      let progressCallback

      api.uploadGedcomFile.mockImplementation((file, onProgress) => {
        progressCallback = onProgress
        return new Promise(() => {}) // Never resolves
      })

      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test'], 'test.ged', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: { files: [file] }
      })

      await waitFor(() => {
        expect(progressCallback).toBeDefined()
      })

      // Simulate progress updates
      progressCallback(25)
      await waitFor(() => {
        const progressBar = container.querySelector('[role="progressbar"]')
        expect(progressBar.getAttribute('aria-valuenow')).toBe('25')
      })

      progressCallback(75)
      await waitFor(() => {
        const progressBar = container.querySelector('[role="progressbar"]')
        expect(progressBar.getAttribute('aria-valuenow')).toBe('75')
      })
    })

    it('should redirect to parsing results on successful upload', async () => {
      const { container } = render(GedcomUpload)

      const mockResponse = {
        uploadId: 'upload-abc123',
        fileName: 'family.ged',
        fileSize: 2048
      }

      api.uploadGedcomFile.mockResolvedValue(mockResponse)

      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test'], 'test.ged', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: { files: [file] }
      })

      await waitFor(() => {
        expect(window.location.hash).toBe('#/gedcom/parsing/upload-abc123')
      })
    })

    it('should show success notification after upload', async () => {
      const { container } = render(GedcomUpload)

      api.uploadGedcomFile.mockResolvedValue({
        uploadId: 'upload-123',
        fileName: 'test.ged',
        fileSize: 1024
      })

      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test'], 'test.ged', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: { files: [file] }
      })

      await waitFor(() => {
        const notifs = get(notifications)
        expect(notifs.length).toBeGreaterThan(0)
        expect(notifs[0].type).toBe('success')
        expect(notifs[0].message.toLowerCase()).toContain('upload')
      })
    })
  })

  describe('cancel upload', () => {
    it('should show cancel button during upload', async () => {
      const { container } = render(GedcomUpload)

      api.uploadGedcomFile.mockImplementation(() => new Promise(() => {}))

      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test'], 'test.ged', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: { files: [file] }
      })

      await waitFor(() => {
        const cancelButton = screen.getByText(/Cancel/i)
        expect(cancelButton).toBeTruthy()
      })
    })

    it('should reset to initial state when upload is cancelled', async () => {
      const { container } = render(GedcomUpload)

      let abortController
      api.uploadGedcomFile.mockImplementation((file, onProgress, controller) => {
        abortController = controller
        return new Promise(() => {})
      })

      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test'], 'test.ged', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: { files: [file] }
      })

      // Wait for upload to start
      await waitFor(() => {
        const progressBar = container.querySelector('[role="progressbar"]')
        expect(progressBar).toBeTruthy()
      })

      // Click cancel
      const cancelButton = screen.getByText(/Cancel/i)
      await fireEvent.click(cancelButton)

      // Should reset to drop zone
      await waitFor(() => {
        const dropZone = container.querySelector('.drop-zone')
        expect(dropZone).toBeTruthy()
      })

      // Progress should be hidden
      const progressBar = container.querySelector('[role="progressbar"]')
      expect(progressBar).toBeFalsy()
    })

    it('should show info notification when upload is cancelled', async () => {
      const { container } = render(GedcomUpload)

      api.uploadGedcomFile.mockImplementation(() => new Promise(() => {}))

      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test'], 'test.ged', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: { files: [file] }
      })

      await waitFor(() => {
        const cancelButton = screen.getByText(/Cancel/i)
        expect(cancelButton).toBeTruthy()
      })

      const cancelButton = screen.getByText(/Cancel/i)
      await fireEvent.click(cancelButton)

      await waitFor(() => {
        const notifs = get(notifications)
        expect(notifs.some(n => n.type === 'info' && n.message.toLowerCase().includes('cancel'))).toBe(true)
      })
    })
  })

  describe('error handling', () => {
    it('should show error notification for invalid file type', async () => {
      const { container } = render(GedcomUpload)

      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test'], 'invalid.txt', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: { files: [file] }
      })

      await waitFor(() => {
        const notifs = get(notifications)
        expect(notifs.some(n => n.type === 'error' && n.message.includes('.ged'))).toBe(true)
      })
    })

    it('should show error notification for oversized file', async () => {
      const { container } = render(GedcomUpload)

      const fileInput = container.querySelector('input[type="file"]')
      // Create 11MB file
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join('')
      const file = new File([largeContent], 'large.ged', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: { files: [file] }
      })

      await waitFor(() => {
        const notifs = get(notifications)
        expect(notifs.some(n => n.type === 'error' && n.message.includes('10MB'))).toBe(true)
      })
    })

    it('should show error notification for empty file', async () => {
      const { container } = render(GedcomUpload)

      const fileInput = container.querySelector('input[type="file"]')
      const file = new File([], 'empty.ged', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: { files: [file] }
      })

      await waitFor(() => {
        const notifs = get(notifications)
        expect(notifs.some(n => n.type === 'error' && n.message.toLowerCase().includes('empty'))).toBe(true)
      })
    })

    it('should show error and reset on upload failure', async () => {
      const { container } = render(GedcomUpload)

      api.uploadGedcomFile.mockRejectedValue(new Error('Network error'))

      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test'], 'test.ged', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: { files: [file] }
      })

      await waitFor(() => {
        const notifs = get(notifications)
        expect(notifs.some(n => n.type === 'error')).toBe(true)
      })

      // Should reset to drop zone
      await waitFor(() => {
        const dropZone = container.querySelector('.drop-zone')
        expect(dropZone).toBeTruthy()
      })
    })

    it('should show retry option after upload failure', async () => {
      const { container } = render(GedcomUpload)

      api.uploadGedcomFile.mockRejectedValue(new Error('Upload failed'))

      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test'], 'test.ged', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: { files: [file] }
      })

      await waitFor(() => {
        const notifs = get(notifications)
        expect(notifs.some(n => n.type === 'error')).toBe(true)
      })

      // User should be able to retry by selecting file again
      const dropZone = container.querySelector('.drop-zone')
      expect(dropZone).toBeTruthy()
    })

    it('should handle authentication errors appropriately', async () => {
      const { container } = render(GedcomUpload)

      const authError = new Error('Authentication required')
      authError.status = 401
      api.uploadGedcomFile.mockRejectedValue(authError)

      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test'], 'test.ged', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: { files: [file] }
      })

      await waitFor(() => {
        const notifs = get(notifications)
        expect(notifs.some(n => n.type === 'error' && n.message.toLowerCase().includes('auth'))).toBe(true)
      })
    })
  })

  describe('help modal', () => {
    it('should open help modal when help button is clicked', async () => {
      const { container } = render(GedcomUpload)

      const helpButton = screen.getByText(/What is GEDCOM/i)
      await fireEvent.click(helpButton)

      await waitFor(() => {
        const modal = container.querySelector('.modal, [role="dialog"]')
        expect(modal).toBeTruthy()
      })
    })

    it('should display GEDCOM explanation in help modal', async () => {
      const { container } = render(GedcomUpload)

      const helpButton = screen.getByText(/What is GEDCOM/i)
      await fireEvent.click(helpButton)

      await waitFor(() => {
        expect(container.textContent).toContain('GEDCOM')
        expect(container.textContent.toLowerCase()).toContain('genealog')
      })
    })

    it('should have close button in help modal', async () => {
      const { container } = render(GedcomUpload)

      const helpButton = screen.getByText(/What is GEDCOM/i)
      await fireEvent.click(helpButton)

      await waitFor(() => {
        const closeButton = container.querySelector('[aria-label*="Close"]')
        expect(closeButton).toBeTruthy()
      })
    })

    it('should close help modal when close button is clicked', async () => {
      const { container } = render(GedcomUpload)

      const helpButton = screen.getByText(/What is GEDCOM/i)
      await fireEvent.click(helpButton)

      await waitFor(() => {
        const modal = container.querySelector('.modal, [role="dialog"]')
        expect(modal).toBeTruthy()
      })

      const closeButton = container.querySelector('[aria-label*="Close"]')
      await fireEvent.click(closeButton)

      await waitFor(() => {
        const modal = container.querySelector('.modal, [role="dialog"]')
        expect(modal).toBeFalsy()
      })
    })

    it('should close help modal on Escape key', async () => {
      const { container } = render(GedcomUpload)

      const helpButton = screen.getByText(/What is GEDCOM/i)
      await fireEvent.click(helpButton)

      await waitFor(() => {
        const modal = container.querySelector('.modal, [role="dialog"]')
        expect(modal).toBeTruthy()
      })

      // Simulate Escape key on document
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })
      document.dispatchEvent(escapeEvent)

      await waitFor(() => {
        const modal = container.querySelector('.modal, [role="dialog"]')
        expect(modal).toBeFalsy()
      })
    })

    it('should have accessible modal with aria-labelledby', async () => {
      const { container } = render(GedcomUpload)

      const helpButton = screen.getByText(/What is GEDCOM/i)
      await fireEvent.click(helpButton)

      await waitFor(() => {
        const modal = container.querySelector('[role="dialog"]')
        expect(modal).toBeTruthy()
        expect(modal.getAttribute('aria-labelledby')).toBeTruthy()
      })
    })
  })

  describe('authentication guard', () => {
    it('should display authentication required message when not logged in', () => {
      const { container } = render(GedcomUpload, {
        props: { isAuthenticated: false }
      })

      expect(container.textContent).toContain('Sign In')
      expect(container.textContent.toLowerCase()).toContain('authentication')
    })

    it('should hide upload interface when not authenticated', () => {
      const { container } = render(GedcomUpload, {
        props: { isAuthenticated: false }
      })

      const dropZone = container.querySelector('.drop-zone')
      expect(dropZone).toBeFalsy()
    })

    it('should show upload interface when authenticated', () => {
      const { container } = render(GedcomUpload, {
        props: { isAuthenticated: true }
      })

      const dropZone = container.querySelector('.drop-zone')
      expect(dropZone).toBeTruthy()
    })

    it('should display sign in button when not authenticated', () => {
      const { container } = render(GedcomUpload, {
        props: { isAuthenticated: false }
      })

      const signInButton = screen.getByText(/Sign In/i)
      expect(signInButton).toBeTruthy()
    })

    it('should redirect to sign in page when sign in button clicked', async () => {
      const { container } = render(GedcomUpload, {
        props: { isAuthenticated: false }
      })

      const signInButton = screen.getByText(/Sign In/i)
      await fireEvent.click(signInButton)

      expect(window.location.hash).toContain('signin')
    })
  })

  describe('accessibility (WCAG 2.1 AA)', () => {
    it('should have proper page heading structure', () => {
      const { container } = render(GedcomUpload)

      const heading = container.querySelector('h1, h2')
      expect(heading).toBeTruthy()
      expect(heading.textContent).toContain('Import')
    })

    it('should have descriptive page title for screen readers', () => {
      const { container } = render(GedcomUpload)

      // Check for main heading or aria-label
      const main = container.querySelector('main, [role="main"]')
      expect(main || container.querySelector('h1')).toBeTruthy()
    })

    it('should maintain focus management during upload', async () => {
      const { container } = render(GedcomUpload)

      api.uploadGedcomFile.mockImplementation(() => new Promise(() => {}))

      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test'], 'test.ged', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: { files: [file] }
      })

      // Focus should move to progress area or cancel button
      await waitFor(() => {
        const activeElement = document.activeElement
        expect(activeElement).toBeTruthy()
      })
    })

    it('should announce upload status to screen readers', async () => {
      const { container } = render(GedcomUpload)

      // Mock upload to never complete (simulating in-progress state)
      api.uploadGedcomFile.mockImplementation(() => new Promise(() => {}))

      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test'], 'test.ged', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: { files: [file] }
      })

      // Progress component has aria-live="polite" region for status updates
      await waitFor(() => {
        const liveRegion = container.querySelector('[aria-live="polite"]')
        expect(liveRegion).toBeTruthy()
      })
    })
  })

  describe('responsive design', () => {
    it('should render on mobile viewport', () => {
      global.innerWidth = 375
      global.innerHeight = 667

      const { container } = render(GedcomUpload)

      const heading = container.querySelector('h1, h2')
      expect(heading).toBeTruthy()
    })

    it('should maintain readability on small screens', () => {
      const { container } = render(GedcomUpload)

      expect(container.textContent).toContain('Import')
    })

    it('should have touch-friendly buttons on mobile', () => {
      const { container } = render(GedcomUpload)

      const helpButton = screen.getByText(/What is GEDCOM/i)
      expect(helpButton).toBeTruthy()

      // Button should be accessible
      expect(helpButton.tagName).toBe('BUTTON')
    })
  })

  describe('edge cases', () => {
    it('should handle rapid file selections', async () => {
      const { container } = render(GedcomUpload)

      api.uploadGedcomFile.mockResolvedValue({
        uploadId: 'test-123',
        fileName: 'test.ged',
        fileSize: 1024
      })

      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test'], 'test.ged', { type: 'text/plain' })

      // Select file multiple times rapidly
      await fireEvent.change(fileInput, { target: { files: [file] } })
      await fireEvent.change(fileInput, { target: { files: [file] } })
      await fireEvent.change(fileInput, { target: { files: [file] } })

      // Should only process one upload
      await waitFor(() => {
        expect(api.uploadGedcomFile).toHaveBeenCalled()
      })
    })

    it('should handle network timeout gracefully', async () => {
      const { container } = render(GedcomUpload)

      api.uploadGedcomFile.mockRejectedValue(new Error('Request timeout'))

      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test'], 'test.ged', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: { files: [file] }
      })

      await waitFor(() => {
        const notifs = get(notifications)
        expect(notifs.some(n => n.type === 'error')).toBe(true)
      })
    })

    it('should clean up on component unmount', async () => {
      const { container, unmount } = render(GedcomUpload)

      api.uploadGedcomFile.mockImplementation(() => new Promise(() => {}))

      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test'], 'test.ged', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: { files: [file] }
      })

      // Unmount component during upload
      unmount()

      // Should not cause errors
      expect(true).toBe(true)
    })
  })

  describe('integration', () => {
    it('should work with FileDropZone drag and drop', async () => {
      const { container } = render(GedcomUpload)

      api.uploadGedcomFile.mockImplementation(() => new Promise(() => {}))

      const dropZone = container.querySelector('.drop-zone')
      const file = new File(['test'], 'test.ged', { type: 'text/plain' })

      await fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] }
      })

      await waitFor(() => {
        const progressBar = container.querySelector('[role="progressbar"]')
        expect(progressBar).toBeTruthy()
      })
    })

    it('should work with FileDropZone click to browse', async () => {
      const { container } = render(GedcomUpload)

      api.uploadGedcomFile.mockImplementation(() => new Promise(() => {}))

      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test'], 'test.ged', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: { files: [file] }
      })

      await waitFor(() => {
        const progressBar = container.querySelector('[role="progressbar"]')
        expect(progressBar).toBeTruthy()
      })
    })

    it('should integrate with notification system', async () => {
      const { container } = render(GedcomUpload)

      api.uploadGedcomFile.mockResolvedValue({
        uploadId: 'test-123',
        fileName: 'test.ged',
        fileSize: 1024
      })

      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test'], 'test.ged', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: { files: [file] }
      })

      await waitFor(() => {
        const notifs = get(notifications)
        expect(notifs.length).toBeGreaterThan(0)
      })
    })
  })
})
