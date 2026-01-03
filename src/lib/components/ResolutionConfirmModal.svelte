<script>
  /**
   * ResolutionConfirmModal Component
   * Story #106: GEDCOM Duplicate Resolution UI
   *
   * Confirmation modal showing summary of all resolution decisions
   */

  import { createEventDispatcher } from 'svelte'

  export let resolutions = []
  export let show = false

  const dispatch = createEventDispatcher()

  // Calculate summary counts
  $: mergeCount = resolutions.filter(r => r.resolution === 'merge').length
  $: importCount = resolutions.filter(r => r.resolution === 'import_as_new').length
  $: skipCount = resolutions.filter(r => r.resolution === 'skip').length

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
</script>

{#if show}
  <div class="modal-backdrop" on:click={handleBackdropClick} on:keydown={(e) => e.key === 'Escape' && handleCancel()}>
    <div class="modal-dialog" role="dialog" aria-labelledby="modal-title" aria-modal="true">
      <div class="modal-header">
        <h2 id="modal-title">Confirm Resolution Decisions</h2>
        <button class="close-button" on:click={handleCancel} aria-label="Close modal">
          &times;
        </button>
      </div>

      <div class="modal-body">
        <p class="summary-intro">
          You are about to process {resolutions.length} duplicate{resolutions.length !== 1 ? 's' : ''}:
        </p>

        <div class="summary-stats">
          {#if mergeCount > 0}
            <div class="stat-item merge">
              <span class="stat-number">{mergeCount}</span>
              <span class="stat-label">Merge{mergeCount !== 1 ? 's' : ''}</span>
            </div>
          {/if}

          {#if importCount > 0}
            <div class="stat-item import">
              <span class="stat-number">{importCount}</span>
              <span class="stat-label">Import as New</span>
            </div>
          {/if}

          {#if skipCount > 0}
            <div class="stat-item skip">
              <span class="stat-number">{skipCount}</span>
              <span class="stat-label">Skip{skipCount !== 1 ? 'ped' : ''}</span>
            </div>
          {/if}
        </div>

        {#if mergeCount > 0}
          <div class="warning-box">
            <strong>Warning:</strong> Merge operations will permanently update existing person records.
            This action cannot be undone.
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="button button-secondary" on:click={handleCancel}>
          Go Back
        </button>
        <button class="button button-primary" on:click={handleConfirm}>
          Confirm and Continue
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
  }

  .modal-dialog {
    background: white;
    border-radius: 12px;
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
  }

  .modal-header {
    padding: 24px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #111827;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 32px;
    color: #9ca3af;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .close-button:hover {
    background: #f3f4f6;
    color: #374151;
  }

  .modal-body {
    padding: 24px;
    overflow-y: auto;
  }

  .summary-intro {
    margin: 0 0 20px 0;
    font-size: 15px;
    color: #374151;
  }

  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
  }

  .stat-item {
    padding: 16px;
    border-radius: 8px;
    text-align: center;
  }

  .stat-item.merge {
    background: #d1fae5;
    border: 2px solid #10b981;
  }

  .stat-item.import {
    background: #dbeafe;
    border: 2px solid #3b82f6;
  }

  .stat-item.skip {
    background: #f3f4f6;
    border: 2px solid #9ca3af;
  }

  .stat-number {
    display: block;
    font-size: 32px;
    font-weight: 700;
    color: #111827;
    line-height: 1;
  }

  .stat-label {
    display: block;
    margin-top: 8px;
    font-size: 13px;
    font-weight: 500;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .warning-box {
    padding: 16px;
    background: #fef2f2;
    border: 2px solid #fca5a5;
    border-radius: 8px;
    color: #991b1b;
    font-size: 14px;
  }

  .warning-box strong {
    font-weight: 600;
  }

  .modal-footer {
    padding: 20px 24px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    background: #f9fafb;
  }

  .button {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .button-primary {
    background: #2563eb;
    color: white;
  }

  .button-primary:hover {
    background: #1d4ed8;
  }

  .button-secondary {
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .button-secondary:hover {
    background: #f9fafb;
  }

  /* Mobile responsive */
  @media (max-width: 767px) {
    .modal-dialog {
      max-width: 100%;
      max-height: 100vh;
      border-radius: 0;
    }

    .modal-footer {
      flex-direction: column-reverse;
    }

    .button {
      width: 100%;
    }

    .summary-stats {
      grid-template-columns: 1fr;
    }
  }
</style>
