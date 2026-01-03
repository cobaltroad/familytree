<script>
  /**
   * ImportProgressBar Component
   * Story #107: GEDCOM Import Progress and Confirmation
   *
   * Visual progress bar with percentage display and status text
   */

  export let percentage = 0
  export let status = ''
  export let estimatedTimeRemaining = ''

  // Clamp percentage to 0-100 range
  $: clampedPercentage = Math.max(0, Math.min(100, percentage || 0))
  $: isComplete = clampedPercentage === 100
  $: isIndeterminate = percentage === null
</script>

<div class="progress-container">
  <!-- Progress bar -->
  <div
    class="progress-bar"
    class:indeterminate={isIndeterminate}
    role="progressbar"
    aria-label="Import progress: {clampedPercentage}%"
    aria-valuenow={clampedPercentage}
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div
      class="progress-fill"
      class:complete={isComplete}
      style="width: {clampedPercentage}%"
    />
  </div>

  <!-- Percentage and status text -->
  <div class="progress-info">
    <div class="percentage-text">
      {clampedPercentage}%
    </div>
    {#if status}
      <div class="status-text">
        {status}
      </div>
    {/if}
    {#if estimatedTimeRemaining}
      <div class="time-remaining">
        {estimatedTimeRemaining}
      </div>
    {/if}
  </div>
</div>

<style>
  .progress-container {
    width: 100%;
  }

  .progress-bar {
    width: 100%;
    height: 24px;
    background-color: #e0e0e0;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
  }

  .progress-bar.indeterminate .progress-fill {
    width: 100% !important;
    animation: indeterminate 1.5s infinite ease-in-out;
    background: linear-gradient(
      90deg,
      #4caf50 0%,
      #81c784 50%,
      #4caf50 100%
    );
    background-size: 200% 100%;
  }

  @keyframes indeterminate {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  .progress-fill {
    height: 100%;
    background-color: #4caf50;
    transition: width 0.3s ease, background-color 0.3s ease;
    border-radius: 12px;
  }

  .progress-fill.complete {
    background-color: #2e7d32;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
    font-size: 14px;
  }

  .percentage-text {
    font-weight: 600;
    color: #333;
  }

  .status-text {
    color: #666;
    flex-grow: 1;
    text-align: center;
  }

  .time-remaining {
    color: #666;
    font-size: 13px;
  }
</style>
