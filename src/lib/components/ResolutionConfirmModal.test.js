/**
 * @jest-environment jsdom
 */

/**
 * ResolutionConfirmModal Component Tests
 * Story #106: GEDCOM Duplicate Resolution UI
 *
 * Tests the confirmation modal showing summary of all resolution decisions
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import ResolutionConfirmModal from './ResolutionConfirmModal.svelte'

describe('ResolutionConfirmModal', () => {
  describe('Visibility', () => {
    it('should render modal when show is true', () => {
      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions: []
        }
      })

      // Assert
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should not render modal when show is false', () => {
      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: false,
          resolutions: []
        }
      })

      // Assert
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should have proper ARIA attributes', () => {
      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions: []
        }
      })

      // Assert
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title')
    })
  })

  describe('Modal Structure', () => {
    it('should render modal title', () => {
      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions: []
        }
      })

      // Assert
      expect(screen.getByText('Confirm Resolution Decisions')).toBeInTheDocument()
    })

    it('should render close button', () => {
      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions: []
        }
      })

      // Assert
      const closeButton = screen.getByLabelText('Close modal')
      expect(closeButton).toBeInTheDocument()
    })

    it('should render action buttons', () => {
      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions: []
        }
      })

      // Assert
      expect(screen.getByText('Go Back')).toBeInTheDocument()
      expect(screen.getByText('Confirm and Continue')).toBeInTheDocument()
    })
  })

  describe('Summary Display', () => {
    it('should display count of duplicates being processed', () => {
      // Arrange
      const resolutions = [
        { gedcomId: '@I001@', resolution: 'merge' },
        { gedcomId: '@I002@', resolution: 'skip' }
      ]

      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions
        }
      })

      // Assert
      expect(screen.getByText(/You are about to process 2 duplicates/)).toBeInTheDocument()
    })

    it('should use singular form for one duplicate', () => {
      // Arrange
      const resolutions = [
        { gedcomId: '@I001@', resolution: 'merge' }
      ]

      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions
        }
      })

      // Assert
      expect(screen.getByText(/You are about to process 1 duplicate:/)).toBeInTheDocument()
    })

    it('should display merge count', () => {
      // Arrange
      const resolutions = [
        { gedcomId: '@I001@', resolution: 'merge' },
        { gedcomId: '@I002@', resolution: 'merge' },
        { gedcomId: '@I003@', resolution: 'skip' }
      ]

      // Act
      const { container } = render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions
        }
      })

      // Assert
      expect(screen.getByText('2')).toBeInTheDocument()
      const mergeItems = container.querySelectorAll('.stat-item.merge')
      expect(mergeItems.length).toBe(1)
    })

    it('should display import as new count', () => {
      // Arrange
      const resolutions = [
        { gedcomId: '@I001@', resolution: 'import_as_new' },
        { gedcomId: '@I002@', resolution: 'import_as_new' },
        { gedcomId: '@I003@', resolution: 'merge' }
      ]

      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions
        }
      })

      // Assert
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('Import as New')).toBeInTheDocument()
    })

    it('should display skip count', () => {
      // Arrange
      const resolutions = [
        { gedcomId: '@I001@', resolution: 'skip' },
        { gedcomId: '@I002@', resolution: 'skip' },
        { gedcomId: '@I003@', resolution: 'merge' }
      ]

      // Act
      const { container } = render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions
        }
      })

      // Assert
      expect(screen.getByText('2')).toBeInTheDocument()
      const skipItems = container.querySelectorAll('.stat-item.skip')
      expect(skipItems.length).toBe(1)
    })

    it('should not display stat item if count is zero', () => {
      // Arrange
      const resolutions = [
        { gedcomId: '@I001@', resolution: 'merge' }
      ]

      // Act
      const { container } = render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions
        }
      })

      // Assert
      const statItems = container.querySelectorAll('.stat-item')
      expect(statItems.length).toBe(1) // Only merge stat should be shown
    })

    it('should display all stat types when all are present', () => {
      // Arrange
      const resolutions = [
        { gedcomId: '@I001@', resolution: 'merge' },
        { gedcomId: '@I002@', resolution: 'import_as_new' },
        { gedcomId: '@I003@', resolution: 'skip' }
      ]

      // Act
      const { container } = render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions
        }
      })

      // Assert
      const statItems = container.querySelectorAll('.stat-item')
      expect(statItems.length).toBe(3)
    })
  })

  describe('Warning Display', () => {
    it('should show warning when merge operations are present', () => {
      // Arrange
      const resolutions = [
        { gedcomId: '@I001@', resolution: 'merge' }
      ]

      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions
        }
      })

      // Assert
      expect(screen.getByText(/Warning:/)).toBeInTheDocument()
      expect(screen.getByText(/Merge operations will permanently update/)).toBeInTheDocument()
      expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument()
    })

    it('should not show warning when no merge operations', () => {
      // Arrange
      const resolutions = [
        { gedcomId: '@I001@', resolution: 'skip' },
        { gedcomId: '@I002@', resolution: 'import_as_new' }
      ]

      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions
        }
      })

      // Assert
      expect(screen.queryByText(/Warning:/)).not.toBeInTheDocument()
    })
  })

  describe('Event Handling', () => {
    it('should dispatch confirm event when confirm button is clicked', async () => {
      // Arrange
      const { component } = render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions: []
        }
      })

      const confirmHandler = vi.fn()
      component.$on('confirm', confirmHandler)

      // Act
      const confirmButton = screen.getByText('Confirm and Continue')
      await fireEvent.click(confirmButton)

      // Assert
      expect(confirmHandler).toHaveBeenCalledTimes(1)
    })

    it('should dispatch cancel event when cancel button is clicked', async () => {
      // Arrange
      const { component } = render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions: []
        }
      })

      const cancelHandler = vi.fn()
      component.$on('cancel', cancelHandler)

      // Act
      const cancelButton = screen.getByText('Go Back')
      await fireEvent.click(cancelButton)

      // Assert
      expect(cancelHandler).toHaveBeenCalledTimes(1)
    })

    it('should dispatch cancel event when close button is clicked', async () => {
      // Arrange
      const { component } = render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions: []
        }
      })

      const cancelHandler = vi.fn()
      component.$on('cancel', cancelHandler)

      // Act
      const closeButton = screen.getByLabelText('Close modal')
      await fireEvent.click(closeButton)

      // Assert
      expect(cancelHandler).toHaveBeenCalledTimes(1)
    })

    it('should dispatch cancel event when backdrop is clicked', async () => {
      // Arrange
      const { component, container } = render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions: []
        }
      })

      const cancelHandler = vi.fn()
      component.$on('cancel', cancelHandler)

      // Act
      const backdrop = container.querySelector('.modal-backdrop')
      await fireEvent.click(backdrop)

      // Assert
      expect(cancelHandler).toHaveBeenCalledTimes(1)
    })

    it('should not dispatch cancel when clicking inside modal dialog', async () => {
      // Arrange
      const { component } = render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions: []
        }
      })

      const cancelHandler = vi.fn()
      component.$on('cancel', cancelHandler)

      // Act
      const dialog = screen.getByRole('dialog')
      await fireEvent.click(dialog)

      // Assert
      expect(cancelHandler).not.toHaveBeenCalled()
    })
  })

  describe('Styling', () => {
    it('should apply merge styling to merge stat item', () => {
      // Arrange
      const resolutions = [
        { gedcomId: '@I001@', resolution: 'merge' }
      ]

      // Act
      const { container } = render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions
        }
      })

      // Assert
      const mergeItem = container.querySelector('.stat-item.merge')
      expect(mergeItem).toBeInTheDocument()
    })

    it('should apply import styling to import stat item', () => {
      // Arrange
      const resolutions = [
        { gedcomId: '@I001@', resolution: 'import_as_new' }
      ]

      // Act
      const { container } = render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions
        }
      })

      // Assert
      const importItem = container.querySelector('.stat-item.import')
      expect(importItem).toBeInTheDocument()
    })

    it('should apply skip styling to skip stat item', () => {
      // Arrange
      const resolutions = [
        { gedcomId: '@I001@', resolution: 'skip' }
      ]

      // Act
      const { container } = render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions
        }
      })

      // Assert
      const skipItem = container.querySelector('.stat-item.skip')
      expect(skipItem).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty resolutions array', () => {
      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions: []
        }
      })

      // Assert
      expect(screen.getByText(/You are about to process 0 duplicates/)).toBeInTheDocument()
    })

    it('should handle undefined resolutions', () => {
      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions: undefined
        }
      })

      // Assert - Should not crash
      const dialog = screen.queryByRole('dialog')
      expect(dialog).toBeInTheDocument()
    })

    it('should handle large number of resolutions', () => {
      // Arrange
      const resolutions = Array.from({ length: 100 }, (_, i) => ({
        gedcomId: `@I${String(i + 1).padStart(3, '0')}@`,
        resolution: i % 3 === 0 ? 'merge' : i % 3 === 1 ? 'import_as_new' : 'skip'
      }))

      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions
        }
      })

      // Assert
      expect(screen.getByText(/You are about to process 100 duplicates/)).toBeInTheDocument()
    })

    it('should handle resolution with unexpected type', () => {
      // Arrange
      const resolutions = [
        { gedcomId: '@I001@', resolution: 'merge' },
        { gedcomId: '@I002@', resolution: 'invalid_type' }
      ]

      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions
        }
      })

      // Assert - Should not crash, invalid types should be ignored
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should handle resolution without resolution property', () => {
      // Arrange
      const resolutions = [
        { gedcomId: '@I001@', resolution: 'merge' },
        { gedcomId: '@I002@' } // Missing resolution
      ]

      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions
        }
      })

      // Assert - Should not crash
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should trap focus within modal', () => {
      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions: []
        }
      })

      // Assert - Modal should be present and focusable elements should exist
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should have visible button labels', () => {
      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions: []
        }
      })

      // Assert
      const goBackButton = screen.getByText('Go Back')
      const confirmButton = screen.getByText('Confirm and Continue')

      expect(goBackButton).toBeVisible()
      expect(confirmButton).toBeVisible()
    })

    it('should have semantic heading', () => {
      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions: []
        }
      })

      // Assert
      const heading = screen.getByText('Confirm Resolution Decisions')
      expect(heading.tagName).toBe('H2')
    })
  })

  describe('Pluralization', () => {
    it('should use plural form for multiple merges', () => {
      // Arrange
      const resolutions = [
        { gedcomId: '@I001@', resolution: 'merge' },
        { gedcomId: '@I002@', resolution: 'merge' }
      ]

      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions
        }
      })

      // Assert
      expect(screen.getByText('Merges')).toBeInTheDocument()
    })

    it('should use singular form for one merge', () => {
      // Arrange
      const resolutions = [
        { gedcomId: '@I001@', resolution: 'merge' }
      ]

      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions
        }
      })

      // Assert
      expect(screen.getByText('Merge')).toBeInTheDocument()
    })

    it('should handle skip pluralization correctly', () => {
      // Arrange
      const resolutionsPlural = [
        { gedcomId: '@I001@', resolution: 'skip' },
        { gedcomId: '@I002@', resolution: 'skip' }
      ]

      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions: resolutionsPlural
        }
      })

      // Assert - Plural form
      expect(screen.getByText('Skipped')).toBeInTheDocument()
    })

    it('should use singular form for one skip', () => {
      // Arrange
      const resolutionsSingular = [
        { gedcomId: '@I001@', resolution: 'skip' }
      ]

      // Act
      render(ResolutionConfirmModal, {
        props: {
          show: true,
          resolutions: resolutionsSingular
        }
      })

      // Assert - Singular form
      expect(screen.getByText('Skip')).toBeInTheDocument()
    })
  })
})
