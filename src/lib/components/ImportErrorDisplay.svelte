<script>
  /**
   * ImportErrorDisplay Component
   * Story #107: GEDCOM Import Progress and Confirmation
   *
   * Error display with retry button and error log download
   */

  import { createEventDispatcher } from 'svelte'

  export let error = {
    code: 'UNKNOWN_ERROR',
    message: '',
    details: '',
    canRetry: false,
    errorLogUrl: null
  }

  const dispatch = createEventDispatcher()

  function handleRetry() {
    dispatch('retry')
  }

  function handleCancel() {
    dispatch('cancel')
  }
</script>

<section class="error-container" role="alert">
  <!-- Error header -->
  <div class="error-header">
    <div class="error-icon" aria-label="Error">✕</div>
    <h2>Import Failed</h2>
  </div>

  <!-- Error code badge -->
  <div class="error-code-badge">
    {error.code}
  </div>

  <!-- Error message -->
  <div class="error-message">
    {error.message}
  </div>

  <!-- Error details (expandable) -->
  {#if error.details}
    <details class="error-details">
      <summary>Technical Details</summary>
      <pre>{error.details}</pre>
    </details>
  {/if}

  <!-- Rollback notification -->
  <div class="rollback-notice">
    <strong>Transaction Rolled Back:</strong> No changes were saved to your family tree.
    Your existing data remains unchanged.
  </div>

  <!-- Action buttons -->
  <div class="action-buttons">
    {#if error.canRetry}
      <button class="btn btn-retry" on:click={handleRetry}>
        Retry Import
      </button>
    {/if}

    {#if error.errorLogUrl}
      <a
        href={error.errorLogUrl}
        download="import-errors.csv"
        class="btn btn-download"
      >
        Download Error Log
      </a>
    {/if}

    <button class="btn btn-cancel" on:click={handleCancel}>
      Cancel
    </button>
  </div>
</section>

<style>
  .error-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 32px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 2px solid #f44336;
  }

  .error-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 24px;
  }

  .error-icon {
    width: 64px;
    height: 64px;
    background-color: #f44336;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    font-weight: bold;
    margin-bottom: 16px;
  }

  h2 {
    color: #d32f2f;
    font-size: 24px;
    font-weight: 600;
    margin: 0;
    text-align: center;
  }

  .error-code-badge {
    display: inline-block;
    padding: 6px 12px;
    background-color: #ffebee;
    color: #c62828;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.5px;
    margin-bottom: 16px;
    text-align: center;
  }

  .error-message {
    background-color: #ffebee;
    padding: 16px;
    border-left: 4px solid #f44336;
    border-radius: 4px;
    color: #333;
    font-size: 16px;
    line-height: 1.5;
    margin-bottom: 16px;
  }

  .error-details {
    background-color: #f5f5f5;
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 16px;
  }

  .error-details summary {
    cursor: pointer;
    font-weight: 600;
    color: #666;
    user-select: none;
  }

  .error-details pre {
    margin-top: 12px;
    padding: 12px;
    background-color: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-size: 12px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .rollback-notice {
    background-color: #fff3cd;
    border-left: 4px solid #ffc107;
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 24px;
    font-size: 14px;
    color: #333;
  }

  .rollback-notice strong {
    color: #f57f17;
  }

  .action-buttons {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
    display: inline-block;
  }

  .btn-retry {
    background-color: #ff9800;
    color: white;
  }

  .btn-retry:hover {
    background-color: #f57c00;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(255, 152, 0, 0.3);
  }

  .btn-download {
    background-color: #2196f3;
    color: white;
  }

  .btn-download:hover {
    background-color: #1976d2;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(33, 150, 243, 0.3);
  }

  .btn-cancel {
    background-color: #e0e0e0;
    color: #333;
  }

  .btn-cancel:hover {
    background-color: #d0d0d0;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .error-container {
      padding: 20px;
    }

    .action-buttons {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
</style>
