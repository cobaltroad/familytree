<script>
  /**
   * DuplicateResolutionChoice Component
   * Story #106: GEDCOM Duplicate Resolution UI
   *
   * Radio button group for resolution choices (merge, import as new, skip)
   */

  import { createEventDispatcher } from 'svelte'

  export let selectedResolution = null
  export let gedcomPerson = {}
  export let existingPerson = {}

  const dispatch = createEventDispatcher()

  function handleResolutionChange(resolution) {
    selectedResolution = resolution
    dispatch('change', resolution)
  }

  // Get differing fields for merge warning
  function getDifferingFields() {
    const fields = []
    if (gedcomPerson.birthDate !== existingPerson.birthDate) fields.push('birth date')
    if (gedcomPerson.birthPlace !== existingPerson.birthPlace) fields.push('birth place')
    if (gedcomPerson.deathDate && gedcomPerson.deathDate !== existingPerson.deathDate) fields.push('death date')
    if (gedcomPerson.deathPlace && gedcomPerson.deathPlace !== existingPerson.deathPlace) fields.push('death place')
    return fields
  }

  $: differingFields = getDifferingFields()
</script>

<div class="resolution-choice-container">
  <h4>How would you like to handle this duplicate?</h4>

  <div class="resolution-options">
    <!-- Merge Option -->
    <label class="resolution-option {selectedResolution === 'merge' ? 'selected' : ''}">
      <input
        type="radio"
        name="resolution"
        value="merge"
        checked={selectedResolution === 'merge'}
        on:change={() => handleResolutionChange('merge')}
      />
      <div class="option-content">
        <div class="option-header">
          <span class="option-title">Merge with Existing</span>
          <span class="option-badge merge">Recommended</span>
        </div>
        <p class="option-description">
          Update the existing person with new information from the GEDCOM file.
        </p>
        {#if differingFields.length > 0}
          <div class="option-warning">
            <strong>Will update:</strong> {differingFields.join(', ')}
          </div>
        {/if}
      </div>
    </label>

    <!-- Import as New Option -->
    <label class="resolution-option {selectedResolution === 'import_as_new' ? 'selected' : ''}">
      <input
        type="radio"
        name="resolution"
        value="import_as_new"
        checked={selectedResolution === 'import_as_new'}
        on:change={() => handleResolutionChange('import_as_new')}
      />
      <div class="option-content">
        <div class="option-header">
          <span class="option-title">Import as New Person</span>
        </div>
        <p class="option-description">
          Create a new person record, even though there's a possible match.
        </p>
        <div class="option-warning">
          This may create duplicate records in your tree.
        </div>
      </div>
    </label>

    <!-- Skip Option -->
    <label class="resolution-option {selectedResolution === 'skip' ? 'selected' : ''}">
      <input
        type="radio"
        name="resolution"
        value="skip"
        checked={selectedResolution === 'skip'}
        on:change={() => handleResolutionChange('skip')}
      />
      <div class="option-content">
        <div class="option-header">
          <span class="option-title">Skip This Person</span>
        </div>
        <p class="option-description">
          Don't import this person. Keep only the existing record.
        </p>
      </div>
    </label>
  </div>
</div>

<style>
  .resolution-choice-container {
    margin-top: 24px;
  }

  h4 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: #374151;
  }

  .resolution-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .resolution-option {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: white;
  }

  .resolution-option:hover {
    border-color: #3b82f6;
    background: #f0f9ff;
  }

  .resolution-option.selected {
    border-color: #2563eb;
    background: #eff6ff;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .resolution-option input[type="radio"] {
    margin-top: 2px;
    cursor: pointer;
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  .option-content {
    flex: 1;
  }

  .option-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .option-title {
    font-size: 15px;
    font-weight: 600;
    color: #111827;
  }

  .option-badge {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .option-badge.merge {
    background: #d1fae5;
    color: #065f46;
  }

  .option-description {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #6b7280;
    line-height: 1.5;
  }

  .option-warning {
    padding: 8px 12px;
    background: #fef3c7;
    border: 1px solid #f59e0b;
    border-radius: 6px;
    font-size: 13px;
    color: #92400e;
    margin-top: 8px;
  }

  .option-warning strong {
    font-weight: 600;
  }

  /* Mobile responsive */
  @media (max-width: 767px) {
    .resolution-option {
      padding: 12px;
    }

    .option-title {
      font-size: 14px;
    }

    .option-description {
      font-size: 13px;
    }
  }
</style>
