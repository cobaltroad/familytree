<script>
  /**
   * GedcomTablePagination Component
   * Story #104: GEDCOM Preview Interface with Individuals Table
   *
   * Pagination controls for GEDCOM individuals table
   * - Previous/Next buttons
   * - Page number display
   * - "Showing X-Y of Z" text
   */

  import { createEventDispatcher } from 'svelte'

  export let currentPage = 1
  export let totalPages = 1
  export let totalItems = 0
  export let itemsPerPage = 50

  const dispatch = createEventDispatcher()

  // Calculate range for "Showing X-Y of Z"
  $: startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  $: endItem = Math.min(currentPage * itemsPerPage, totalItems)

  $: isFirstPage = currentPage === 1
  $: isLastPage = currentPage === totalPages

  function handlePrevious() {
    if (!isFirstPage) {
      dispatch('pageChange', currentPage - 1)
    }
  }

  function handleNext() {
    if (!isLastPage) {
      dispatch('pageChange', currentPage + 1)
    }
  }
</script>

<div class="pagination-container" role="navigation" aria-label="Pagination">
  <div class="pagination-info">
    <span class="showing-text">
      Showing {startItem}-{endItem} of {totalItems}
    </span>
  </div>

  <div class="pagination-controls">
    <button
      class="pagination-button"
      on:click={handlePrevious}
      disabled={isFirstPage}
      aria-label="Go to previous page"
    >
      Previous
    </button>

    <span class="page-info">
      Page {currentPage} of {totalPages}
    </span>

    <button
      class="pagination-button"
      on:click={handleNext}
      disabled={isLastPage}
      aria-label="Go to next page"
    >
      Next
    </button>
  </div>
</div>

<style>
  .pagination-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 0;
    gap: 16px;
  }

  .pagination-info {
    display: flex;
    align-items: center;
  }

  .showing-text {
    font-size: 14px;
    color: #6b7280;
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .pagination-button {
    padding: 8px 16px;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .pagination-button:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .pagination-button:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .pagination-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .page-info {
    font-size: 14px;
    color: #374151;
    font-weight: 500;
    min-width: 100px;
    text-align: center;
  }

  @media (max-width: 767px) {
    .pagination-container {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }

    .pagination-info {
      justify-content: center;
    }

    .pagination-controls {
      justify-content: center;
    }

    .showing-text {
      font-size: 13px;
    }

    .pagination-button {
      padding: 10px 20px;
      font-size: 13px;
    }

    .page-info {
      font-size: 13px;
      min-width: 90px;
    }
  }
</style>
