import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { get } from 'svelte/store'
import { notifications, success, error as errorNotification, info, clearNotification } from './notificationStore.js'

describe('notificationStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    notifications.set([])
    // Clear all timers
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('notifications store', () => {
    it('should initialize as an empty array', () => {
      const value = get(notifications)
      expect(value).toEqual([])
      expect(Array.isArray(value)).toBe(true)
    })

    it('should allow setting notifications array', () => {
      const testNotifications = [
        { id: '1', message: 'Test message', type: 'success' }
      ]

      notifications.set(testNotifications)

      const value = get(notifications)
      expect(value).toEqual(testNotifications)
      expect(value.length).toBe(1)
    })

    it('should allow subscribing to changes', () => {
      let capturedValue
      const unsubscribe = notifications.subscribe(value => {
        capturedValue = value
      })

      notifications.set([{ id: '1', message: 'Test', type: 'info' }])

      expect(capturedValue).toEqual([{ id: '1', message: 'Test', type: 'info' }])

      unsubscribe()
    })
  })

  describe('success()', () => {
    it('should add a success notification with unique id', () => {
      success('Operation successful')

      const value = get(notifications)
      expect(value.length).toBe(1)
      expect(value[0].message).toBe('Operation successful')
      expect(value[0].type).toBe('success')
      expect(value[0].id).toBeDefined()
      expect(typeof value[0].id).toBe('string')
    })

    it('should add multiple success notifications with unique ids', () => {
      success('First success')
      success('Second success')

      const value = get(notifications)
      expect(value.length).toBe(2)
      expect(value[0].id).not.toBe(value[1].id)
      expect(value[0].message).toBe('First success')
      expect(value[1].message).toBe('Second success')
    })

    it('should auto-dismiss success notification after 3 seconds', () => {
      vi.useFakeTimers()

      success('Auto-dismiss test')

      let value = get(notifications)
      expect(value.length).toBe(1)

      // Fast-forward time by 2.9 seconds - notification should still be there
      vi.advanceTimersByTime(2900)
      value = get(notifications)
      expect(value.length).toBe(1)

      // Fast-forward time by another 0.2 seconds (total 3.1s) - notification should be gone
      vi.advanceTimersByTime(200)
      value = get(notifications)
      expect(value.length).toBe(0)

      vi.useRealTimers()
    })

    it('should limit to maximum 3 visible notifications', () => {
      success('Notification 1')
      success('Notification 2')
      success('Notification 3')
      success('Notification 4')

      const value = get(notifications)
      expect(value.length).toBe(3)
      // Newest notifications should be kept, oldest should be removed
      expect(value[0].message).toBe('Notification 2')
      expect(value[1].message).toBe('Notification 3')
      expect(value[2].message).toBe('Notification 4')
    })
  })

  describe('error()', () => {
    it('should add an error notification with unique id', () => {
      errorNotification('Operation failed')

      const value = get(notifications)
      expect(value.length).toBe(1)
      expect(value[0].message).toBe('Operation failed')
      expect(value[0].type).toBe('error')
      expect(value[0].id).toBeDefined()
      expect(typeof value[0].id).toBe('string')
    })

    it('should add multiple error notifications with unique ids', () => {
      errorNotification('First error')
      errorNotification('Second error')

      const value = get(notifications)
      expect(value.length).toBe(2)
      expect(value[0].id).not.toBe(value[1].id)
      expect(value[0].message).toBe('First error')
      expect(value[1].message).toBe('Second error')
    })

    it('should auto-dismiss error notification after 5 seconds', () => {
      vi.useFakeTimers()

      errorNotification('Auto-dismiss error test')

      let value = get(notifications)
      expect(value.length).toBe(1)

      // Fast-forward time by 4.9 seconds - notification should still be there
      vi.advanceTimersByTime(4900)
      value = get(notifications)
      expect(value.length).toBe(1)

      // Fast-forward time by another 0.2 seconds (total 5.1s) - notification should be gone
      vi.advanceTimersByTime(200)
      value = get(notifications)
      expect(value.length).toBe(0)

      vi.useRealTimers()
    })

    it('should limit to maximum 3 visible notifications', () => {
      errorNotification('Error 1')
      errorNotification('Error 2')
      errorNotification('Error 3')
      errorNotification('Error 4')

      const value = get(notifications)
      expect(value.length).toBe(3)
      // Newest notifications should be kept, oldest should be removed
      expect(value[0].message).toBe('Error 2')
      expect(value[1].message).toBe('Error 3')
      expect(value[2].message).toBe('Error 4')
    })
  })

  describe('info()', () => {
    it('should add an info notification with unique id', () => {
      info('Information message')

      const value = get(notifications)
      expect(value.length).toBe(1)
      expect(value[0].message).toBe('Information message')
      expect(value[0].type).toBe('info')
      expect(value[0].id).toBeDefined()
      expect(typeof value[0].id).toBe('string')
    })

    it('should add multiple info notifications with unique ids', () => {
      info('First info')
      info('Second info')

      const value = get(notifications)
      expect(value.length).toBe(2)
      expect(value[0].id).not.toBe(value[1].id)
      expect(value[0].message).toBe('First info')
      expect(value[1].message).toBe('Second info')
    })

    it('should auto-dismiss info notification after 3 seconds', () => {
      vi.useFakeTimers()

      info('Auto-dismiss info test')

      let value = get(notifications)
      expect(value.length).toBe(1)

      // Fast-forward time by 2.9 seconds - notification should still be there
      vi.advanceTimersByTime(2900)
      value = get(notifications)
      expect(value.length).toBe(1)

      // Fast-forward time by another 0.2 seconds (total 3.1s) - notification should be gone
      vi.advanceTimersByTime(200)
      value = get(notifications)
      expect(value.length).toBe(0)

      vi.useRealTimers()
    })

    it('should limit to maximum 3 visible notifications', () => {
      info('Info 1')
      info('Info 2')
      info('Info 3')
      info('Info 4')

      const value = get(notifications)
      expect(value.length).toBe(3)
      // Newest notifications should be kept, oldest should be removed
      expect(value[0].message).toBe('Info 2')
      expect(value[1].message).toBe('Info 3')
      expect(value[2].message).toBe('Info 4')
    })
  })

  describe('clearNotification()', () => {
    it('should remove notification by id', () => {
      success('First notification')
      success('Second notification')

      let value = get(notifications)
      expect(value.length).toBe(2)
      const firstId = value[0].id

      clearNotification(firstId)

      value = get(notifications)
      expect(value.length).toBe(1)
      expect(value[0].message).toBe('Second notification')
    })

    it('should do nothing if notification id does not exist', () => {
      success('Only notification')

      let value = get(notifications)
      expect(value.length).toBe(1)

      clearNotification('non-existent-id')

      value = get(notifications)
      expect(value.length).toBe(1)
      expect(value[0].message).toBe('Only notification')
    })

    it('should handle clearing from empty notifications array', () => {
      expect(() => {
        clearNotification('any-id')
      }).not.toThrow()

      const value = get(notifications)
      expect(value.length).toBe(0)
    })
  })

  describe('mixed notification types', () => {
    it('should handle multiple notification types together', () => {
      success('Success message')
      errorNotification('Error message')
      info('Info message')

      const value = get(notifications)
      expect(value.length).toBe(3)
      expect(value[0].type).toBe('success')
      expect(value[1].type).toBe('error')
      expect(value[2].type).toBe('info')
    })

    it('should enforce max 3 notifications across all types', () => {
      success('Success 1')
      errorNotification('Error 1')
      info('Info 1')
      success('Success 2')

      const value = get(notifications)
      expect(value.length).toBe(3)
      // First success should be removed
      expect(value[0].type).toBe('error')
      expect(value[1].type).toBe('info')
      expect(value[2].type).toBe('success')
    })

    it('should auto-dismiss different types at correct intervals', () => {
      vi.useFakeTimers()

      success('Success - 3s timeout')
      errorNotification('Error - 5s timeout')

      let value = get(notifications)
      expect(value.length).toBe(2)

      // After 3.1 seconds, success should be gone, error still there
      vi.advanceTimersByTime(3100)
      value = get(notifications)
      expect(value.length).toBe(1)
      expect(value[0].type).toBe('error')

      // After another 2 seconds (total 5.1s), error should be gone
      vi.advanceTimersByTime(2000)
      value = get(notifications)
      expect(value.length).toBe(0)

      vi.useRealTimers()
    })
  })

  describe('notification structure', () => {
    it('should create notification with all required properties', () => {
      success('Test message')

      const value = get(notifications)
      const notification = value[0]

      expect(notification).toHaveProperty('id')
      expect(notification).toHaveProperty('message')
      expect(notification).toHaveProperty('type')
      expect(Object.keys(notification).length).toBe(3)
    })

    it('should generate unique ids using timestamp-based approach', () => {
      const ids = new Set()

      for (let i = 0; i < 10; i++) {
        success(`Message ${i}`)
      }

      const value = get(notifications)
      // Only 3 should remain due to max limit
      expect(value.length).toBe(3)

      value.forEach(notification => {
        ids.add(notification.id)
      })

      // All ids should be unique
      expect(ids.size).toBe(3)
    })
  })
})
