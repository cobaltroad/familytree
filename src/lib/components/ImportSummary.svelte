<script>
  /**
   * ImportSummary Component
   * Story #107: GEDCOM Import Progress and Confirmation
   *
   * Post-import success summary with statistics and action buttons
   */

  import { createEventDispatcher } from 'svelte'

  export let summary = {
    personsAdded: 0,
    personsUpdated: 0,
    personsSkipped: 0,
    relationshipsCreated: 0,
    duration: 0
  }

  const dispatch = createEventDispatcher()

  // Format duration from milliseconds
  function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) {
      return `${seconds} second${seconds === 1 ? '' : 's'}`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (remainingSeconds === 0) {
      return `${minutes} minute${minutes === 1 ? '' : 's'}`
    }
    return `${minutes} minute${minutes === 1 ? '' : 's'} ${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'}`
  }

  function handleViewTree() {
    dispatch('viewTree')
  }

  function handleClose() {
    dispatch('close')
  }
</script>

<section class="import-summary" role="status">
  <!-- Success header -->
  <div class="success-header">
    <div class="success-icon checkmark" aria-label="Success">✓</div>
    <h2>Import completed successfully!</h2>
  </div>

  <!-- Statistics cards -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">{summary.personsAdded}</div>
      <div class="stat-label">Individuals Added</div>
    </div>

    <div class="stat-card">
      <div class="stat-value">{summary.personsUpdated}</div>
      <div class="stat-label">Individuals Merged</div>
    </div>

    <div class="stat-card">
      <div class="stat-value">{summary.personsSkipped}</div>
      <div class="stat-label">Individuals Skipped</div>
    </div>

    <div class="stat-card">
      <div class="stat-value">{summary.relationshipsCreated}</div>
      <div class="stat-label">Relationships Created</div>
    </div>
  </div>

  <!-- Import duration -->
  <div class="import-duration">
    Import completed in {formatDuration(summary.duration)}
  </div>

  <!-- Action buttons -->
  <div class="action-buttons">
    <button class="btn btn-primary" on:click={handleViewTree}>
      View Family Tree
    </button>
    <button class="btn btn-secondary" on:click={handleClose}>
      Close
    </button>
  </div>
</section>

<style>
  .import-summary {
    max-width: 800px;
    margin: 0 auto;
    padding: 32px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .success-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 32px;
  }

  .success-icon {
    width: 64px;
    height: 64px;
    background-color: #4caf50;
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
    color: #2e7d32;
    font-size: 24px;
    font-weight: 600;
    margin: 0;
    text-align: center;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .stat-card {
    background: #f5f5f5;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
    border: 2px solid transparent;
    transition: all 0.2s ease;
  }

  .stat-card:hover {
    border-color: #4caf50;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
  }

  .stat-value {
    font-size: 32px;
    font-weight: 700;
    color: #2e7d32;
    margin-bottom: 8px;
  }

  .stat-label {
    font-size: 14px;
    color: #666;
    font-weight: 500;
  }

  .import-duration {
    text-align: center;
    color: #666;
    font-size: 14px;
    margin-bottom: 32px;
    padding: 12px;
    background: #e8f5e9;
    border-radius: 4px;
  }

  .action-buttons {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  .btn {
    padding: 12px 24px;
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

  /* Responsive design */
  @media (max-width: 768px) {
    .import-summary {
      padding: 20px;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .action-buttons {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
</style>
