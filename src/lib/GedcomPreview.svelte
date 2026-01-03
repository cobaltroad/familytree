<script>
  /**
   * GedcomPreview Component
   * Story #104: GEDCOM Preview Interface with Individuals Table
   *
   * Main preview page for GEDCOM import
   * Features:
   * - Summary statistics banner
   * - Tab navigation (Individuals, Tree View, Duplicates)
   * - Individuals table with pagination, sorting, search
   * - Person details side panel
   * - Action buttons (Continue, Cancel)
   */

  import { onMount } from 'svelte'
  import { api } from './api.js'
  import GedcomIndividualsTable from './components/GedcomIndividualsTable.svelte'
  import GedcomPersonDetails from './components/GedcomPersonDetails.svelte'
  import GedcomDuplicateResolution from './components/GedcomDuplicateResolution.svelte'

  export let uploadId = ''

  // State
  let loading = true
  let error = null
  let previewData = null
  let selectedPerson = null
  let breadcrumbs = []

  // Tabs
  let activeTab = 'individuals' // individuals, tree, duplicates

  // Table state
  let currentPage = 1
  let sortBy = 'name'
  let sortOrder = 'asc'
  let searchQuery = ''

  // Fetch individuals data
  async function fetchIndividuals() {
    loading = true
    error = null

    try {
      const data = await api.getGedcomPreviewIndividuals(uploadId, {
        page: currentPage,
        limit: 50,
        sortBy,
        sortOrder,
        search: searchQuery
      })

      previewData = data
      loading = false
    } catch (err) {
      error = err.message
      loading = false
    }
  }

  // Fetch person details
  async function fetchPersonDetails(gedcomId) {
    try {
      const person = await api.getGedcomPreviewPerson(uploadId, gedcomId)
      selectedPerson = person
      breadcrumbs = [gedcomId]
    } catch (err) {
      console.error('Failed to fetch person details:', err)
    }
  }

  // Handle person selection
  function handlePersonSelect(event) {
    const gedcomId = event.detail
    fetchPersonDetails(gedcomId)
  }

  // Handle person navigation (from breadcrumb or related person)
  function handlePersonNavigate(event) {
    const gedcomId = event.detail

    // Add to breadcrumbs if not already the current person
    if (!breadcrumbs.includes(gedcomId)) {
      breadcrumbs = [...breadcrumbs, gedcomId]
    } else {
      // If navigating back, truncate breadcrumbs
      const index = breadcrumbs.indexOf(gedcomId)
      breadcrumbs = breadcrumbs.slice(0, index + 1)
    }

    fetchPersonDetails(gedcomId)
  }

  // Handle close person details
  function handleClosePersonDetails() {
    selectedPerson = null
    breadcrumbs = []
  }

  // Handle page change
  function handlePageChange(event) {
    currentPage = event.detail
    fetchIndividuals()
  }

  // Handle sort change
  function handleSortChange(event) {
    const { sortBy: newSortBy, sortOrder: newSortOrder } = event.detail
    sortBy = newSortBy
    sortOrder = newSortOrder
    currentPage = 1 // Reset to first page when sorting changes
    fetchIndividuals()
  }

  // Handle search change
  function handleSearchChange(event) {
    searchQuery = event.detail
    currentPage = 1 // Reset to first page when search changes
    fetchIndividuals()
  }

  // Handle tab change
  function changeTab(tab) {
    activeTab = tab
  }

  // Navigate to import confirmation (Story #107: Import Progress Page)
  function continueToImport() {
    window.location.hash = `/gedcom/import-progress/${uploadId}`
  }

  // Navigate back to upload
  function cancelPreview() {
    window.location.hash = '#/gedcom/import'
  }

  onMount(() => {
    fetchIndividuals()
  })
</script>

