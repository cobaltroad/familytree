<script>
  /**
   * DuplicateSummary Component
   * Story #103: GEDCOM Parsing Results Display
   *
   * Displays a summary of potential duplicate people found during parsing
   * Shows top 3 duplicates with confidence percentages
   */

  export let duplicates = []

  // Show top 3 duplicates
  $: topDuplicates = duplicates.slice(0, 3)
  $: totalCount = duplicates.length
  $: showViewAll = duplicates.length > 3

  // Get confidence class for styling
  function getConfidenceClass(confidence) {
    if (confidence >= 80) return 'confidence-high'
    if (confidence >= 60) return 'confidence-medium'
    return 'confidence-low'
  }

  // Format person name
  function formatPersonName(gedcomPerson, existingPerson) {
    if (gedcomPerson?.name) return gedcomPerson.name
    if (existingPerson?.first_name || existingPerson?.last_name) {
      return `${existingPerson.first_name || ''} ${existingPerson.last_name || ''}`.trim()
    }
    return 'Unknown'
  }
</script>

<div class="duplicate-summary">
  <h3>Potential Duplicates</h3>

  {#if duplicates.length === 0}
    <div class="no-duplicates">
      <span class="success-icon">✓</span>
      <span>No duplicates found with existing people</span>
    </div>
  {:else}
    <div class="duplicate-count">
      {totalCount} potential {totalCount === 1 ? 'duplicate' : 'duplicates'} detected
    </div>

    <div class="duplicate-list">
      {#each topDuplicates as duplicate}
        <div class="duplicate-item">
          <div class="duplicate-info">
            <div class="duplicate-name">
              {formatPersonName(duplicate.gedcomPerson, duplicate.existingPerson)}
            </div>
            {#if duplicate.gedcomPerson?.birthDate || duplicate.existingPerson?.birth_date}
              <div class="duplicate-date">
                Birth: {duplicate.gedcomPerson?.birthDate || duplicate.existingPerson?.birth_date}
              </div>
            {/if}
          </div>
          <div class="confidence-badge {getConfidenceClass(duplicate.confidence)}">
            {duplicate.confidence}%
          </div>
        </div>
      {/each}
    </div>

    {#if showViewAll}
      <div class="view-all">
        View all {totalCount} duplicates in preview
      </div>
    {/if}
  {/if}
</div>

<style>
  .duplicate-summary {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 20px;
  }

  h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }

  .no-duplicates {
    padding: 16px;
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 12px;
    color: #0369a1;
  }

  .success-icon {
    font-size: 20px;
    font-weight: bold;
  }

  .duplicate-count {
    padding: 12px;
    background: #fef3c7;
    border: 1px solid #fbbf24;
    border-radius: 6px;
    color: #92400e;
    font-weight: 500;
    margin-bottom: 16px;
  }

  .duplicate-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .duplicate-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    transition: background-color 0.2s ease;
  }

  .duplicate-item:hover {
    background: #f3f4f6;
  }

  .duplicate-info {
    flex: 1;
    min-width: 0;
  }

  .duplicate-name {
    font-size: 16px;
    font-weight: 500;
    color: #333;
    margin-bottom: 4px;
  }

  .duplicate-date {
    font-size: 14px;
    color: #666;
  }

  .confidence-badge {
    padding: 6px 12px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    flex-shrink: 0;
    margin-left: 12px;
  }

  .confidence-high {
    background: #dcfce7;
    color: #166534;
  }

  .confidence-medium {
    background: #fef3c7;
    color: #92400e;
  }

  .confidence-low {
    background: #fee2e2;
    color: #991b1b;
  }

  .view-all {
    margin-top: 16px;
    padding: 12px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    text-align: center;
    color: #1e40af;
    font-weight: 500;
  }

  @media (max-width: 767px) {
    .duplicate-summary {
      padding: 16px;
    }

    h3 {
      font-size: 16px;
    }

    .duplicate-item {
      padding: 12px;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .confidence-badge {
      margin-left: 0;
      align-self: flex-end;
    }
  }
</style>
