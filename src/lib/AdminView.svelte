<script>
  import { people, relationships } from '../stores/familyStore.js'
  import { peopleById } from '../stores/derivedStores.js'
  import { api } from './api.js'
  import * as notifications from '../stores/notificationStore.js'
  import { onMount } from 'svelte'

  // Reactive statements to get data
  $: peopleList = $people || []
  $: relationshipsList = $relationships || []

  // View all records feature flag state
  let viewAllRecords = false
  let loading = false
  let error = null

  // GEDCOM export state
  let exporting = false

  // Check if user's view_all_records is enabled on mount
  onMount(async () => {
    try {
      // Get current user from session data embedded in page
      const response = await fetch('/api/user/settings')
      if (response.ok) {
        const settings = await response.json()
        viewAllRecords = settings.viewAllRecords
      }
    } catch (err) {
      console.error('Failed to load user settings:', err)
    }
  })

  // Toggle view all records
  async function toggleViewAllRecords() {
    loading = true
    error = null
    try {
      const newValue = !viewAllRecords
      const updated = await api.updateUserSettings({ viewAllRecords: newValue })
      viewAllRecords = updated.viewAllRecords

      // Reload data to reflect new filter
      window.location.reload()
    } catch (err) {
      error = err.message
      console.error('Failed to update settings:', err)
    } finally {
      loading = false
    }
  }

  // Export family tree as GEDCOM
  async function handleExportGedcom() {
    exporting = true
    try {
      await api.exportGedcom('5.5.1')
      notifications.success('Family tree exported successfully')
    } catch (err) {
      console.error('Failed to export GEDCOM:', err)
      notifications.error('Failed to export family tree: ' + err.message)
    } finally {
      exporting = false
    }
  }

  // Helper function to get person name by ID
  function getPersonName(personId) {
    const person = $peopleById.get(personId)
    if (!person) return 'Unknown'
    return `${person.firstName} ${person.lastName}`
  }

  // Helper function to format person for display
  function formatPersonWithId(personId) {
    const person = $peopleById.get(personId)
    if (!person) return `${personId} (Unknown)`
    return `${personId} (${person.firstName} ${person.lastName})`
  }

  // Sort people by ID
  $: sortedPeople = [...peopleList].sort((a, b) => a.id - b.id)

  // Sort relationships by ID
  $: sortedRelationships = [...relationshipsList].sort((a, b) => a.id - b.id)
</script>

