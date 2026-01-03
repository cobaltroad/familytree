<script>
  /**
   * StatusBadge Component
   * Story #104: GEDCOM Preview Interface with Individuals Table
   *
   * Displays a color-coded status badge for GEDCOM import individuals
   * - new: Green badge (will be imported as new person)
   * - duplicate: Yellow/orange badge (potential duplicate detected)
   * - existing: Gray badge (will be skipped/merged with existing person)
   */

  export let status = ''

  // Normalize status to lowercase for consistency
  $: normalizedStatus = status?.toLowerCase() || ''

  // Map status to display label and icon
  $: statusConfig = {
    'new': { label: 'New', icon: '✓', class: 'status-new' },
    'duplicate': { label: 'Duplicate', icon: '⚠', class: 'status-duplicate' },
    'existing': { label: 'Existing', icon: '○', class: 'status-existing' }
  }[normalizedStatus] || { label: 'Unknown', icon: '?', class: 'status-unknown' }

  // Accessible label
  $: ariaLabel = `Status: ${statusConfig.label}`
</script>

<span
  class="status-badge {statusConfig.class}"
  role="status"
  aria-label={ariaLabel}
>
  <span class="status-icon" aria-hidden="true">{statusConfig.icon}</span>
  <span class="status-label">{statusConfig.label}</span>
</span>

<style>
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0.25rem 0.625rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    white-space: nowrap;
  }

  .status-icon {
    font-size: 0.6875rem;
    line-height: 1;
  }

  .status-label {
    line-height: 1;
  }

  /* New status - Green */
  .status-new {
    background-color: #d1fae5;
    color: #065f46;
    border: 1px solid #10b981;
  }

  /* Duplicate status - Yellow/Orange */
  .status-duplicate {
    background-color: #fef3c7;
    color: #92400e;
    border: 1px solid #f59e0b;
  }

  /* Existing status - Gray */
  .status-existing {
    background-color: #f3f4f6;
    color: #374151;
    border: 1px solid #9ca3af;
  }

  /* Unknown status - Light gray */
  .status-unknown {
    background-color: #f9fafb;
    color: #6b7280;
    border: 1px solid #d1d5db;
  }

  /* Responsive sizing */
  @media (max-width: 768px) {
    .status-badge {
      font-size: 0.6875rem;
      padding: 0.1875rem 0.5rem;
    }
  }
</style>
