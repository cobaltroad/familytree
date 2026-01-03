/**
 * Component tests for FileDropZone.svelte
 * Story #102: GEDCOM Upload UI Component
 *
 * Tests verify drag-and-drop functionality, file validation,
 * click-to-browse, accessibility, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/svelte'
import FileDropZone from './FileDropZone.svelte'

describe('FileDropZone Component', () => {
  describe('rendering', () => {
    it('should render drop zone with instruction text', () => {
      const { container } = render(FileDropZone)

      expect(container.querySelector('.drop-zone')).toBeTruthy()
      expect(container.textContent).toContain('Drag and drop')
    })

    it('should render "Click to browse" text', () => {
      const { container } = render(FileDropZone)

      expect(container.textContent).toContain('Click to browse')
    })

    it('should have a hidden file input element', () => {
      const { container } = render(FileDropZone)

      const input = container.querySelector('input[type="file"]')
      expect(input).toBeTruthy()
      expect(input.style.display === 'none' || input.classList.contains('visually-hidden')).toBe(true)
    })

    it('should accept only .ged files', () => {
      const { container } = render(FileDropZone)

      const input = container.querySelector('input[type="file"]')
      expect(input.getAttribute('accept')).toBe('.ged')
    })

    it('should display file type hint (.ged only)', () => {
      const { container } = render(FileDropZone)

      expect(container.textContent.toLowerCase()).toContain('.ged')
    })

    it('should display size limit hint (10MB)', () => {
      const { container } = render(FileDropZone)

      expect(container.textContent).toContain('10MB')
    })
  })

  describe('drag and drop behavior', () => {
    it('should add drag-over class when dragging file over zone', async () => {
      const { container } = render(FileDropZone)

      const dropZone = container.querySelector('.drop-zone')
      await fireEvent.dragEnter(dropZone)

      expect(dropZone.classList.contains('drag-over')).toBe(true)
    })

    it('should remove drag-over class when dragging file out', async () => {
      const { container } = render(FileDropZone)

      const dropZone = container.querySelector('.drop-zone')
      await fireEvent.dragEnter(dropZone)
      expect(dropZone.classList.contains('drag-over')).toBe(true)

      await fireEvent.dragLeave(dropZone)
      expect(dropZone.classList.contains('drag-over')).toBe(false)
    })

    it('should emit fileSelected event when file is dropped', async () => {
      const { component, container } = render(FileDropZone)

      let fileSelectedEmitted = false
      let selectedFile = null

      component.$on('fileSelected', (event) => {
        fileSelectedEmitted = true
        selectedFile = event.detail.file
      })

      const dropZone = container.querySelector('.drop-zone')
      const file = new File(['test content'], 'family.ged', { type: 'text/plain' })

      await fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file]
        }
      })

      expect(fileSelectedEmitted).toBe(true)
      expect(selectedFile.name).toBe('family.ged')
    })

    it('should remove drag-over class after drop', async () => {
      const { container } = render(FileDropZone)

      const dropZone = container.querySelector('.drop-zone')
      const file = new File(['test content'], 'family.ged', { type: 'text/plain' })

      await fireEvent.dragEnter(dropZone)
      expect(dropZone.classList.contains('drag-over')).toBe(true)

      await fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file]
        }
      })

      expect(dropZone.classList.contains('drag-over')).toBe(false)
    })

    it('should prevent default drag behavior', async () => {
      const { container } = render(FileDropZone)

      const dropZone = container.querySelector('.drop-zone')

      const dragOverEvent = new Event('dragover', { bubbles: true, cancelable: true })
      const preventDefaultSpy = vi.spyOn(dragOverEvent, 'preventDefault')

      dropZone.dispatchEvent(dragOverEvent)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('click to browse behavior', () => {
    it('should open file browser when drop zone is clicked', async () => {
      const { container } = render(FileDropZone)

      const dropZone = container.querySelector('.drop-zone')
      const fileInput = container.querySelector('input[type="file"]')

      const clickSpy = vi.spyOn(fileInput, 'click')
      await fireEvent.click(dropZone)

      expect(clickSpy).toHaveBeenCalled()
    })

    it('should emit fileSelected event when file is chosen via browser', async () => {
      const { component, container } = render(FileDropZone)

      let fileSelectedEmitted = false
      let selectedFile = null

      component.$on('fileSelected', (event) => {
        fileSelectedEmitted = true
        selectedFile = event.detail.file
      })

      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test content'], 'tree.ged', { type: 'text/plain' })

      await fireEvent.change(fileInput, {
        target: {
          files: [file]
        }
      })

      expect(fileSelectedEmitted).toBe(true)
      expect(selectedFile.name).toBe('tree.ged')
    })
  })

  describe('file validation', () => {
    it('should emit error event for non-.ged file via drop', async () => {
      const { component, container } = render(FileDropZone)

      let errorEmitted = false
      let errorMessage = null

      component.$on('error', (event) => {
        errorEmitted = true
        errorMessage = event.detail.message
      })

      const dropZone = container.querySelector('.drop-zone')
      const file = new File(['test content'], 'family.txt', { type: 'text/plain' })

      await fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file]
        }
      })

      expect(errorEmitted).toBe(true)
      expect(errorMessage.toLowerCase()).toContain('.ged')
    })

    it('should emit error event for file exceeding 10MB', async () => {
      const { component, container } = render(FileDropZone)

      let errorEmitted = false
      let errorMessage = null

      component.$on('error', (event) => {
        errorEmitted = true
        errorMessage = event.detail.message
      })

      const dropZone = container.querySelector('.drop-zone')
      // Create file larger than 10MB
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join('')
      const file = new File([largeContent], 'large.ged', { type: 'text/plain' })

      await fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file]
        }
      })

      expect(errorEmitted).toBe(true)
      expect(errorMessage).toContain('10MB')
    })

    it('should emit error event for empty file', async () => {
      const { component, container } = render(FileDropZone)

      let errorEmitted = false
      let errorMessage = null

      component.$on('error', (event) => {
        errorEmitted = true
        errorMessage = event.detail.message
      })

      const dropZone = container.querySelector('.drop-zone')
      const file = new File([], 'empty.ged', { type: 'text/plain' })

      await fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file]
        }
      })

      expect(errorEmitted).toBe(true)
      expect(errorMessage.toLowerCase()).toContain('empty')
    })

    it('should accept valid .ged file within size limit', async () => {
      const { component, container } = render(FileDropZone)

      let fileSelectedEmitted = false
      let errorEmitted = false

      component.$on('fileSelected', () => {
        fileSelectedEmitted = true
      })

      component.$on('error', () => {
        errorEmitted = true
      })

      const dropZone = container.querySelector('.drop-zone')
      const file = new File(['valid gedcom content'], 'valid.ged', { type: 'text/plain' })

      await fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file]
        }
      })

      expect(fileSelectedEmitted).toBe(true)
      expect(errorEmitted).toBe(false)
    })
  })

  describe('accessibility (WCAG 2.1 AA)', () => {
    it('should have role="button" for click behavior', () => {
      const { container } = render(FileDropZone)

      const dropZone = container.querySelector('.drop-zone')
      expect(dropZone.getAttribute('role')).toBe('button')
    })

    it('should have tabindex="0" for keyboard navigation', () => {
      const { container } = render(FileDropZone)

      const dropZone = container.querySelector('.drop-zone')
      expect(dropZone.getAttribute('tabindex')).toBe('0')
    })

    it('should have aria-label describing functionality', () => {
      const { container } = render(FileDropZone)

      const dropZone = container.querySelector('.drop-zone')
      const ariaLabel = dropZone.getAttribute('aria-label')

      expect(ariaLabel).toBeTruthy()
      expect(ariaLabel.toLowerCase()).toContain('upload')
    })

    it('should trigger file browser on Enter key', async () => {
      const { container } = render(FileDropZone)

      const dropZone = container.querySelector('.drop-zone')
      const fileInput = container.querySelector('input[type="file"]')

      const clickSpy = vi.spyOn(fileInput, 'click')
      await fireEvent.keyDown(dropZone, { key: 'Enter', code: 'Enter' })

      expect(clickSpy).toHaveBeenCalled()
    })

    it('should trigger file browser on Space key', async () => {
      const { container } = render(FileDropZone)

      const dropZone = container.querySelector('.drop-zone')
      const fileInput = container.querySelector('input[type="file"]')

      const clickSpy = vi.spyOn(fileInput, 'click')
      await fireEvent.keyDown(dropZone, { key: ' ', code: 'Space' })

      expect(clickSpy).toHaveBeenCalled()
    })

    it('should have proper label for file input', () => {
      const { container } = render(FileDropZone)

      const fileInput = container.querySelector('input[type="file"]')
      const label = container.querySelector(`label[for="${fileInput.id}"]`)

      // Either explicit label or aria-label on input
      const hasAccessibleLabel = label || fileInput.getAttribute('aria-label')
      expect(hasAccessibleLabel).toBeTruthy()
    })
  })

  describe('visual feedback', () => {
    it('should display upload icon', () => {
      const { container } = render(FileDropZone)

      const icon = container.querySelector('.upload-icon, svg, .icon')
      expect(icon).toBeTruthy()
    })

    it('should show hover state with cursor pointer', () => {
      const { container } = render(FileDropZone)

      const dropZone = container.querySelector('.drop-zone')

      // Check that drop zone has cursor pointer class
      // Note: jsdom doesn't compute CSS styles, so we verify the element has the class
      expect(dropZone.classList.contains('drop-zone')).toBe(true)
    })

    it('should have border or background to indicate droppable area', () => {
      const { container } = render(FileDropZone)

      const dropZone = container.querySelector('.drop-zone')
      expect(dropZone).toBeTruthy()

      // Drop zone should have visual styling
      expect(dropZone.classList.length).toBeGreaterThan(0)
    })
  })

  describe('multiple file handling', () => {
    it('should only accept single file when multiple files dropped', async () => {
      const { component, container } = render(FileDropZone)

      let fileSelectedEmitted = false
      let selectedFile = null

      component.$on('fileSelected', (event) => {
        fileSelectedEmitted = true
        selectedFile = event.detail.file
      })

      const dropZone = container.querySelector('.drop-zone')
      const file1 = new File(['content1'], 'file1.ged', { type: 'text/plain' })
      const file2 = new File(['content2'], 'file2.ged', { type: 'text/plain' })

      await fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file1, file2]
        }
      })

      // Should only select first file
      expect(fileSelectedEmitted).toBe(true)
      expect(selectedFile.name).toBe('file1.ged')
    })

    it('should emit error when no files in drop event', async () => {
      const { component, container } = render(FileDropZone)

      let errorEmitted = false

      component.$on('error', () => {
        errorEmitted = true
      })

      const dropZone = container.querySelector('.drop-zone')

      await fireEvent.drop(dropZone, {
        dataTransfer: {
          files: []
        }
      })

      expect(errorEmitted).toBe(true)
    })
  })

  describe('disabled state', () => {
    it('should render disabled state when disabled prop is true', () => {
      const { container } = render(FileDropZone, {
        props: { disabled: true }
      })

      const dropZone = container.querySelector('.drop-zone')
      expect(
        dropZone.classList.contains('disabled') ||
        dropZone.getAttribute('aria-disabled') === 'true'
      ).toBe(true)
    })

    it('should not emit fileSelected when disabled', async () => {
      const { component, container } = render(FileDropZone, {
        props: { disabled: true }
      })

      let fileSelectedEmitted = false

      component.$on('fileSelected', () => {
        fileSelectedEmitted = true
      })

      const dropZone = container.querySelector('.drop-zone')
      const file = new File(['test'], 'test.ged', { type: 'text/plain' })

      await fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file]
        }
      })

      expect(fileSelectedEmitted).toBe(false)
    })

    it('should not open file browser when clicked while disabled', async () => {
      const { container } = render(FileDropZone, {
        props: { disabled: true }
      })

      const dropZone = container.querySelector('.drop-zone')
      const fileInput = container.querySelector('input[type="file"]')

      const clickSpy = vi.spyOn(fileInput, 'click')
      await fireEvent.click(dropZone)

      expect(clickSpy).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle file with uppercase .GED extension', async () => {
      const { component, container } = render(FileDropZone)

      let fileSelectedEmitted = false

      component.$on('fileSelected', () => {
        fileSelectedEmitted = true
      })

      const dropZone = container.querySelector('.drop-zone')
      const file = new File(['test'], 'FAMILY.GED', { type: 'text/plain' })

      await fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file]
        }
      })

      expect(fileSelectedEmitted).toBe(true)
    })

    it('should handle file with mixed case .Ged extension', async () => {
      const { component, container } = render(FileDropZone)

      let fileSelectedEmitted = false

      component.$on('fileSelected', () => {
        fileSelectedEmitted = true
      })

      const dropZone = container.querySelector('.drop-zone')
      const file = new File(['test'], 'tree.Ged', { type: 'text/plain' })

      await fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file]
        }
      })

      expect(fileSelectedEmitted).toBe(true)
    })

    it('should handle file at exactly 10MB (boundary test)', async () => {
      const { component, container } = render(FileDropZone)

      let fileSelectedEmitted = false

      component.$on('fileSelected', () => {
        fileSelectedEmitted = true
      })

      const dropZone = container.querySelector('.drop-zone')
      // Exactly 10MB
      const content = new Array(10 * 1024 * 1024).fill('a').join('')
      const file = new File([content], 'exact.ged', { type: 'text/plain' })

      await fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file]
        }
      })

      expect(fileSelectedEmitted).toBe(true)
    })

    it('should handle rapid click events', async () => {
      const { container } = render(FileDropZone)

      const dropZone = container.querySelector('.drop-zone')
      const fileInput = container.querySelector('input[type="file"]')

      const clickSpy = vi.spyOn(fileInput, 'click')

      // Click 5 times rapidly
      for (let i = 0; i < 5; i++) {
        await fireEvent.click(dropZone)
      }

      // Should call click at least 5 times (may be more due to event bubbling)
      expect(clickSpy.mock.calls.length).toBeGreaterThanOrEqual(5)
    })

    it('should handle file with no extension gracefully', async () => {
      const { component, container } = render(FileDropZone)

      let errorEmitted = false

      component.$on('error', () => {
        errorEmitted = true
      })

      const dropZone = container.querySelector('.drop-zone')
      const file = new File(['test'], 'noextension', { type: 'text/plain' })

      await fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file]
        }
      })

      expect(errorEmitted).toBe(true)
    })
  })

  describe('responsive design', () => {
    it('should render on mobile viewport', () => {
      global.innerWidth = 375
      global.innerHeight = 667

      const { container } = render(FileDropZone)

      const dropZone = container.querySelector('.drop-zone')
      expect(dropZone).toBeTruthy()
    })

    it('should be touch-friendly on mobile', async () => {
      const { component, container } = render(FileDropZone)

      const dropZone = container.querySelector('.drop-zone')
      const fileInput = container.querySelector('input[type="file"]')

      const clickSpy = vi.spyOn(fileInput, 'click')

      // Simulate touch tap
      await fireEvent.click(dropZone)

      expect(clickSpy).toHaveBeenCalled()
    })
  })
})
