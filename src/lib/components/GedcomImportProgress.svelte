<script>
  /**
   * GedcomImportProgress Component
   * Story #107: GEDCOM Import Progress and Confirmation
   *
   * Main import progress page with confirmation, progress tracking, and results
   */

  import { onMount, onDestroy } from 'svelte'
  import { api } from '../api.js'
  import ImportProgressBar from './ImportProgressBar.svelte'
  import ImportSummary from './ImportSummary.svelte'
  import ImportErrorDisplay from './ImportErrorDisplay.svelte'
  import * as notificationStore from '../../stores/notificationStore.js'

  export let uploadId = ''

  // State machine: pending -> importing -> completed | failed
  let importStatus = 'pending' // pending | importing | completed | failed
  let importSummary = null
  let importError = null
  let startTime = null

  // Preview statistics for confirmation
  let previewStats = {
    total: 0,
    duplicates: 0,
    willImport: 0
  }
  let loadingPreview = true

  // Load preview statistics
  onMount(async () => {
    try {
      const previewData = await api.getGedcomPreviewIndividuals(uploadId, {
        page: 1,
        limit: 1
      })

      // Map API field names to component field names
      const stats = previewData.statistics || {}
      previewStats = {
        total: stats.totalIndividuals || 0,
        duplicates: stats.duplicateIndividuals || 0,
        willImport: stats.newIndividuals || 0
      }

      loadingPreview = false
    } catch (error) {
      console.error('Failed to load preview:', error)
      // Set safe defaults on error
      previewStats = {
        total: 0,
        duplicates: 0,
        willImport: 0
      }
      loadingPreview = false
    }

    // Set up beforeunload warning
    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  onDestroy(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })

  // Warn before page unload during import
  function handleBeforeUnload(e) {
    if (importStatus === 'importing') {
      e.preventDefault()
      e.returnValue = 'Import in progress - are you sure you want to leave?'
      return e.returnValue
    }
  }

  // Start import
  async function startImport() {
    importStatus = 'importing'
    startTime = Date.now()
    importError = null

    try {
      const result = await api.importGedcom(uploadId, { importAll: true })

      if (result.success) {
        const duration = Date.now() - startTime

        importSummary = {
          personsAdded: result.imported.persons || 0,
          personsUpdated: result.imported.updated || 0,
          personsSkipped: 0, // Not currently tracked by backend
          relationshipsCreated: result.imported.relationships || 0,
          duration
        }

        importStatus = 'completed'
        notificationStore.success('GEDCOM import completed successfully!')
      } else {
        // Handle error response
        importError = result.error
        importStatus = 'failed'
        notificationStore.error('Import failed: ' + result.error.message)
      }
    } catch (error) {
      console.error('Import error:', error)

      // Extract error details from API error
      importError = error.data?.error || {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: error.stack || '',
        canRetry: true,
        errorLogUrl: null
      }

      importStatus = 'failed'
      notificationStore.error('Import failed: ' + importError.message)
    }
  }

  // Retry import after failure
  function handleRetry() {
    importError = null
    importStatus = 'pending'
  }

  // Navigate to family tree
  function handleViewTree() {
    window.location.hash = '/tree'
    // Reload data to show new imports
    window.location.reload()
  }

  // Cancel and go back
  function handleCancel() {
    window.location.hash = `/gedcom/preview/${uploadId}`
  }

  function handleClose() {
    window.location.hash = '/tree'
  }
</script>

<div class="import-progress-container">
  <h1>GEDCOM Import</h1>

  {#if importStatus === 'pending'}
    <!-- Confirmation Phase -->
    <section class="confirmation-section">
      <h2>Confirm Import</h2>

      {#if loadingPreview}
        <p>Loading preview...</p>
      {:else}
        <div class="summary-stats">
          <div class="stat-item">
            <div class="stat-value">{previewStats.total}</div>
            <div class="stat-label">Total Individuals</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{previewStats.duplicates}</div>
            <div class="stat-label">Duplicates Resolved</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{previewStats.willImport}</div>
            <div class="stat-label">Will Import</div>
          </div>
        </div>

        <div class="info-message">
          <strong>Ready to import:</strong> This will add {previewStats.willImport} individuals
          and their relationships to your family tree.
        </div>

        <div class="action-buttons">
          <button class="btn btn-primary" on:click={startImport}>
            Start Import
          </button>
          <button class="btn btn-secondary" on:click={handleCancel}>
            Cancel
          </button>
        </div>
      {/if}
    </section>
  {:else if importStatus === 'importing'}
    <!-- Importing Phase -->
    <section class="importing-section">
      <h2>Importing Data...</h2>

      <ImportProgressBar percentage={null} status="Importing individuals and relationships..." />

      <div class="importing-message">
        <p>Please wait while we import your GEDCOM data.</p>
        <p><strong>Do not close this window.</strong></p>
      </div>
    </section>
  {:else if importStatus === 'completed'}
    <!-- Success Phase -->
    <ImportSummary summary={importSummary} on:viewTree={handleViewTree} on:close={handleClose} />
  {:else if importStatus === 'failed'}
    <!-- Error Phase -->
    <ImportErrorDisplay error={importError} on:retry={handleRetry} on:cancel={handleCancel} />
  {/if}
</div>

<style>
  .import-progress-container {
    max-width: 900px;
    margin: 0 auto;
    padding: 32px 16px;
  }

  h1 {
    text-align: center;
    color: #333;
    margin-bottom: 32px;
    font-size: 32px;
  }

  h2 {
    text-align: center;
    color: #555;
    margin-bottom: 24px;
    font-size: 24px;
  }

  /* Confirmation Phase */
  .confirmation-section {
    background: white;
    padding: 32px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .stat-item {
    background: #f5f5f5;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
  }

  .stat-value {
    font-size: 36px;
    font-weight: 700;
    color: #2196f3;
    margin-bottom: 8px;
  }

  .stat-label {
    font-size: 14px;
    color: #666;
  }

  .info-message {
    background-color: #e3f2fd;
    border-left: 4px solid #2196f3;
    padding: 16px;
    border-radius: 4px;
    margin-bottom: 24px;
    color: #333;
  }

  /* Importing Phase */
  .importing-section {
    background: white;
    padding: 32px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .importing-message {
    text-align: center;
    margin-top: 24px;
    color: #666;
  }

  .importing-message p {
    margin: 8px 0;
  }

  .importing-message strong {
    color: #f57c00;
  }

  /* Action Buttons */
  .action-buttons {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 24px;
  }

  .btn {
    padding: 12px 32px;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-primary {
    background-color: #4caf50;
    color: white;
  }

  .btn-primary:hover {
    background-color: #45a049;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);
  }

  .btn-secondary {
    background-color: #e0e0e0;
    color: #333;
  }

  .btn-secondary:hover {
    background-color: #d0d0d0;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .import-progress-container {
      padding: 16px 8px;
    }

    .confirmation-section,
    .importing-section {
      padding: 20px;
    }

    .summary-stats {
      grid-template-columns: 1fr;
    }

    .action-buttons {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
</style>
