<script>
  /**
   * GedcomPersonDetails Component
   * Story #104: GEDCOM Preview Interface with Individuals Table
   *
   * Side panel displaying detailed information about a person from GEDCOM preview
   * Features:
   * - Person information (name, dates, gender, photo)
   * - Status badge
   * - Relationships (parents, spouses, children)
   * - Navigation to related people
   * - Breadcrumb trail
   */

  import { createEventDispatcher } from 'svelte'
  import StatusBadge from './StatusBadge.svelte'

  export let person = null
  export let breadcrumbs = []

  const dispatch = createEventDispatcher()

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

  // Get initials from name
  function getInitials(name) {
    if (!name) return '?'
    const parts = name.split(' ').filter(p => p.length > 0)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  // Handle navigation to related person
  function navigateToPerson(gedcomId) {
    dispatch('personNavigate', gedcomId)
  }

  // Handle close
  function handleClose() {
    dispatch('close')
  }

  // Check if relationship array has items
  function hasRelationships(relationships) {
    return relationships && relationships.length > 0
  }
</script>

<div class="person-details-panel" role="complementary" aria-label="Person details">
  {#if !person}
    <div class="loading-state">
      <p>Loading...</p>
    </div>
  {:else}
    <!-- Header with Close Button -->
    <div class="panel-header">
      <h3>Person Details</h3>
      <button
        class="close-button"
        on:click={handleClose}
        aria-label="Close person details"
      >
        ×
      </button>
    </div>

    <!-- Breadcrumb Navigation -->
    {#if breadcrumbs && breadcrumbs.length > 0}
      <nav class="breadcrumb-trail" aria-label="Breadcrumb navigation">
        {#each breadcrumbs as crumbId, index}
          <span class="breadcrumb-item">
            {#if index < breadcrumbs.length - 1}
              <button
                class="breadcrumb-link"
                on:click={() => navigateToPerson(crumbId)}
              >
                {crumbId}
              </button>
              <span class="breadcrumb-separator">→</span>
            {:else}
              <span class="breadcrumb-current">{crumbId}</span>
            {/if}
          </span>
        {/each}
      </nav>
    {/if}

    <!-- Person Information -->
    <div class="person-info">
      <!-- Photo -->
      <div class="photo-container">
        {#if person.photoUrl}
          <img
            src={person.photoUrl}
            alt="{person.name || 'Unknown'}"
            class="person-photo"
          />
        {:else}
          <div class="initials-avatar">
            {getInitials(person.name)}
          </div>
        {/if}
      </div>

      <!-- Name and Status -->
      <div class="person-header">
        <h4 class="person-name">{person.name || 'Unknown'}</h4>
        <StatusBadge status={person.status} />
      </div>

      <!-- Details Grid -->
      <div class="details-grid">
        {#if person.birthDate}
          <div class="detail-item">
            <span class="detail-label">Born:</span>
            <span class="detail-value">{formatDate(person.birthDate)}</span>
          </div>
        {/if}

        {#if person.deathDate}
          <div class="detail-item">
            <span class="detail-label">Died:</span>
            <span class="detail-value">{formatDate(person.deathDate)}</span>
          </div>
        {:else}
          <div class="detail-item">
            <span class="detail-label">Status:</span>
            <span class="detail-value living">Living</span>
          </div>
        {/if}

        {#if person.gender}
          <div class="detail-item">
            <span class="detail-label">Gender:</span>
            <span class="detail-value">{formatGender(person.gender)}</span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Relationships -->
    <div class="relationships-section">
      <h5>Relationships</h5>

      <!-- Parents -->
      <div class="relationship-section">
        <h6>Parents</h6>
        {#if hasRelationships(person.relationships?.parents)}
          <div class="relationship-list">
            {#each person.relationships.parents as parent}
              <button
                class="relationship-item"
                on:click={() => navigateToPerson(parent.gedcomId)}
              >
                <span class="relationship-name">{parent.name}</span>
                <span class="relationship-type">({parent.relationship})</span>
              </button>
            {/each}
          </div>
        {:else}
          <p class="no-relationships">None</p>
        {/if}
      </div>

      <!-- Spouses -->
      <div class="relationship-section">
        <h6>Spouses</h6>
        {#if hasRelationships(person.relationships?.spouses)}
          <div class="relationship-list">
            {#each person.relationships.spouses as spouse}
              <button
                class="relationship-item"
                on:click={() => navigateToPerson(spouse.gedcomId)}
              >
                <span class="relationship-name">{spouse.name}</span>
              </button>
            {/each}
          </div>
        {:else}
          <p class="no-relationships">None</p>
        {/if}
      </div>

      <!-- Children -->
      <div class="relationship-section">
        <h6>Children</h6>
        {#if hasRelationships(person.relationships?.children)}
          <div class="relationship-list">
            {#each person.relationships.children as child}
              <button
                class="relationship-item"
                on:click={() => navigateToPerson(child.gedcomId)}
              >
                <span class="relationship-name">{child.name}</span>
              </button>
            {/each}
          </div>
        {:else}
          <p class="no-relationships">None</p>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .person-details-panel {
    height: 100%;
    background: white;
    border-left: 1px solid #e5e7eb;
    overflow-y: auto;
  }

  .loading-state {
    padding: 40px 20px;
    text-align: center;
  }

  .loading-state p {
    color: #6b7280;
    font-size: 14px;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    border-bottom: 1px solid #e5e7eb;
    position: sticky;
    top: 0;
    background: white;
    z-index: 10;
  }

  .panel-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #111827;
  }

  .close-button {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    font-size: 28px;
    color: #6b7280;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .close-button:hover {
    background: #f3f4f6;
    color: #111827;
  }

  .close-button:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .breadcrumb-trail {
    padding: 12px 20px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    font-size: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .breadcrumb-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .breadcrumb-link {
    background: none;
    border: none;
    color: #2563eb;
    text-decoration: underline;
    cursor: pointer;
    font-size: 12px;
    padding: 0;
  }

  .breadcrumb-link:hover {
    color: #1d4ed8;
  }

  .breadcrumb-separator {
    color: #9ca3af;
  }

  .breadcrumb-current {
    color: #374151;
    font-weight: 500;
  }

  .person-info {
    padding: 20px;
    border-bottom: 1px solid #e5e7eb;
  }

  .photo-container {
    display: flex;
    justify-content: center;
    margin-bottom: 16px;
  }

  .person-photo {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid #e5e7eb;
  }

  .initials-avatar {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    font-weight: 600;
    border: 3px solid #e5e7eb;
  }

  .person-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
  }

  .person-name {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #111827;
    text-align: center;
  }

  .details-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 8px 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .detail-item:last-child {
    border-bottom: none;
  }

  .detail-label {
    font-size: 13px;
    font-weight: 500;
    color: #6b7280;
  }

  .detail-value {
    font-size: 14px;
    color: #111827;
    text-align: right;
  }

  .detail-value.living {
    color: #2563eb;
    font-weight: 500;
  }

  .relationships-section {
    padding: 20px;
  }

  .relationships-section > h5 {
    margin: 0 0 20px 0;
    font-size: 16px;
    font-weight: 600;
    color: #111827;
  }

  .relationship-section {
    margin-bottom: 24px;
  }

  .relationship-section:last-child {
    margin-bottom: 0;
  }

  .relationship-section h6 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
  }

  .relationship-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .relationship-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    width: 100%;
  }

  .relationship-item:hover {
    background: #f3f4f6;
    border-color: #3b82f6;
  }

  .relationship-item:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .relationship-name {
    font-size: 14px;
    font-weight: 500;
    color: #111827;
    flex: 1;
  }

  .relationship-type {
    font-size: 12px;
    color: #6b7280;
  }

  .no-relationships {
    margin: 0;
    padding: 12px;
    text-align: center;
    color: #9ca3af;
    font-size: 13px;
    font-style: italic;
  }

  @media (max-width: 767px) {
    .person-photo,
    .initials-avatar {
      width: 100px;
      height: 100px;
    }

    .initials-avatar {
      font-size: 40px;
    }

    .person-name {
      font-size: 18px;
    }

    .details-grid {
      font-size: 13px;
    }

    .relationship-item {
      padding: 8px 10px;
    }
  }
</style>
