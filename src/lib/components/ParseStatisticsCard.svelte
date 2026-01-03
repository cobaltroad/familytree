<script>
  /**
   * ParseStatisticsCard Component
   * Story #103: GEDCOM Parsing Results Display
   *
   * Displays a single statistic card with icon, label, and value
   */

  export let icon = ''
  export let label = ''
  export let value = null

  // Format value for display
  $: displayValue = value !== null && value !== undefined ? String(value) : 'N/A'
</script>

<div class="stat-card">
  <div class="stat-icon">{icon}</div>
  <div class="stat-content">
    <div class="stat-label">{label}</div>
    <div class="stat-value">{displayValue}</div>
  </div>
</div>

<style>
  .stat-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    transition: box-shadow 0.2s ease;
  }

  .stat-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .stat-icon {
    font-size: 32px;
    flex-shrink: 0;
  }

  .stat-content {
    flex: 1;
    min-width: 0;
  }

  .stat-label {
    font-size: 14px;
    color: #666;
    margin-bottom: 4px;
  }

  .stat-value {
    font-size: 24px;
    font-weight: 600;
    color: #333;
  }

  @media (max-width: 767px) {
    .stat-card {
      padding: 16px;
    }

    .stat-icon {
      font-size: 28px;
    }

    .stat-value {
      font-size: 20px;
    }
  }
</style>
