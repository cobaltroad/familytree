<script>
  /**
   * GedcomDuplicateResolution Component
   * Story #106: GEDCOM Duplicate Resolution UI
   *
   * Main component for duplicate resolution interface
   */

  import { onMount } from 'svelte'
  import { api } from '../api.js'
  import ConfidenceScoreDisplay from './ConfidenceScoreDisplay.svelte'
  import DuplicateComparisonCard from './DuplicateComparisonCard.svelte'
  import DuplicateResolutionChoice from './DuplicateResolutionChoice.svelte'
  import ResolutionConfirmModal from './ResolutionConfirmModal.svelte'

  export let uploadId = ''

  // State
  let loading = true
  let error = null
  let duplicates = []
  let currentIndex = 0
  let resolutions = {} // Map of gedcomId -> resolution choice
  let showConfirmModal = false
  let saving = false

  // Computed values
  $: currentDuplicate = duplicates[currentIndex]
  $: resolvedCount = Object.keys(resolutions).length
  $: allResolved = resolvedCount === duplicates.length && duplicates.length > 0
  $: canGoNext = currentIndex < duplicates.length - 1
  $: canGoPrevious = currentIndex > 0
  $: currentResolution = currentDuplicate ? resolutions[currentDuplicate.gedcomPerson.gedcomId] : null

  // Convert resolutions object to array for the confirmation modal
  $: resolutionsArray = Object.entries(resolutions).map(([gedcomId, resolution]) => ({
    gedcomId,
    resolution
  }))

  // Fetch duplicates data
  async function fetchDuplicates() {
    loading = true
    error = null

    try {
      const data = await api.getGedcomPreviewDuplicates(uploadId)
      duplicates = data.duplicates || []

      // Initialize resolutions map
      resolutions = {}

      loading = false
    } catch (err) {
      error = err.message
      loading = false
    }
  }

  // Handle resolution change
  function handleResolutionChange(event) {
    if (!currentDuplicate) return

    const gedcomId = currentDuplicate.gedcomPerson.gedcomId
    resolutions = {
      ...resolutions,
      [gedcomId]: event.detail
    }
  }

  // Navigation handlers
  function goToNext() {
    if (canGoNext) {
      currentIndex++
    }
  }

  function goToPrevious() {
    if (canGoPrevious) {
      currentIndex--
    }
  }

  // Skip all duplicates
  function skipAll() {
    const allResolutions = {}
    for (const duplicate of duplicates) {
      allResolutions[duplicate.gedcomPerson.gedcomId] = 'skip'
    }
    resolutions = allResolutions
  }

  // Show confirmation modal
  function showConfirmation() {
    showConfirmModal = true
  }

  // Save resolutions
  async function saveResolutions() {
    saving = true

    try {
      const resolutionArray = Object.entries(resolutions).map(([gedcomId, resolution]) => ({
        gedcomId,
        resolution
      }))

      await api.saveGedcomDuplicateResolutions(uploadId, resolutionArray)

      // Navigate to next step (import confirmation)
      window.location.hash = `#/gedcom/import/${uploadId}/confirm`
    } catch (err) {
      error = err.message
      saving = false
      showConfirmModal = false
    }
  }

  onMount(() => {
    fetchDuplicates()
  })
</script>

