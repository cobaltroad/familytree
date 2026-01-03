<script>
  /**
   * DuplicateComparisonCard Component
   * Story #106: GEDCOM Duplicate Resolution UI
   *
   * Side-by-side comparison card for GEDCOM and existing person data
   */

  export let person = {}
  export let title = 'Person'
  export let matchingFields = {}

  // Helper function to check if a field matches
  function isMatching(field) {
    return matchingFields[field] === true
  }

  // Get field class based on matching status
  function getFieldClass(field) {
    if (matchingFields[field] === true) return 'matching'
    if (matchingFields[field] === false) return 'different'
    return ''
  }

  // Format dates
  function formatDate(date) {
    if (!date) return 'Unknown'
    return date
  }

  // Generate initials for avatar
  function getInitials(person) {
    const first = person.firstName?.[0] || ''
    const last = person.lastName?.[0] || ''
    return (first + last).toUpperCase() || '?'
  }

  // Get display name
  $: displayName = person.name || [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Unknown'
</script>

<div class="comparison-card">
  <div class="card-header">
    <h3>{title}</h3>
  </div>

  <div class="card-body">
    <!-- Photo/Avatar -->
    <div class="field-group">
      {#if person.photoUrl}
        <img src={person.photoUrl} alt={displayName} class="person-photo" />
      {:else}
        <div class="initials-avatar">
          {getInitials(person)}
        </div>
      {/if}
    </div>

    <!-- Name -->
    <div class="field-group {getFieldClass('name')}">
      <span class="field-label">Name:</span>
      <span class="field-value">{displayName}</span>
    </div>

    <!-- Birth Date -->
    <div class="field-group {getFieldClass('birthDate')}">
      <span class="field-label">Birth Date:</span>
      <span class="field-value">{formatDate(person.birthDate)}</span>
    </div>

    <!-- Birth Place -->
    {#if person.birthPlace || matchingFields.birthPlace !== undefined}
      <div class="field-group {getFieldClass('birthPlace')}">
        <span class="field-label">Birth Place:</span>
        <span class="field-value">{person.birthPlace || 'Unknown'}</span>
      </div>
    {/if}

    <!-- Death Date -->
    {#if person.deathDate || matchingFields.deathDate !== undefined}
      <div class="field-group {getFieldClass('deathDate')}">
        <span class="field-label">Death Date:</span>
        <span class="field-value">{formatDate(person.deathDate)}</span>
      </div>
    {/if}

    <!-- Death Place -->
    {#if person.deathPlace || matchingFields.deathPlace !== undefined}
      <div class="field-group {getFieldClass('deathPlace')}">
        <span class="field-label">Death Place:</span>
        <span class="field-value">{person.deathPlace || 'Unknown'}</span>
      </div>
    {/if}

    <!-- Gender -->
    <div class="field-group {getFieldClass('gender')}">
      <span class="field-label">Gender:</span>
      <span class="field-value">{person.gender || 'Unknown'}</span>
    </div>
  </div>
</div>

<style>
  .comparison-card {
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
  }

  .card-header {
    background: #f9fafb;
    padding: 16px;
    border-bottom: 1px solid #e5e7eb;
  }

  .card-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #374151;
  }

  .card-body {
    padding: 20px;
  }

  .field-group {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    margin-bottom: 8px;
    border-radius: 6px;
    background: #fafafa;
    transition: all 0.2s ease;
  }

  .field-group:last-child {
    margin-bottom: 0;
  }

  .field-group.matching {
    background: #d1fae5;
    border: 1px solid #10b981;
  }

  .field-group.different {
    background: #fef3c7;
    border: 1px solid #f59e0b;
  }

  .field-label {
    font-size: 14px;
    font-weight: 500;
    color: #6b7280;
  }

  .field-value {
    font-size: 14px;
    color: #111827;
    font-weight: 500;
    text-align: right;
  }

  .person-photo {
    width: 100%;
    max-width: 120px;
    height: 120px;
    object-fit: cover;
    border-radius: 8px;
    margin: 0 auto 16px;
    display: block;
    border: 2px solid #e5e7eb;
  }

  .initials-avatar {
    width: 120px;
    height: 120px;
    border-radius: 8px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    font-weight: 700;
    color: white;
    margin: 0 auto 16px;
    border: 2px solid #e5e7eb;
  }

  /* Mobile responsive */
  @media (max-width: 767px) {
    .card-body {
      padding: 16px;
    }

    .field-group {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }

    .field-value {
      text-align: left;
    }

    .person-photo,
    .initials-avatar {
      width: 80px;
      height: 80px;
    }

    .initials-avatar {
      font-size: 32px;
    }
  }
</style>
