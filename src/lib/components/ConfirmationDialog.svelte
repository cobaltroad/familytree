<script>
  import { createEventDispatcher, onMount } from 'svelte'

  export let isOpen = false
  export let title = 'Confirm Action'
  export let message = 'Are you sure you want to proceed?'
  export let confirmText = 'Confirm'
  export let cancelText = 'Cancel'
  export let isDangerous = false
  export let preventEscapeClose = false

  const dispatch = createEventDispatcher()

  let dialogElement
  let confirmButton
  let cancelButton

  // Focus management
  $: if (isOpen && confirmButton) {
    // Focus the confirm button when dialog opens
    setTimeout(() => confirmButton.focus(), 0)
  }

  function handleConfirm() {
    dispatch('confirm')
  }

  function handleCancel() {
    dispatch('cancel')
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      handleCancel()
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape' && !preventEscapeClose) {
      event.preventDefault()
      handleCancel()
    } else if (event.key === 'Tab') {
      // Focus trap - cycle between confirm and cancel buttons
      handleTabKey(event)
    }
  }

  function handleTabKey(event) {
    const focusableElements = [confirmButton, cancelButton].filter(el => el)

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (event.shiftKey) {
      // Shift+Tab (reverse)
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      // Tab (forward)
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }

  onMount(() => {
    // Prevent body scroll when dialog is open
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.body.style.overflow = ''
    }
  })

  // Update body scroll when isOpen changes
  $: {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = isOpen ? 'hidden' : ''
    }
  }
</script>

<svelte:window on:keydown={isOpen ? handleKeyDown : null} />

{#if isOpen}
  <div class="dialog-backdrop" on:click={handleBackdropClick} on:keydown role="presentation">
    <div
      class="dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-message"
      bind:this={dialogElement}
    >
      <div class="dialog-header">
        <h2 id="dialog-title" class="dialog-title">{title}</h2>
      </div>

      <div class="dialog-body">
        <p id="dialog-message" class="dialog-message">{message}</p>
      </div>

      <div class="dialog-footer">
        <button
          type="button"
          class="dialog-button cancel-button"
          on:click={handleCancel}
          bind:this={cancelButton}
        >
          {cancelText}
        </button>
        <button
          type="button"
          class="dialog-button confirm-button"
          class:dangerous={isDangerous}
          on:click={handleConfirm}
          bind:this={confirmButton}
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 1rem;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .dialog {
    background: white;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    max-width: 500px;
    width: 100%;
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .dialog-header {
    padding: 1.5rem 1.5rem 1rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .dialog-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #333;
  }

  .dialog-body {
    padding: 1.5rem;
  }

  .dialog-message {
    margin: 0;
    font-size: 1rem;
    line-height: 1.5;
    color: #666;
  }

  .dialog-footer {
    padding: 1rem 1.5rem 1.5rem;
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    border-top: 1px solid #e0e0e0;
  }

  .dialog-button {
    padding: 0.625rem 1.25rem;
    border: none;
    border-radius: 4px;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 80px;
  }

  .cancel-button {
    background-color: #f5f5f5;
    color: #666;
  }

  .cancel-button:hover {
    background-color: #e0e0e0;
    color: #333;
  }

  .cancel-button:focus {
    outline: 2px solid #999;
    outline-offset: 2px;
  }

  .confirm-button {
    background-color: #4CAF50;
    color: white;
  }

  .confirm-button:hover {
    background-color: #45a049;
  }

  .confirm-button:focus {
    outline: 2px solid #4CAF50;
    outline-offset: 2px;
  }

  .confirm-button.dangerous {
    background-color: #f44336;
  }

  .confirm-button.dangerous:hover {
    background-color: #d32f2f;
  }

  .confirm-button.dangerous:focus {
    outline: 2px solid #f44336;
    outline-offset: 2px;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .dialog {
      margin: 1rem;
    }

    .dialog-header,
    .dialog-body,
    .dialog-footer {
      padding: 1rem;
    }

    .dialog-title {
      font-size: 1.125rem;
    }

    .dialog-message {
      font-size: 0.9375rem;
    }

    .dialog-footer {
      flex-direction: column-reverse;
    }

    .dialog-button {
      width: 100%;
      min-width: unset;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .dialog-backdrop,
    .dialog {
      animation: none;
    }

    .dialog-button {
      transition: none;
    }
  }
</style>