<main class="gedcom-preview">
  <h2>GEDCOM Preview</h2>

  {#if loading && !previewData}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading preview data...</p>
    </div>
  {:else if error}
    <div class="error-section">
      <h3>Error</h3>
      <div class="error-message">{error}</div>
      <button class="button button-secondary" on:click={cancelPreview}>
        Back to Upload
      </button>
    </div>
  {:else if previewData}
    <!-- Summary Statistics Banner -->
    <div class="summary-banner">
      <div class="summary-stat">
        <span class="summary-number">{previewData.statistics.totalIndividuals}</span>
        <span class="summary-label">Individuals</span>
      </div>
      <div class="summary-stat">
        <span class="summary-number new">{previewData.statistics.newIndividuals}</span>
        <span class="summary-label">New</span>
      </div>
      <div class="summary-stat">
        <span class="summary-number duplicate">{previewData.statistics.duplicateIndividuals}</span>
        <span class="summary-label">Duplicates</span>
      </div>
      <div class="summary-stat">
        <span class="summary-number existing">{previewData.statistics.existingIndividuals}</span>
        <span class="summary-label">Existing</span>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="tabs" role="tablist">
      <button
        class="tab {activeTab === 'individuals' ? 'active' : ''}"
        role="tab"
        aria-selected={activeTab === 'individuals'}
        on:click={() => changeTab('individuals')}
      >
        Individuals
      </button>
      <button
        class="tab {activeTab === 'tree' ? 'active' : ''}"
        role="tab"
        aria-selected={activeTab === 'tree'}
        on:click={() => changeTab('tree')}
        disabled
      >
        Tree View
      </button>
      <button
        class="tab {activeTab === 'duplicates' ? 'active' : ''}"
        role="tab"
        aria-selected={activeTab === 'duplicates'}
        on:click={() => changeTab('duplicates')}
      >
        Duplicates {#if previewData && previewData.statistics.duplicateIndividuals > 0}({previewData.statistics.duplicateIndividuals}){/if}
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content {selectedPerson ? 'with-sidebar' : ''}">
      <!-- Main Content -->
      <div class="main-content">
        {#if activeTab === 'individuals'}
          <GedcomIndividualsTable
            individuals={previewData.individuals || []}
            currentPage={previewData.pagination.currentPage}
            totalPages={previewData.pagination.totalPages}
            totalItems={previewData.pagination.totalItems}
            {sortBy}
            {sortOrder}
            on:personSelect={handlePersonSelect}
            on:pageChange={handlePageChange}
            on:sortChange={handleSortChange}
            on:searchChange={handleSearchChange}
          />
        {:else if activeTab === 'tree'}
          <div class="placeholder">
            <p>Tree View coming soon...</p>
          </div>
        {:else if activeTab === 'duplicates'}
          <GedcomDuplicateResolution {uploadId} />
        {/if}
      </div>

      <!-- Person Details Sidebar -->
      {#if selectedPerson}
        <aside class="sidebar" class:mobile-layout={false}>
          <GedcomPersonDetails
            person={selectedPerson}
            {breadcrumbs}
            on:personNavigate={handlePersonNavigate}
            on:close={handleClosePersonDetails}
          />
        </aside>
      {/if}
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons">
      <button class="button button-secondary" on:click={cancelPreview}>
        Cancel
      </button>
      <button class="button button-primary" on:click={continueToImport}>
        Continue to Import
      </button>
    </div>
  {/if}
</main>

<style>
  .gedcom-preview {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
  }

  h2 {
    margin: 0 0 24px 0;
    font-size: 28px;
    font-weight: 600;
    color: #333;
  }

  /* Loading State */
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    gap: 16px;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #f3f4f6;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading p {
    font-size: 16px;
    color: #666;
  }

  /* Error Section */
  .error-section {
    background: white;
    border: 1px solid #fca5a5;
    border-radius: 8px;
    padding: 24px;
  }

  .error-section h3 {
    color: #dc2626;
    margin: 0 0 16px 0;
    font-size: 20px;
  }

  .error-message {
    padding: 16px;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-radius: 6px;
    color: #991b1b;
    margin-bottom: 20px;
  }

  /* Summary Banner */
  .summary-banner {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 32px;
  }

  .summary-stat {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .summary-number {
    font-size: 32px;
    font-weight: 700;
    color: #111827;
  }

  .summary-number.new {
    color: #10b981;
  }

  .summary-number.duplicate {
    color: #f59e0b;
  }

  .summary-number.existing {
    color: #6b7280;
  }

  .summary-label {
    font-size: 14px;
    font-weight: 500;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Tabs */
  .tabs {
    display: flex;
    gap: 4px;
    border-bottom: 2px solid #e5e7eb;
    margin-bottom: 24px;
  }

  .tab {
    padding: 12px 24px;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    font-size: 15px;
    font-weight: 500;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: -2px;
  }

  .tab:hover:not(:disabled) {
    color: #374151;
    background: #f9fafb;
  }

  .tab:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .tab.active {
    color: #2563eb;
    border-bottom-color: #2563eb;
  }

  .tab:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Tab Content */
  .tab-content {
    display: flex;
    gap: 24px;
    margin-bottom: 32px;
  }

  .tab-content.with-sidebar {
    gap: 24px;
  }

  .main-content {
    flex: 1;
    min-width: 0;
  }

  .sidebar {
    width: 400px;
    flex-shrink: 0;
    position: sticky;
    top: 20px;
    align-self: flex-start;
    max-height: calc(100vh - 120px);
    overflow: hidden;
    border-radius: 8px;
  }

  .placeholder {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 60px 20px;
    text-align: center;
  }

  .placeholder p {
    margin: 0;
    font-size: 16px;
    color: #9ca3af;
    font-style: italic;
  }

  /* Action Buttons */
  .action-buttons {
    display: flex;
    gap: 12px;
    justify-content: space-between;
    padding-top: 24px;
    border-top: 1px solid #e5e7eb;
  }

  .button {
    padding: 12px 24px;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .button-primary {
    background: #2563eb;
    color: white;
  }

  .button-primary:hover {
    background: #1d4ed8;
  }

  .button-primary:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .button-secondary {
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .button-secondary:hover {
    background: #f9fafb;
  }

  .button-secondary:focus {
    outline: 2px solid #9ca3af;
    outline-offset: 2px;
  }

  @media (max-width: 1023px) {
    .tab-content.with-sidebar {
      flex-direction: column;
    }

    .sidebar {
      width: 100%;
      position: static;
      max-height: 600px;
    }
  }

  @media (max-width: 767px) {
    .gedcom-preview {
      padding: 16px;
    }

    h2 {
      font-size: 24px;
      margin-bottom: 20px;
    }

    .summary-banner {
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }

    .summary-stat {
      padding: 16px;
    }

    .summary-number {
      font-size: 24px;
    }

    .summary-label {
      font-size: 12px;
    }

    .tabs {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .tab {
      padding: 10px 16px;
      font-size: 14px;
      white-space: nowrap;
    }

    .action-buttons {
      flex-direction: column-reverse;
    }

    .button {
      width: 100%;
    }

    .mobile-layout {
      border-radius: 0;
    }
  }
</style>
