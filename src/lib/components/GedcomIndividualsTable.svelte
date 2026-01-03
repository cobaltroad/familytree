<script>
  /**
   * GedcomIndividualsTable Component
   * Story #104: GEDCOM Preview Interface with Individuals Table
   *
   * Paginated table of individuals from GEDCOM preview
   * Features:
   * - Sortable columns (name, birth date, death date)
   * - Search/filter by name
   * - Status badges
   * - View Details action
   * - Pagination controls
   */

  import { createEventDispatcher, onMount } from 'svelte'
  import StatusBadge from './StatusBadge.svelte'
  import GedcomTablePagination from './GedcomTablePagination.svelte'

  export let individuals = []
  export let currentPage = 1
  export let totalPages = 1
  export let totalItems = 0
  export let sortBy = 'name'
  export let sortOrder = 'asc'

  const dispatch = createEventDispatcher()

  let searchQuery = ''
  let searchDebounceTimer = null

  // Format date for display
  function formatDate(dateString) {
    if (!dateString) return ''

    const parts = dateString.split('-')

    if (parts.length === 1) {
      // Year only
      return parts[0]
    } else if (parts.length === 2) {
      // Month and year (YYYY-MM)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const year = parts[0]
      const month = parseInt(parts[1]) - 1
      return `${months[month]} ${year}`
    } else if (parts.length === 3) {
      // Full date (YYYY-MM-DD)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const year = parts[0]
      const month = parseInt(parts[1]) - 1
      const day = parseInt(parts[2])
      return `${months[month]} ${day}, ${year}`
    }

    return dateString
  }

  // Format gender for display
  function formatGender(gender) {
    const genderMap = {
      'M': 'Male',
      'F': 'Female',
      'U': 'Other',
      'm': 'Male',
      'f': 'Female',
      'u': 'Other'
    }
    return genderMap[gender] || 'Other'
  }

  // Handle search input with debouncing
  function handleSearchInput(event) {
    const value = event.target.value

    // Clear previous timer
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }

    // Debounce for 300ms
    searchDebounceTimer = setTimeout(() => {
      dispatch('searchChange', value)
    }, 300)
  }

  // Handle column sort
  function handleSort(column) {
    if (sortBy === column) {
      // Toggle order if clicking same column
      dispatch('sortChange', {
        sortBy: column,
        sortOrder: sortOrder === 'asc' ? 'desc' : 'asc'
      })
    } else {
      // Default to ascending for new column
      dispatch('sortChange', {
        sortBy: column,
        sortOrder: 'asc'
      })
    }
  }

  // Handle View Details button click
  function handleViewDetails(gedcomId) {
    dispatch('personSelect', gedcomId)
  }

  // Get sort indicator
  function getSortIndicator(column) {
    if (sortBy !== column) return ''
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  onMount(() => {
    return () => {
      // Cleanup debounce timer
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer)
      }
    }
  })

</script>

