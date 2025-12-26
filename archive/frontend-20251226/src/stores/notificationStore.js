/**
 * Toast notification store for non-blocking user feedback.
 * Provides success, error, and info notifications with auto-dismiss functionality.
 *
 * @module notificationStore
 */

import { writable } from 'svelte/store'

/**
 * @typedef {Object} Notification
 * @property {string} id - Unique identifier for the notification
 * @property {string} message - Message to display
 * @property {'success'|'error'|'info'} type - Type of notification
 */

/**
 * Maximum number of visible notifications at once.
 * Oldest notifications are removed when limit is exceeded.
 */
const MAX_NOTIFICATIONS = 3

/**
 * Auto-dismiss timeout durations (in milliseconds).
 */
const TIMEOUTS = {
  success: 3000, // 3 seconds
  error: 5000,   // 5 seconds (longer for errors)
  info: 3000     // 3 seconds
}

/**
 * Store containing all active notifications.
 * @type {import('svelte/store').Writable<Notification[]>}
 */
export const notifications = writable([])

/**
 * Generates a unique ID for a notification.
 * Uses timestamp and random number to ensure uniqueness.
 *
 * @returns {string} Unique notification ID
 */
function generateId() {
  return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Adds a notification to the store and sets up auto-dismiss.
 * Enforces maximum notification limit by removing oldest notifications.
 *
 * @param {string} message - Message to display
 * @param {'success'|'error'|'info'} type - Type of notification
 */
function addNotification(message, type) {
  const id = generateId()
  const notification = { id, message, type }

  notifications.update(current => {
    // Add new notification
    const updated = [...current, notification]

    // Enforce max limit by removing oldest notifications
    if (updated.length > MAX_NOTIFICATIONS) {
      return updated.slice(updated.length - MAX_NOTIFICATIONS)
    }

    return updated
  })

  // Set up auto-dismiss timer
  const timeout = TIMEOUTS[type]
  setTimeout(() => {
    clearNotification(id)
  }, timeout)
}

/**
 * Displays a success notification.
 * Auto-dismisses after 3 seconds.
 *
 * @param {string} message - Success message to display
 *
 * @example
 * success('Person saved successfully')
 */
export function success(message) {
  addNotification(message, 'success')
}

/**
 * Displays an error notification.
 * Auto-dismisses after 5 seconds (longer than success for user to read).
 *
 * @param {string} message - Error message to display
 *
 * @example
 * error('Failed to save person')
 */
export function error(message) {
  addNotification(message, 'error')
}

/**
 * Displays an info notification.
 * Auto-dismisses after 3 seconds.
 *
 * @param {string} message - Info message to display
 *
 * @example
 * info('Loading data...')
 */
export function info(message) {
  addNotification(message, 'info')
}

/**
 * Manually removes a notification by ID.
 * Used for manual dismiss (X button, Escape key).
 *
 * @param {string} id - ID of notification to remove
 *
 * @example
 * clearNotification('notification-123456')
 */
export function clearNotification(id) {
  notifications.update(current => current.filter(n => n.id !== id))
}
