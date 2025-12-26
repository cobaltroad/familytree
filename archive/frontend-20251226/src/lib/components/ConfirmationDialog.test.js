/**
 * @jest-environment jsdom
 */

import { render, fireEvent, screen } from '@testing-library/svelte'
import { describe, it, expect, vi } from 'vitest'
import ConfirmationDialog from './ConfirmationDialog.svelte'

describe('ConfirmationDialog Component', () => {
  describe('Visibility and Structure', () => {
    it('should render with title and message when isOpen is true', () => {
      render(ConfirmationDialog, {
        props: {
          isOpen: true,
          title: 'Delete Relationship',
          message: 'Are you sure you want to remove John Doe as Mother?',
          confirmText: 'Delete',
          cancelText: 'Cancel'
        }
      })

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Delete Relationship')).toBeInTheDocument()
      expect(screen.getByText('Are you sure you want to remove John Doe as Mother?')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      render(ConfirmationDialog, {
        props: {
          isOpen: false,
          title: 'Delete Relationship',
          message: 'Are you sure?',
          confirmText: 'Delete',
          cancelText: 'Cancel'
        }
      })

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render confirm and cancel buttons with custom text', () => {
      render(ConfirmationDialog, {
        props: {
          isOpen: true,
          title: 'Delete Relationship',
          message: 'Are you sure?',
          confirmText: 'Yes, Delete',
          cancelText: 'No, Cancel'
        }
      })

      expect(screen.getByText('Yes, Delete')).toBeInTheDocument()
      expect(screen.getByText('No, Cancel')).toBeInTheDocument()
    })
  })

  describe('Event Dispatching', () => {
    it('should dispatch confirm event when confirm button is clicked', async () => {
      const { component } = render(ConfirmationDialog, {
        props: {
          isOpen: true,
          title: 'Delete',
          message: 'Are you sure?',
          confirmText: 'Confirm',
          cancelText: 'Cancel'
        }
      })

      const confirmHandler = vi.fn()
      component.$on('confirm', confirmHandler)

      const confirmButton = screen.getByText('Confirm')
      await fireEvent.click(confirmButton)

      expect(confirmHandler).toHaveBeenCalledTimes(1)
    })

    it('should dispatch cancel event when cancel button is clicked', async () => {
      const { component } = render(ConfirmationDialog, {
        props: {
          isOpen: true,
          title: 'Delete',
          message: 'Are you sure?',
          confirmText: 'Confirm',
          cancelText: 'Cancel'
        }
      })

      const cancelHandler = vi.fn()
      component.$on('cancel', cancelHandler)

      const cancelButton = screen.getByText('Cancel')
      await fireEvent.click(cancelButton)

      expect(cancelHandler).toHaveBeenCalledTimes(1)
    })

    it('should dispatch cancel event when backdrop is clicked', async () => {
      const { component } = render(ConfirmationDialog, {
        props: {
          isOpen: true,
          title: 'Delete',
          message: 'Are you sure?',
          confirmText: 'Confirm',
          cancelText: 'Cancel'
        }
      })

      const cancelHandler = vi.fn()
      component.$on('cancel', cancelHandler)

      const backdrop = screen.getByRole('dialog').parentElement
      await fireEvent.click(backdrop)

      expect(cancelHandler).toHaveBeenCalledTimes(1)
    })
  })

  describe('Keyboard Navigation', () => {
    it('should dispatch confirm event when Enter key is pressed on confirm button', async () => {
      const { component } = render(ConfirmationDialog, {
        props: {
          isOpen: true,
          title: 'Delete',
          message: 'Are you sure?',
          confirmText: 'Confirm',
          cancelText: 'Cancel'
        }
      })

      const confirmHandler = vi.fn()
      component.$on('confirm', confirmHandler)

      const confirmButton = screen.getByText('Confirm')
      await fireEvent.keyDown(confirmButton, { key: 'Enter' })

      expect(confirmHandler).toHaveBeenCalledTimes(1)
    })

    it('should dispatch cancel event when Escape key is pressed', async () => {
      const { component } = render(ConfirmationDialog, {
        props: {
          isOpen: true,
          title: 'Delete',
          message: 'Are you sure?',
          confirmText: 'Confirm',
          cancelText: 'Cancel'
        }
      })

      const cancelHandler = vi.fn()
      component.$on('cancel', cancelHandler)

      const dialog = screen.getByRole('dialog')
      await fireEvent.keyDown(dialog, { key: 'Escape' })

      expect(cancelHandler).toHaveBeenCalledTimes(1)
    })

    it('should not close dialog on Escape key if preventEscapeClose is true', async () => {
      const { component } = render(ConfirmationDialog, {
        props: {
          isOpen: true,
          title: 'Delete',
          message: 'Are you sure?',
          confirmText: 'Confirm',
          cancelText: 'Cancel',
          preventEscapeClose: true
        }
      })

      const cancelHandler = vi.fn()
      component.$on('cancel', cancelHandler)

      const dialog = screen.getByRole('dialog')
      await fireEvent.keyDown(dialog, { key: 'Escape' })

      expect(cancelHandler).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(ConfirmationDialog, {
        props: {
          isOpen: true,
          title: 'Delete Relationship',
          message: 'Are you sure you want to remove this relationship?',
          confirmText: 'Delete',
          cancelText: 'Cancel'
        }
      })

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby')
      expect(dialog).toHaveAttribute('aria-describedby')
    })

    it('should focus confirm button when dialog opens', async () => {
      const { component } = render(ConfirmationDialog, {
        props: {
          isOpen: false,
          title: 'Delete',
          message: 'Are you sure?',
          confirmText: 'Confirm',
          cancelText: 'Cancel'
        }
      })

      await component.$set({ isOpen: true })

      const confirmButton = screen.getByText('Confirm')
      expect(confirmButton).toHaveFocus()
    })

    it('should have destructive styling on confirm button when isDangerous is true', () => {
      render(ConfirmationDialog, {
        props: {
          isOpen: true,
          title: 'Delete',
          message: 'Are you sure?',
          confirmText: 'Delete',
          cancelText: 'Cancel',
          isDangerous: true
        }
      })

      const confirmButton = screen.getByText('Delete')
      expect(confirmButton).toHaveClass('dangerous')
    })
  })

  describe('Focus Trap', () => {
    it('should trap focus within dialog when tabbing', async () => {
      render(ConfirmationDialog, {
        props: {
          isOpen: true,
          title: 'Delete',
          message: 'Are you sure?',
          confirmText: 'Confirm',
          cancelText: 'Cancel'
        }
      })

      const confirmButton = screen.getByText('Confirm')
      const cancelButton = screen.getByText('Cancel')

      // Focus should start on confirm button
      expect(confirmButton).toHaveFocus()

      // Tab to cancel button
      await fireEvent.keyDown(confirmButton, { key: 'Tab' })
      expect(cancelButton).toHaveFocus()

      // Tab again should cycle back to confirm button
      await fireEvent.keyDown(cancelButton, { key: 'Tab' })
      expect(confirmButton).toHaveFocus()
    })

    it('should support Shift+Tab for reverse tab navigation', async () => {
      render(ConfirmationDialog, {
        props: {
          isOpen: true,
          title: 'Delete',
          message: 'Are you sure?',
          confirmText: 'Confirm',
          cancelText: 'Cancel'
        }
      })

      const confirmButton = screen.getByText('Confirm')
      const cancelButton = screen.getByText('Cancel')

      // Shift+Tab from confirm button should go to cancel button
      await fireEvent.keyDown(confirmButton, { key: 'Tab', shiftKey: true })
      expect(cancelButton).toHaveFocus()
    })
  })
})
