<script>
  /**
   * ConfidenceScoreDisplay Component
   * Story #106: GEDCOM Duplicate Resolution UI
   *
   * Displays confidence score with tooltip showing matching criteria breakdown
   */

  export let confidence = 0
  export let matchDetails = {}

  // Determine confidence level for styling
  $: confidenceLevel = confidence >= 90 ? 'high' : confidence >= 70 ? 'medium' : 'low'

  // Round confidence score
  $: displayScore = Math.round(confidence)

  // Format match detail keys for display
  function formatLabel(key) {
    const labelMap = {
      name: 'Name',
      birthDate: 'Birth Date',
      birthPlace: 'Birth Place',
      deathDate: 'Death Date',
      deathPlace: 'Death Place',
      parents: 'Parents',
      gender: 'Gender'
    }
    return labelMap[key] || key.charAt(0).toUpperCase() + key.slice(1)
  }
</script>

<div class="confidence-score-container">
  <div class="confidence-score {confidenceLevel}">
    {displayScore}%
  </div>
  <div class="confidence-tooltip">
    <h4>Match Breakdown:</h4>
    {#if Object.keys(matchDetails).length > 0}
      <ul class="match-details-list">
        {#each Object.entries(matchDetails) as [key, value]}
          <li>
            <span class="match-label">{formatLabel(key)}:</span>
            <span class="match-value">{Math.round(value)}%</span>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="no-details">No detailed breakdown available</p>
    {/if}
  </div>
</div>

<style>
  .confidence-score-container {
    position: relative;
    display: inline-block;
  }

  .confidence-score {
    font-size: 24px;
    font-weight: 700;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: help;
    transition: all 0.2s ease;
    min-width: 80px;
    text-align: center;
  }

  .confidence-score.high {
    background: #d1fae5;
    color: #065f46;
    border: 2px solid #10b981;
  }

  .confidence-score.medium {
    background: #fef3c7;
    color: #92400e;
    border: 2px solid #f59e0b;
  }

  .confidence-score.low {
    background: #fee2e2;
    color: #991b1b;
    border: 2px solid #ef4444;
  }

  .confidence-score:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .confidence-tooltip {
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
    min-width: 250px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease, visibility 0.2s ease;
  }

  .confidence-score-container:hover .confidence-tooltip,
  .confidence-score:focus + .confidence-tooltip {
    opacity: 1;
    visibility: visible;
  }

  .confidence-tooltip h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
  }

  .match-details-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .match-details-list li {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .match-details-list li:last-child {
    border-bottom: none;
  }

  .match-label {
    font-size: 13px;
    color: #6b7280;
  }

  .match-value {
    font-size: 13px;
    font-weight: 600;
    color: #111827;
  }

  .no-details {
    margin: 0;
    font-size: 13px;
    color: #9ca3af;
    font-style: italic;
  }

  /* Mobile responsive */
  @media (max-width: 767px) {
    .confidence-tooltip {
      left: 0;
      right: 0;
      transform: none;
      min-width: auto;
    }
  }
</style>
