<script>
  /**
   * GedcomParsingResults Component
   * Story #103: GEDCOM Parsing Results Display
   *
   * Main component for displaying GEDCOM parsing results including:
   * - Parsing statistics
   * - Progress polling for large files
   * - Error display with CSV download
   * - Duplicate detection summary
   * - Navigation to preview or back to upload
   */

  import { onMount, onDestroy } from 'svelte'
  import { api } from './api.js'
  import ParseStatisticsCard from './components/ParseStatisticsCard.svelte'
  import ParseErrorList from './components/ParseErrorList.svelte'
  import DuplicateSummary from './components/DuplicateSummary.svelte'

  export let uploadId = ''
  export let autoStart = false

  // State
  let loading = true
  let error = null
  let parseResults = null
  let parseStatus = null
  let polling = false
  let pollInterval = null

  // Parse the GEDCOM file
  async function parseFile() {
    loading = true
    error = null

    try {
      const results = await api.parseGedcom(uploadId)
      parseResults = results
      loading = false
      polling = false
      stopPolling()
    } catch (err) {
      console.error('[GedcomParsingResults] Parsing failed:', err.message)
      error = err.message
      loading = false
      polling = false
      stopPolling()
    }
  }

  // Poll parse status
  async function pollStatus() {
    try {
      const status = await api.getParseStatus(uploadId)
      parseStatus = status

      if (status.status === 'complete') {
        // Parse is complete, fetch results
        await parseFile()
      }
    } catch (err) {
      error = err.message
      polling = false
      stopPolling()
    }
  }

  // Start polling for status updates
  function startPolling() {
    polling = true
    pollInterval = setInterval(pollStatus, 2000) // Poll every 2 seconds
    pollStatus() // Initial status check
  }

  // Stop polling
  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  // Navigate to preview page
  function navigateToPreview() {
    window.location.hash = `#/gedcom/preview/${uploadId}`
  }

  // Navigate back to upload
  function navigateToUpload() {
    window.location.hash = '#/gedcom/import'
  }

  // Format date range
  function formatDateRange(earliest, latest) {
    if (!earliest && !latest) return 'Unknown'
    if (!earliest) return `? - ${latest}`
    if (!latest) return `${earliest} - ?`
    return `${earliest} - ${latest}`
  }

  onMount(() => {
    if (autoStart) {
      startPolling()
    } else {
      parseFile()
    }
  })

  onDestroy(() => {
    stopPolling()
  })
</script>

