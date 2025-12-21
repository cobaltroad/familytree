<script>
  // Two-column layout component for modal content
  // Left column: Personal information form
  // Right column: Relationships display
  // Responsive: collapses to single column on mobile (<768px)
</script>

<div class="two-column-layout">
  <div class="left-column" role="region" aria-label="Personal Information">
    <slot name="left" />
  </div>
  <div class="right-column" role="region" aria-label="Relationships">
    <slot name="right" />
  </div>
</div>

<style>
  .two-column-layout {
    display: grid;
    grid-template-columns: 40% 1fr;
    gap: 0;
    align-items: start;
  }

  .left-column {
    background: #ffffff;
    padding: 1.5rem;
    border-right: 1px solid #e0e0e0;
    overflow-y: auto;
    max-height: 70vh;
  }

  .right-column {
    background: #fafafa;
    padding: 1.5rem;
    overflow-y: auto;
    max-height: 70vh;
  }

  /* Responsive: single column on mobile */
  @media (max-width: 768px) {
    .two-column-layout {
      grid-template-columns: 1fr;
    }

    .left-column {
      border-right: none;
      border-bottom: 1px solid #e0e0e0;
    }
  }
</style>