<div class="individuals-table-container">
  <!-- Search Bar -->
  <div class="search-bar">
    <input
      type="text"
      class="search-input"
      placeholder="Search by name..."
      bind:value={searchQuery}
      on:input={handleSearchInput}
      aria-label="Search individuals by name"
    />
  </div>

  {#if individuals.length === 0}
    <!-- Empty State -->
    <div class="empty-state">
      <p>No individuals found</p>
    </div>
  {:else}
    <!-- Table -->
    <div class="table-wrapper">
      <table class="individuals-table" role="table">
        <thead>
          <tr>
            <th scope="col" class="col-status">Status</th>
            <th
              scope="col"
              class="col-name sortable {sortBy === 'name' ? 'sorted' : ''}"
              on:click={() => handleSort('name')}
              role="button"
              tabindex="0"
              aria-sort={sortBy === 'name' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              Name {getSortIndicator('name')}
            </th>
            <th
              scope="col"
              class="col-birth sortable {sortBy === 'birthDate' ? 'sorted' : ''}"
              on:click={() => handleSort('birthDate')}
              role="button"
              tabindex="0"
              aria-sort={sortBy === 'birthDate' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              Birth Date {getSortIndicator('birthDate')}
            </th>
            <th
              scope="col"
              class="col-death sortable {sortBy === 'deathDate' ? 'sorted' : ''}"
              on:click={() => handleSort('deathDate')}
              role="button"
              tabindex="0"
              aria-sort={sortBy === 'deathDate' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              Death Date {getSortIndicator('deathDate')}
            </th>
            <th scope="col" class="col-gender">Gender</th>
            <th scope="col" class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each individuals as individual (individual.gedcomId)}
            <tr>
              <td class="col-status">
                <StatusBadge status={individual.status} />
              </td>
              <td class="col-name">{individual.name || 'Unknown'}</td>
              <td class="col-birth">
                {formatDate(individual.birthDate) || '-'}
              </td>
              <td class="col-death">
                {#if individual.deathDate}
                  {formatDate(individual.deathDate)}
                {:else}
                  <span class="living-badge">Living</span>
                {/if}
              </td>
              <td class="col-gender">{formatGender(individual.gender)}</td>
              <td class="col-actions">
                <button
                  class="view-button"
                  on:click={() => handleViewDetails(individual.gedcomId)}
                  aria-label="View details for {individual.name || 'Unknown'}"
                >
                  View Details
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <GedcomTablePagination
      {currentPage}
      {totalPages}
      {totalItems}
      itemsPerPage={50}
      on:pageChange={(e) => dispatch('pageChange', e.detail)}
    />
  {/if}
</div>

<style>
  .individuals-table-container {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
  }

  .search-bar {
    padding: 16px;
    border-bottom: 1px solid #e5e7eb;
  }

  .search-input {
    width: 100%;
    max-width: 400px;
    padding: 10px 14px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s ease;
  }

  .search-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .empty-state {
    padding: 60px 20px;
    text-align: center;
  }

  .empty-state p {
    font-size: 16px;
    color: #6b7280;
    margin: 0;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  .individuals-table {
    width: 100%;
    border-collapse: collapse;
  }

  thead {
    background: #f9fafb;
    border-bottom: 2px solid #e5e7eb;
  }

  th {
    padding: 12px 16px;
    text-align: left;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  th.sortable {
    cursor: pointer;
    user-select: none;
    transition: background-color 0.2s ease;
  }

  th.sortable:hover {
    background: #f3f4f6;
  }

  th.sortable:focus {
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
  }

  th.sorted {
    color: #2563eb;
  }

  tbody tr {
    border-bottom: 1px solid #e5e7eb;
    transition: background-color 0.2s ease;
  }

  tbody tr:hover {
    background: #f9fafb;
  }

  tbody tr:last-child {
    border-bottom: none;
  }

  td {
    padding: 14px 16px;
    font-size: 14px;
    color: #374151;
  }

  .col-status {
    width: 120px;
  }

  .col-name {
    font-weight: 500;
    color: #111827;
  }

  .col-birth,
  .col-death {
    width: 150px;
    white-space: nowrap;
  }

  .col-gender {
    width: 100px;
  }

  .col-actions {
    width: 140px;
  }

  .living-badge {
    display: inline-block;
    padding: 3px 10px;
    background: #dbeafe;
    color: #1e40af;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }

  .view-button {
    padding: 6px 14px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .view-button:hover {
    background: #2563eb;
  }

  .view-button:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  @media (max-width: 767px) {
    .search-input {
      max-width: none;
    }

    th, td {
      padding: 10px 12px;
      font-size: 13px;
    }

    .col-status {
      width: auto;
    }

    .col-birth,
    .col-death {
      width: 120px;
      font-size: 12px;
    }

    .col-gender {
      width: 80px;
      font-size: 12px;
    }

    .col-actions {
      width: 100px;
    }

    .view-button {
      padding: 5px 10px;
      font-size: 12px;
    }
  }
</style>