<div class="duplicate-resolution">
  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading duplicates...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <h3>Error</h3>
      <p class="error-message">{error}</p>
      <button class="button button-secondary" on:click={fetchDuplicates}>
        Retry
      </button>
    </div>
  {:else if duplicates.length === 0}
    <div class="empty-state">
      <h3>No Duplicates Found</h3>
      <p>Great! There are no potential duplicates to review.</p>
      <button class="button button-primary" on:click={() => window.location.hash = `#/gedcom/import/${uploadId}/confirm`}>
        Continue to Import
      </button>
    </div>
  {:else}
    <!-- Progress Header -->
    <div class="progress-header">
      <h3>Resolve Duplicates</h3>
      <div class="progress-info">
        <span class="progress-count">{resolvedCount} of {duplicates.length} resolved</span>
        <div class="progress-bar">
          <div class="progress-fill" style="width: {(resolvedCount / duplicates.length) * 100}%"></div>
        </div>
      </div>
    </div>

    <!-- Current Duplicate -->
    {#if currentDuplicate}
      <div class="duplicate-content">
        <!-- Navigation -->
        <div class="duplicate-nav">
          <button
            class="nav-button"
            disabled={!canGoPrevious}
            on:click={goToPrevious}
          >
            Previous
          </button>
          <span class="duplicate-counter">
            Duplicate {currentIndex + 1} of {duplicates.length}
          </span>
          <button
            class="nav-button"
            disabled={!canGoNext}
            on:click={goToNext}
          >
            Next
          </button>
        </div>

        <!-- Confidence Score -->
        <div class="confidence-section">
          <ConfidenceScoreDisplay
            confidence={currentDuplicate.confidence}
            matchDetails={currentDuplicate.matchingFields}
          />
        </div>

        <!-- Comparison Cards -->
        <div class="comparison-section">
          <DuplicateComparisonCard
            person={currentDuplicate.gedcomPerson}
            title="GEDCOM Data (New)"
            matchingFields={currentDuplicate.matchingFields}
          />
          <DuplicateComparisonCard
            person={currentDuplicate.existingPerson}
            title="Existing Person"
            matchingFields={currentDuplicate.matchingFields}
          />
        </div>

        <!-- Resolution Choice -->
        <DuplicateResolutionChoice
          selectedResolution={currentResolution}
          gedcomPerson={currentDuplicate.gedcomPerson}
          existingPerson={currentDuplicate.existingPerson}
          on:change={handleResolutionChange}
        />
      </div>
    {/if}

    <!-- Action Buttons -->
    <div class="action-buttons">
      <button class="button button-secondary" on:click={skipAll}>
        Skip All Duplicates
      </button>
      <button
        class="button button-primary"
        disabled={!allResolved || saving}
        on:click={showConfirmation}
      >
        {#if saving}
          Saving...
        {:else}
          Confirm All Resolutions
        {/if}
      </button>
    </div>
  {/if}

  <!-- Confirmation Modal -->
  <ResolutionConfirmModal
    resolutions={resolutionsArray}
    show={showConfirmModal}
    on:confirm={saveResolutions}
    on:cancel={() => showConfirmModal = false}
  />
</div>

<style>
  .duplicate-resolution {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  /* Loading State */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    gap: 16px;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #f3f4f6;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-state p {
    font-size: 16px;
    color: #666;
  }

  /* Error State */
  .error-state {
    background: white;
    border: 1px solid #fca5a5;
    border-radius: 8px;
    padding: 24px;
    text-align: center;
  }

  .error-state h3 {
    color: #dc2626;
    margin: 0 0 16px 0;
    font-size: 20px;
  }

  .error-message {
    padding: 16px;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-radius: 6px;
    color: #991b1b;
    margin-bottom: 20px;
  }

  /* Empty State */
  .empty-state {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 60px 24px;
    text-align: center;
  }

  .empty-state h3 {
    margin: 0 0 12px 0;
    font-size: 20px;
    color: #111827;
  }

  .empty-state p {
    margin: 0 0 24px 0;
    font-size: 16px;
    color: #6b7280;
  }

  /* Progress Header */
  .progress-header {
    margin-bottom: 32px;
  }

  .progress-header h3 {
    margin: 0 0 16px 0;
    font-size: 24px;
    font-weight: 600;
    color: #111827;
  }

  .progress-info {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .progress-count {
    font-size: 14px;
    font-weight: 500;
    color: #6b7280;
    min-width: 120px;
  }

  .progress-bar {
    flex: 1;
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #10b981;
    transition: width 0.3s ease;
  }

  /* Duplicate Content */
  .duplicate-content {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 24px;
  }

  /* Navigation */
  .duplicate-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    padding-bottom: 24px;
    border-bottom: 1px solid #e5e7eb;
  }

  .nav-button {
    padding: 8px 16px;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .nav-button:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .nav-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .duplicate-counter {
    font-size: 15px;
    font-weight: 600;
    color: #111827;
  }

  /* Confidence Section */
  .confidence-section {
    display: flex;
    justify-content: center;
    margin-bottom: 32px;
  }

  /* Comparison Section */
  .comparison-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-bottom: 24px;
  }

  /* Action Buttons */
  .action-buttons {
    display: flex;
    gap: 12px;
    justify-content: space-between;
    padding-top: 24px;
    border-top: 1px solid #e5e7eb;
  }

  .button {
    padding: 12px 24px;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .button-primary {
    background: #2563eb;
    color: white;
  }

  .button-primary:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .button-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
    .duplicate-resolution {
      padding: 16px;
    }

    .progress-header h3 {
      font-size: 20px;
    }

    .progress-info {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }

    .progress-count {
      min-width: auto;
    }

    .duplicate-content {
      padding: 16px;
    }

    .duplicate-nav {
      flex-wrap: wrap;
      gap: 12px;
    }

    .duplicate-counter {
      order: -1;
      width: 100%;
      text-align: center;
    }

    .comparison-section {
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .action-buttons {
      flex-direction: column-reverse;
    }

    .button {
      width: 100%;
    }
  }
</style>
