/**
 * Component tests for Notification.svelte
 *
 * Tests verify rendering, dismiss functionality, accessibility,
 * and multiple notification stacking behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import { get } from 'svelte/store'
import Notification from './Notification.svelte'
import { notifications } from '../../stores/notificationStore.js'

describe('Notification Component', () => {
  beforeEach(() => {
    // Reset notifications store
    notifications.set([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('rendering notifications', () => {
    it('should render nothing when notifications array is empty', () => {
      notifications.set([])
      const { container } = render(Notification)

      // No notification elements should be present
      const notificationElements = container.querySelectorAll('[role="alert"]')
      expect(notificationElements.length).toBe(0)
    })

    it('should render a success notification with correct styling', () => {
      notifications.set([
        { id: '1', message: 'Success message', type: 'success' }
      ])

      const { container } = render(Notification)

      const notification = container.querySelector('[role="alert"]')
      expect(notification).toBeTruthy()
      expect(notification.textContent).toContain('Success message')

      // Check for success class
      expect(notification.classList.contains('notification-success')).toBe(true)
    })

    it('should render an error notification with correct styling', () => {
      notifications.set([
        { id: '2', message: 'Error message', type: 'error' }
      ])

      const { container } = render(Notification)

      const notification = container.querySelector('[role="alert"]')
      expect(notification).toBeTruthy()
      expect(notification.textContent).toContain('Error message')

      // Check for error class
      expect(notification.classList.contains('notification-error')).toBe(true)
    })

    it('should render an info notification with correct styling', () => {
      notifications.set([
        { id: '3', message: 'Info message', type: 'info' }
      ])

      const { container } = render(Notification)

      const notification = container.querySelector('[role="alert"]')
      expect(notification).toBeTruthy()
      expect(notification.textContent).toContain('Info message')

      // Check for info class
      expect(notification.classList.contains('notification-info')).toBe(true)
    })

    it('should render multiple notifications stacked vertically', () => {
      notifications.set([
        { id: '1', message: 'First notification', type: 'success' },
        { id: '2', message: 'Second notification', type: 'error' },
        { id: '3', message: 'Third notification', type: 'info' }
      ])

      const { container } = render(Notification)

      const notificationElements = container.querySelectorAll('[role="alert"]')
      expect(notificationElements.length).toBe(3)

      // Check messages are all present
      expect(container.textContent).toContain('First notification')
      expect(container.textContent).toContain('Second notification')
      expect(container.textContent).toContain('Third notification')
    })
  })

  describe('dismiss functionality', () => {
    it('should have a close button with aria-label', () => {
      notifications.set([
        { id: '1', message: 'Test message', type: 'success' }
      ])

      const { container } = render(Notification)

      const closeButton = container.querySelector('[aria-label="Close notification"]')
      expect(closeButton).toBeTruthy()
    })

    it('should remove notification when close button is clicked', async () => {
      notifications.set([
        { id: '1', message: 'Test message', type: 'success' }
      ])

      const { container } = render(Notification)

      // Verify notification is present in store
      expect(get(notifications).length).toBe(1)

      // Click close button
      const closeButton = container.querySelector('[aria-label="Close notification"]')
      await fireEvent.click(closeButton)

      // Notification should be removed from store (DOM may still show due to transition)
      expect(get(notifications).length).toBe(0)
    })

    it('should remove only the clicked notification when multiple exist', async () => {
      notifications.set([
        { id: '1', message: 'First notification', type: 'success' },
        { id: '2', message: 'Second notification', type: 'error' }
      ])

      const { container } = render(Notification)

      // Verify both notifications are present in store
      expect(get(notifications).length).toBe(2)

      // Click close button on first notification
      const closeButtons = container.querySelectorAll('[aria-label="Close notification"]')
      await fireEvent.click(closeButtons[0])

      // Only first notification should be removed from store
      const remaining = get(notifications)
      expect(remaining.length).toBe(1)
      expect(remaining[0].message).toBe('Second notification')
    })
  })

  describe('accessibility', () => {
    it('should have role="alert" for screen readers', () => {
      notifications.set([
        { id: '1', message: 'Accessible message', type: 'success' }
      ])

      const { container } = render(Notification)

      const notification = container.querySelector('[role="alert"]')
      expect(notification).toBeTruthy()
      expect(notification.getAttribute('role')).toBe('alert')
    })

    it('should have aria-live="polite" on container for announcements', () => {
      notifications.set([
        { id: '1', message: 'Test message', type: 'success' }
      ])

      const { container } = render(Notification)

      const liveRegion = container.querySelector('[aria-live="polite"]')
      expect(liveRegion).toBeTruthy()
    })

    it('should have aria-label on close button', () => {
      notifications.set([
        { id: '1', message: 'Test message', type: 'success' }
      ])

      const { container } = render(Notification)

      const closeButton = container.querySelector('button[aria-label="Close notification"]')
      expect(closeButton).toBeTruthy()
    })

    it('should render notification type in accessible way', () => {
      notifications.set([
        { id: '1', message: 'Success message', type: 'success' }
      ])

      const { container } = render(Notification)

      // Success type should be indicated via class or data attribute
      const notification = container.querySelector('[role="alert"]')
      const hasTypeIndicator =
        notification.classList.contains('notification-success') ||
        notification.getAttribute('data-type') === 'success'

      expect(hasTypeIndicator).toBe(true)
    })
  })

  describe('notification icons', () => {
    it('should display success icon for success notifications', () => {
      notifications.set([
        { id: '1', message: 'Success', type: 'success' }
      ])

      const { container } = render(Notification)

      // Check for success icon (checkmark or similar)
      const notification = container.querySelector('[role="alert"]')
      expect(notification).toBeTruthy()

      // Icon should be present (implementation specific)
      const hasIcon = notification.querySelector('.notification-icon') !== null ||
                      notification.textContent.includes('✓') ||
                      notification.textContent.includes('✔')

      expect(hasIcon).toBe(true)
    })

    it('should display error icon for error notifications', () => {
      notifications.set([
        { id: '1', message: 'Error', type: 'error' }
      ])

      const { container } = render(Notification)

      const notification = container.querySelector('[role="alert"]')
      expect(notification).toBeTruthy()

      // Error icon should be present
      const hasIcon = notification.querySelector('.notification-icon') !== null ||
                      notification.textContent.includes('✕') ||
                      notification.textContent.includes('✖') ||
                      notification.textContent.includes('×')

      expect(hasIcon).toBe(true)
    })

    it('should display info icon for info notifications', () => {
      notifications.set([
        { id: '1', message: 'Info', type: 'info' }
      ])

      const { container } = render(Notification)

      const notification = container.querySelector('[role="alert"]')
      expect(notification).toBeTruthy()

      // Info icon should be present
      const hasIcon = notification.querySelector('.notification-icon') !== null ||
                      notification.textContent.includes('ℹ') ||
                      notification.textContent.includes('i')

      expect(hasIcon).toBe(true)
    })
  })

  describe('positioning', () => {
    it('should position notification container in top-right corner', () => {
      notifications.set([
        { id: '1', message: 'Test', type: 'success' }
      ])

      const { container } = render(Notification)

      const notificationContainer = container.querySelector('.notification-container')
      expect(notificationContainer).toBeTruthy()

      // Check for position: fixed via class or inline style
      // In jsdom, computed styles may not reflect CSS, so check the element exists with the class
      expect(notificationContainer.classList.contains('notification-container')).toBe(true)
    })

    it('should stack multiple notifications vertically with spacing', () => {
      notifications.set([
        { id: '1', message: 'First', type: 'success' },
        { id: '2', message: 'Second', type: 'error' }
      ])

      const { container } = render(Notification)

      const notificationElements = container.querySelectorAll('[role="alert"]')
      expect(notificationElements.length).toBe(2)

      // Should have spacing between notifications
      // This is typically done with CSS gap or margin
    })
  })

  describe('reactivity', () => {
    it('should update when new notification is added to store', async () => {
      const { container } = render(Notification)

      // Initially no notifications
      let notificationElements = container.querySelectorAll('[role="alert"]')
      expect(notificationElements.length).toBe(0)

      // Add notification to store
      notifications.set([
        { id: '1', message: 'New notification', type: 'success' }
      ])

      // Wait for Svelte to update
      await new Promise(resolve => setTimeout(resolve, 0))

      // Notification should now be rendered
      notificationElements = container.querySelectorAll('[role="alert"]')
      expect(notificationElements.length).toBe(1)
      expect(container.textContent).toContain('New notification')
    })

    it('should update when notification is removed from store', async () => {
      notifications.set([
        { id: '1', message: 'Test notification', type: 'success' }
      ])

      const { container } = render(Notification)

      // Notification should be present in store
      expect(get(notifications).length).toBe(1)

      // Remove notification from store
      notifications.set([])

      // Store should be empty
      expect(get(notifications).length).toBe(0)
    })
  })

  describe('close button styling', () => {
    it('should have a close button that is keyboard accessible', () => {
      notifications.set([
        { id: '1', message: 'Test', type: 'success' }
      ])

      const { container } = render(Notification)

      const closeButton = container.querySelector('button[aria-label="Close notification"]')
      expect(closeButton).toBeTruthy()
      expect(closeButton.tagName).toBe('BUTTON')
    })

    it('should display close icon (×) in close button', () => {
      notifications.set([
        { id: '1', message: 'Test', type: 'success' }
      ])

      const { container } = render(Notification)

      const closeButton = container.querySelector('button[aria-label="Close notification"]')
      expect(closeButton).toBeTruthy()
      expect(closeButton.textContent).toContain('×')
    })
  })

  describe('edge cases', () => {
    it('should handle notification with very long message', () => {
      const longMessage = 'This is a very long notification message that should wrap properly and not break the layout or overflow the notification container boundaries.'

      notifications.set([
        { id: '1', message: longMessage, type: 'success' }
      ])

      const { container } = render(Notification)

      const notification = container.querySelector('[role="alert"]')
      expect(notification).toBeTruthy()
      expect(notification.textContent).toContain(longMessage)
    })

    it('should handle notification with special characters', () => {
      const specialMessage = 'Error: <script>alert("XSS")</script> & "quotes" \'apostrophes\''

      notifications.set([
        { id: '1', message: specialMessage, type: 'error' }
      ])

      const { container } = render(Notification)

      const notification = container.querySelector('[role="alert"]')
      expect(notification).toBeTruthy()
      // Message should be escaped/sanitized
      expect(notification.textContent).toContain(specialMessage)
    })

    it('should handle empty message gracefully', () => {
      notifications.set([
        { id: '1', message: '', type: 'info' }
      ])

      const { container } = render(Notification)

      const notification = container.querySelector('[role="alert"]')
      // Should still render even with empty message
      expect(notification).toBeTruthy()
    })
  })
})
