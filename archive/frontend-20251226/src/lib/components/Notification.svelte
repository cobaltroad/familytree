<script>
  import { notifications, clearNotification } from '../../stores/notificationStore.js'
  import { fly } from 'svelte/transition'

  /**
   * Get icon for notification type
   * @param {string} type - Notification type (success, error, info)
   * @returns {string} Icon character
   */
  function getIcon(type) {
    switch (type) {
      case 'success':
        return '✓'
      case 'error':
        return '✕'
      case 'info':
        return 'ℹ'
      default:
        return 'ℹ'
    }
  }

  /**
   * Handle dismiss button click
   * @param {string} id - Notification ID to dismiss
   */
  function handleDismiss(id) {
    clearNotification(id)
  }

  /**
   * Handle keyboard events for accessibility
   * @param {KeyboardEvent} event
   */
  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      // Dismiss the first (oldest) notification on Escape
      const current = $notifications
      if (current.length > 0) {
        clearNotification(current[0].id)
      }
    }
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

<!-- Notification container with ARIA live region -->
<div class="notification-container" aria-live="polite">
  {#each $notifications as notification (notification.id)}
    <div
      role="alert"
      class="notification notification-{notification.type}"
      data-type={notification.type}
      transition:fly={{ y: -20, duration: 300 }}
    >
      <div class="notification-content">
        <span class="notification-icon">{getIcon(notification.type)}</span>
        <span class="notification-message">{notification.message}</span>
      </div>
      <button
        class="notification-close"
        aria-label="Close notification"
        on:click={() => handleDismiss(notification.id)}
      >
        ×
      </button>
    </div>
  {/each}
</div>

<style>
  .notification-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 12px;
    pointer-events: none;
  }

  .notification {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 300px;
    max-width: 500px;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    pointer-events: auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }

  .notification-content {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .notification-icon {
    font-size: 18px;
    font-weight: bold;
    flex-shrink: 0;
  }

  .notification-message {
    flex: 1;
  }

  .notification-close {
    background: none;
    border: none;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    margin-left: 12px;
    color: inherit;
    opacity: 0.7;
    transition: opacity 0.2s;
    flex-shrink: 0;
  }

  .notification-close:hover,
  .notification-close:focus {
    opacity: 1;
  }

  .notification-close:focus {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  /* Success notification - green theme */
  .notification-success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  .notification-success .notification-icon {
    color: #28a745;
  }

  /* Error notification - red theme */
  .notification-error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }

  .notification-error .notification-icon {
    color: #dc3545;
  }

  /* Info notification - blue theme */
  .notification-info {
    background-color: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
  }

  .notification-info .notification-icon {
    color: #17a2b8;
  }

  /* Responsive adjustments */
  @media (max-width: 600px) {
    .notification-container {
      top: 10px;
      right: 10px;
      left: 10px;
    }

    .notification {
      min-width: auto;
      max-width: 100%;
    }
  }
</style>