<div class="admin-container">
  <h2>Admin View - Database Records</h2>
  <p class="subtitle">Development tool for viewing all records and verifying data isolation</p>

  <!-- View All Records Toggle and Export Button -->
  <div class="control-panel">
    <div class="control-row">
      <div class="toggle-section">
        <label class="toggle-label">
          <input
            type="checkbox"
            bind:checked={viewAllRecords}
            on:change={toggleViewAllRecords}
            disabled={loading}
            class="toggle-checkbox"
          />
          <span class="toggle-slider"></span>
          <span class="toggle-text">
            View All Users' Records
          </span>
        </label>
        {#if loading}
          <span class="loading-indicator">Updating...</span>
        {/if}
        {#if error}
          <span class="error-message">{error}</span>
        {/if}
      </div>
      <button
        class="export-button"
        on:click={handleExportGedcom}
        disabled={exporting}
        aria-label="Export family tree as GEDCOM file"
      >
        <svg class="export-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
        {#if exporting}
          Exporting...
        {:else}
          Export GEDCOM
        {/if}
      </button>
    </div>
  </div>

  <!-- Visual Banner -->
  {#if viewAllRecords}
    <div class="banner banner-warning">
      <svg class="banner-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      <div>
        <strong>Viewing ALL users' records</strong>
        <p>You are seeing records from all users in the database. This bypasses data isolation.</p>
      </div>
    </div>
  {:else}
    <div class="banner banner-info">
      <svg class="banner-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
      </svg>
      <div>
        <strong>Viewing only your records</strong>
        <p>You are seeing only records that belong to you (data isolation active).</p>
      </div>
    </div>
  {/if}

  <!-- People Table -->
  <section class="table-section">
    <div class="section-header">
      <h3>People Records</h3>
      <span class="record-count">{peopleList.length} records</span>
    </div>

    {#if peopleList.length === 0}
      <div class="empty-state">
        <p>No people records found in the database.</p>
      </div>
    {:else}
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Birth Date</th>
              <th>Death Date</th>
              <th>Gender</th>
              <th>Photo URL</th>
              <th>User ID</th>
            </tr>
          </thead>
          <tbody>
            {#each sortedPeople as person (person.id)}
              <tr>
                <td>{person.id}</td>
                <td>{person.firstName} {person.lastName}</td>
                <td>{person.birthDate || '—'}</td>
                <td>{person.deathDate || '—'}</td>
                <td>{person.gender || '—'}</td>
                <td class="truncate">{person.photoUrl || '—'}</td>
                <td class="user-id">{person.userId}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <!-- Relationships Table -->
  <section class="table-section">
    <div class="section-header">
      <h3>Relationship Records</h3>
      <span class="record-count">{relationshipsList.length} records</span>
    </div>

    {#if relationshipsList.length === 0}
      <div class="empty-state">
        <p>No relationship records found in the database.</p>
      </div>
    {:else}
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Person 1</th>
              <th>Person 2</th>
              <th>Type</th>
              <th>Parent Role</th>
              <th>User ID</th>
            </tr>
          </thead>
          <tbody>
            {#each sortedRelationships as rel (rel.id)}
              <tr>
                <td>{rel.id}</td>
                <td>{formatPersonWithId(rel.person1Id)}</td>
                <td>{formatPersonWithId(rel.person2Id)}</td>
                <td>{rel.type}</td>
                <td>{rel.parentRole || '—'}</td>
                <td class="user-id">{rel.userId}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</div>

<style>
  .admin-container {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  /* Control Panel Styles */
  .control-panel {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .control-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .toggle-section {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .export-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.25rem;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .export-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  .export-button:hover:not(:disabled) {
    background: #45a049;
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
  }

  .export-button:active:not(:disabled) {
    transform: translateY(1px);
  }

  .export-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    position: relative;
  }

  .toggle-checkbox {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: relative;
    display: inline-block;
    width: 48px;
    height: 24px;
    background-color: #ccc;
    border-radius: 24px;
    transition: background-color 0.3s;
  }

  .toggle-slider::after {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    left: 3px;
    top: 3px;
    background-color: white;
    border-radius: 50%;
    transition: transform 0.3s;
  }

  .toggle-checkbox:checked + .toggle-slider {
    background-color: #FF9800;
  }

  .toggle-checkbox:checked + .toggle-slider::after {
    transform: translateX(24px);
  }

  .toggle-checkbox:disabled + .toggle-slider {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .toggle-text {
    font-size: 1rem;
    font-weight: 600;
    color: #333;
  }

  .loading-indicator {
    color: #666;
    font-size: 0.9rem;
    font-style: italic;
  }

  .error-message {
    color: #d32f2f;
    font-size: 0.9rem;
    font-weight: 500;
  }

  /* Banner Styles */
  .banner {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    border: 1px solid;
  }

  .banner-info {
    background: #E3F2FD;
    border-color: #2196F3;
    color: #0D47A1;
  }

  .banner-warning {
    background: #FFF3E0;
    border-color: #FF9800;
    color: #E65100;
  }

  .banner-icon {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .banner strong {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 1rem;
  }

  .banner p {
    margin: 0;
    font-size: 0.9rem;
    opacity: 0.9;
  }

  h2 {
    margin: 0 0 0.5rem 0;
    color: #333;
    font-size: 1.75rem;
  }

  .subtitle {
    margin: 0 0 2rem 0;
    color: #666;
    font-size: 0.95rem;
    font-style: italic;
  }

  .table-section {
    margin-bottom: 3rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid #4CAF50;
  }

  h3 {
    margin: 0;
    color: #333;
    font-size: 1.35rem;
  }

  .record-count {
    background: #4CAF50;
    color: white;
    padding: 0.35rem 0.75rem;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .table-container {
    overflow-x: auto;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  thead {
    background: #f5f5f5;
    position: sticky;
    top: 0;
  }

  th {
    text-align: left;
    padding: 0.85rem 1rem;
    font-weight: 600;
    color: #555;
    border-bottom: 2px solid #e0e0e0;
    white-space: nowrap;
  }

  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #f0f0f0;
    vertical-align: top;
  }

  tbody tr:hover {
    background: #fafafa;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  .truncate {
    max-width: 250px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .user-id {
    font-weight: 600;
    color: #4CAF50;
    background: #f9fff9;
  }

  .empty-state {
    padding: 3rem 2rem;
    text-align: center;
    color: #999;
    background: #fafafa;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
  }

  .empty-state p {
    margin: 0;
    font-size: 1rem;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .admin-container {
      padding: 1rem;
    }

    h2 {
      font-size: 1.35rem;
    }

    h3 {
      font-size: 1.15rem;
    }

    .control-row {
      flex-direction: column;
      align-items: stretch;
    }

    .toggle-section {
      justify-content: space-between;
    }

    .export-button {
      width: 100%;
      justify-content: center;
    }

    .section-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    table {
      font-size: 0.85rem;
    }

    th, td {
      padding: 0.6rem 0.75rem;
    }

    .truncate {
      max-width: 150px;
    }
  }

  @media (max-width: 480px) {
    table {
      font-size: 0.75rem;
    }

    th, td {
      padding: 0.5rem 0.5rem;
    }

    .truncate {
      max-width: 100px;
    }
  }
</style>
