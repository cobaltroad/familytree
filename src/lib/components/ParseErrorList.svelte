<script>
  /**
   * ParseErrorList Component
   * Story #103: GEDCOM Parsing Results Display
   *
   * Displays parsing errors in an expandable/collapsible list,
   * grouped by severity (errors vs warnings)
   */

  export let errors = []

  let expanded = false

  // Group errors by severity
  $: errorsBySeverity = errors.reduce((acc, error) => {
    const severity = error.severity || 'error'
    if (!acc[severity]) acc[severity] = []
    acc[severity].push(error)
    return acc
  }, {})

  $: sortedErrors = [
    ...(errorsBySeverity.error || []),
    ...(errorsBySeverity.warning || [])
  ]

  $: errorCount = (errorsBySeverity.error || []).length
  $: warningCount = (errorsBySeverity.warning || []).length
  $: totalCount = errors.length

  function toggleExpanded() {
    expanded = !expanded
  }

  function handleKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleExpanded()
    }
  }
</script>

{#if errors.length === 0}
  <div class="no-errors">
    <span class="success-icon">✓</span>
    <span>No errors found - file parsed successfully</span>
  </div>
{:else}
  <div class="error-list">
    <button
      class="expand-button"
      on:click={toggleExpanded}
      on:keydown={handleKeydown}
      aria-expanded={expanded}
      aria-label="View errors and warnings"
    >
      <span class="error-count">{totalCount} {totalCount === 1 ? 'issue' : 'issues'} found</span>
      <span class="chevron" class:expanded>{expanded ? '▼' : '▶'}</span>
    </button>

    {#if expanded}
      <div class="error-details">
        {#if errorCount > 0}
          <div class="error-section">
            <h4 class="severity-heading error-heading">{errorCount} {errorCount === 1 ? 'Error' : 'Errors'}</h4>
            {#each errorsBySeverity.error as error}
              <div class="error-item error-severity">
                <div class="error-line">Line {error.line}</div>
                <div class="error-type">{error.type}</div>
                <div class="error-message">{error.message}</div>
              </div>
            {/each}
          </div>
        {/if}

        {#if warningCount > 0}
          <div class="error-section">
            <h4 class="severity-heading warning-heading">{warningCount} {warningCount === 1 ? 'Warning' : 'Warnings'}</h4>
            {#each errorsBySeverity.warning as error}
              <div class="error-item warning-severity">
                <div class="error-line">Line {error.line}</div>
                <div class="error-type">{error.type}</div>
                <div class="error-message">{error.message}</div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .no-errors {
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

  .error-list {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
  }

  .expand-button {
    width: 100%;
    padding: 16px;
    background: #fff3cd;
    border: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
    color: #856404;
    transition: background-color 0.2s ease;
  }

  .expand-button:hover {
    background: #ffe69c;
  }

  .expand-button:focus {
    outline: 2px solid #ffc107;
    outline-offset: -2px;
  }

  .error-count {
    flex: 1;
    text-align: left;
  }

  .chevron {
    font-size: 12px;
    transition: transform 0.2s ease;
  }

  .chevron.expanded {
    transform: rotate(0deg);
  }

  .error-details {
    padding: 20px;
    background: white;
  }

  .error-section {
    margin-bottom: 24px;
  }

  .error-section:last-child {
    margin-bottom: 0;
  }

  .severity-heading {
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
  }

  .error-heading {
    color: #dc2626;
  }

  .warning-heading {
    color: #f59e0b;
  }

  .error-item {
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 8px;
    border-left: 4px solid;
  }

  .error-item:last-child {
    margin-bottom: 0;
  }

  .error-severity {
    background: #fef2f2;
    border-left-color: #dc2626;
  }

  .warning-severity {
    background: #fffbeb;
    border-left-color: #f59e0b;
  }

  .error-line {
    font-size: 12px;
    font-weight: 600;
    color: #666;
    margin-bottom: 4px;
  }

  .error-type {
    font-size: 13px;
    font-family: monospace;
    color: #333;
    margin-bottom: 4px;
  }

  .error-message {
    font-size: 14px;
    color: #444;
  }

  @media (max-width: 767px) {
    .expand-button {
      padding: 12px;
      font-size: 14px;
    }

    .error-details {
      padding: 16px;
    }

    .error-item {
      padding: 10px;
    }
  }
</style>