<main class="parsing-results">
  <h2>Parsing Results</h2>

  {#if loading && !polling}
    <div class="loading">
      <div class="spinner"></div>
      <p>Parsing GEDCOM file...</p>
    </div>
  {:else if polling}
    <div class="progress-section">
      <div class="progress-header">
        <h3>Parsing in Progress</h3>
        <p>Processing your GEDCOM file. This may take a few moments...</p>
      </div>
      {#if parseStatus}
        <div class="progress-bar-container" role="progressbar" aria-valuenow={parseStatus.progress || 0} aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar" style="width: {parseStatus.progress || 0}%"></div>
        </div>
        <div class="progress-text">{parseStatus.progress || 0}% complete</div>
      {/if}
    </div>
  {:else if error}
    <div class="error-section">
      <h3>Parsing Error</h3>
      <div class="error-message">
        {error}
      </div>
      <button class="button button-secondary" on:click={navigateToUpload}>
        Start Over
      </button>
    </div>
  {:else if parseResults}
    <!-- Statistics Section -->
    <section aria-label="Parsing statistics" class="statistics-section">
      <h3>File Statistics</h3>
      <div class="statistics-grid">
        <ParseStatisticsCard
          icon="👥"
          label="Individuals"
          value={parseResults.statistics.individualsCount}
        />
        <ParseStatisticsCard
          icon="👨‍👩‍👧‍👦"
          label="Families"
          value={parseResults.statistics.familiesCount}
        />
        <ParseStatisticsCard
          icon="📅"
          label="Date Range"
          value={formatDateRange(parseResults.statistics.earliestDate, parseResults.statistics.latestDate)}
        />
        <ParseStatisticsCard
          icon="📋"
          label="GEDCOM Version"
          value={parseResults.version}
        />
      </div>
    </section>

    <!-- Errors Section -->
    <section class="errors-section">
      <h3>Validation Results</h3>
      <ParseErrorList errors={parseResults.errors || []} />

      {#if parseResults.errors && parseResults.errors.length > 0}
        <div class="csv-download">
          <a
            href="/api/gedcom/import/{uploadId}/errors.csv"
            download="parsing-errors.csv"
            class="download-link"
          >
            Download Error Log (CSV)
          </a>
        </div>
      {/if}
    </section>

    <!-- Relationship Issues Section -->
    {#if parseResults.relationshipIssues && parseResults.relationshipIssues.length > 0}
      <section class="relationship-warnings">
        <h3>Relationship Warnings</h3>
        <div class="warning-list">
          {#each parseResults.relationshipIssues as issue}
            <div class="warning-item">
              <span class="warning-icon">⚠️</span>
              <div class="warning-content">
                <div class="warning-id">{issue.individualId}</div>
                <div class="warning-message">{issue.issue}</div>
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Duplicates Section -->
    <section class="duplicates-section">
      <DuplicateSummary duplicates={parseResults.duplicates?.potentialDuplicates || []} />
    </section>

    <!-- Navigation Buttons -->
    <div class="button-group">
      <button class="button button-secondary" on:click={navigateToUpload}>
        Start Over
      </button>
      <button class="button button-primary" on:click={navigateToPreview}>
        Continue to Preview
      </button>
    </div>
  {/if}
</main>

<style>
  .parsing-results {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  h2 {
    margin: 0 0 24px 0;
    font-size: 28px;
    font-weight: 600;
    color: #333;
  }

  h3 {
    margin: 0 0 16px 0;
    font-size: 20px;
    font-weight: 600;
    color: #333;
  }

  /* Loading State */
  .loading {
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

  .loading p {
    font-size: 16px;
    color: #666;
  }

  /* Progress Section */
  .progress-section {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 24px;
  }

  .progress-header h3 {
    margin-bottom: 8px;
  }

  .progress-header p {
    margin: 0 0 20px 0;
    color: #666;
  }

  .progress-bar-container {
    width: 100%;
    height: 24px;
    background: #f3f4f6;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #2563eb);
    transition: width 0.3s ease;
    border-radius: 12px;
  }

  .progress-text {
    text-align: center;
    font-size: 14px;
    font-weight: 500;
    color: #666;
  }

  /* Error Section */
  .error-section {
    background: white;
    border: 1px solid #fca5a5;
    border-radius: 8px;
    padding: 24px;
  }

  .error-section h3 {
    color: #dc2626;
    margin-bottom: 16px;
  }

  .error-message {
    padding: 16px;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-radius: 6px;
    color: #991b1b;
    margin-bottom: 20px;
  }

  /* Statistics Section */
  .statistics-section {
    margin-bottom: 32px;
  }

  .statistics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
  }

  /* Errors Section */
  .errors-section {
    margin-bottom: 32px;
  }

  .csv-download {
    margin-top: 16px;
    padding: 16px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
  }

  .download-link {
    color: #2563eb;
    text-decoration: none;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .download-link:hover {
    text-decoration: underline;
  }

  .download-link::before {
    content: '📥';
  }

  /* Relationship Warnings */
  .relationship-warnings {
    margin-bottom: 32px;
  }

  .warning-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .warning-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: #fffbeb;
    border: 1px solid #fbbf24;
    border-radius: 6px;
  }

  .warning-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .warning-content {
    flex: 1;
  }

  .warning-id {
    font-size: 13px;
    font-family: monospace;
    color: #92400e;
    margin-bottom: 4px;
  }

  .warning-message {
    font-size: 14px;
    color: #78350f;
  }

  /* Duplicates Section */
  .duplicates-section {
    margin-bottom: 32px;
  }

  /* Button Group */
  .button-group {
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

  .button-primary:hover {
    background: #1d4ed8;
  }

  .button-primary:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .button-secondary {
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .button-secondary:hover {
    background: #f9fafb;
  }

  .button-secondary:focus {
    outline: 2px solid #9ca3af;
    outline-offset: 2px;
  }

  @media (max-width: 767px) {
    .parsing-results {
      padding: 16px;
    }

    h2 {
      font-size: 24px;
      margin-bottom: 20px;
    }

    h3 {
      font-size: 18px;
    }

    .statistics-grid {
      grid-template-columns: 1fr;
    }

    .button-group {
      flex-direction: column-reverse;
    }

    .button {
      width: 100%;
    }
  }
</style>
