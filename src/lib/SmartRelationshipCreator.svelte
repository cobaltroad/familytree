<script>
  import { createEventDispatcher } from 'svelte'
  import { peopleById } from '../stores/derivedStores.js'
  import { api } from './api.js'
  import { createPerson, deletePerson } from '../stores/actions/personActions.js'
  import { createRelationship } from '../stores/actions/relationshipActions.js'
  import { success as successNotification, error as errorNotification } from '../stores/notificationStore.js'
  import { modal } from '../stores/modalStore.js'
  import {
    needsParentRoleSelection,
    buildRelationshipPayloads,
    validateRelationshipData
  } from './smartRelationshipUtils.js'

  // Props
  export let isOpen = false
  export let focusPersonId = null

  const dispatch = createEventDispatcher()

  /**
   * Simple client-side Facebook URL validation
   * Checks if input looks like a valid Facebook URL, username, or ID
   */
  function isValidFacebookUrl(input) {
    if (!input || typeof input !== 'string') return false

    const trimmed = input.trim()
    if (!trimmed) return false

    // Direct numeric ID (all digits)
    if (/^\d+$/.test(trimmed)) return true

    // URL patterns - must contain facebook.com
    if (trimmed.includes('facebook.com')) return true

    // Direct username: alphanumeric with optional single dots/dashes
    // Facebook usernames are typically 5-50 chars, mostly alphanumeric
    // Reject if it looks like multiple words separated by dashes (e.g., "not-a-facebook-url")
    const dashCount = (trimmed.match(/-/g) || []).length
    if (/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,48}[a-zA-Z0-9]$/.test(trimmed) && !trimmed.includes(' ')) {
      // Reject if more than 2 dashes (likely a phrase, not a username)
      if (dashCount <= 2) return true
    }

    // Reject everything else
    return false
  }

  // Reactive values from props
  $: focusPerson = focusPersonId ? $peopleById.get(focusPersonId) : null
  $: focusPersonName = focusPerson
    ? `${focusPerson.firstName} ${focusPerson.lastName}`
    : ''

  // Local state
  let facebookUrl = ''
  let relationshipType = 'child'
  let isImporting = false
  let importedData = null
  let isUrlValid = false
  let showValidation = false
  let fallbackMode = false // New: Track if we're in fallback mode after import failure
  let selectedParentRole = null // For ambiguous gender cases when adding child

  // Editable fields after import
  let editableFirstName = ''
  let editableLastName = ''
  let editableGender = ''
  let editableBirthDate = ''
  let editablePhotoUrl = ''

  // Validate Facebook URL in real-time
  $: {
    const trimmed = facebookUrl.trim()
    if (trimmed) {
      isUrlValid = isValidFacebookUrl(trimmed)
      showValidation = true
    } else {
      isUrlValid = false
      showValidation = false
    }
  }

  // Relationship type options
  $: relationshipOptions = [
    { value: 'child', label: `Child of ${focusPersonName}` },
    { value: 'mother', label: `Mother of ${focusPersonName}` },
    { value: 'father', label: `Father of ${focusPersonName}` },
    { value: 'spouse', label: `Spouse of ${focusPersonName}` },
    { value: 'sibling', label: `Sibling of ${focusPersonName}`, disabled: true }
  ]

  // Relationship preview text
  $: relationshipPreview = importedData
    ? `Will be added as ${relationshipOptions.find(o => o.value === relationshipType)?.label}`
    : ''

  // Check if parent role selection is needed (for ambiguous gender when adding child)
  $: needsRoleSelection = focusPerson && needsParentRoleSelection(relationshipType, focusPerson.gender)

  function closeModal() {
    dispatch('close')
    resetForm()
  }

  function resetForm() {
    facebookUrl = ''
    relationshipType = 'child'
    isImporting = false
    importedData = null
    isUrlValid = false
    showValidation = false
    fallbackMode = false
    selectedParentRole = null
    editableFirstName = ''
    editableLastName = ''
    editableGender = ''
    editableBirthDate = ''
    editablePhotoUrl = ''
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal()
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      closeModal()
    }
  }

  /**
   * Activates fallback mode when Facebook import fails
   * Issue #87: Allows manual data entry while preserving Facebook URL
   */
  function activateFallbackMode(errorMessage) {
    fallbackMode = true
    importedData = {} // Set to empty object to show preview section

    // Fields remain editable (default to empty strings)
    // User can manually enter data

    errorNotification('Failed to fetch Facebook profile: ' + errorMessage)
  }

  /**
   * Handles Facebook profile import and preview
   * On success: Populates fields with imported data
   * On failure: Activates fallback mode for manual entry (Issue #87)
   */
  async function handleImportPreview() {
    if (!isUrlValid) return

    isImporting = true
    try {
      const data = await api.fetchFacebookProfile(facebookUrl)
      importedData = data

      // Populate editable fields with imported data
      editableFirstName = data.firstName || ''
      editableLastName = data.lastName || ''
      editableGender = data.gender || ''
      editableBirthDate = data.birthDate || ''
      editablePhotoUrl = data.photoUrl || ''

    } catch (err) {
      // Issue #87: Activate fallback mode for manual entry
      activateFallbackMode(err.message)
    } finally {
      isImporting = false
    }
  }

  /**
   * Creates person and relationship atomically
   * Issue #87: Saves facebookUrl as metadata for future reference
   * Issue #88: Uses bidirectional relationship handling utilities
   * Works in both normal mode (successful import) and fallback mode (manual entry)
   */
  async function handleCreateAndAdd() {
    if (!importedData || !focusPerson) return

    // Validate relationship data before proceeding
    const validation = validateRelationshipData({
      relationshipType,
      focusPersonId: focusPerson.id,
      newPersonId: 999, // Temporary ID for validation
      focusPersonGender: focusPerson.gender,
      selectedParentRole
    })

    if (!validation.valid) {
      errorNotification(validation.error)
      return
    }

    // Prepare person data from editable fields
    const personData = {
      firstName: editableFirstName,
      lastName: editableLastName,
      gender: editableGender,
      birthDate: editableBirthDate
    }

    // Only include photoUrl if it has a value
    if (editablePhotoUrl) {
      personData.photoUrl = editablePhotoUrl
    }

    // Issue #87: Save attempted Facebook URL as metadata
    // This preserves the URL regardless of import success/failure
    // Useful for future re-sync attempts or reference
    if (facebookUrl && facebookUrl.trim()) {
      personData.facebookUrl = facebookUrl.trim()
    }

    let createdPersonId = null

    try {
      // Step 1: Create person using action creator (updates store optimistically)
      const createdPerson = await createPerson(personData)
      createdPersonId = createdPerson.id

      // Step 2: Build relationship payloads using utility function (Issue #88)
      // This handles bidirectional spouse relationships and proper person1/person2 ordering
      const relationshipPayloads = buildRelationshipPayloads({
        relationshipType,
        focusPersonId: focusPerson.id,
        newPersonId: createdPerson.id,
        focusPersonGender: focusPerson.gender,
        selectedParentRole
      })

      // Step 3: Create all relationships (1 for parent/child, 2 for spouse)
      for (const relationshipData of relationshipPayloads) {
        await createRelationship(relationshipData)
      }

      // Success!
      successNotification(`${editableFirstName} ${editableLastName} added as ${relationshipOptions.find(o => o.value === relationshipType)?.label}`)

      // Close this modal
      closeModal()

      // Refresh the PersonModal if it's still open
      if ($modal.isOpen && $modal.personId === focusPerson.id) {
        // The modal will automatically update due to reactive stores
      }
    } catch (err) {
      // Rollback: Delete person if relationship creation failed
      if (createdPersonId) {
        try {
          await deletePerson(createdPersonId)
        } catch (rollbackErr) {
          console.error('Failed to rollback person creation:', rollbackErr)
        }
      }
      errorNotification('Failed to create person and relationship: ' + err.message)
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <div class="modal-backdrop" role="presentation" on:click={handleBackdropClick} data-testid="smart-relationship-modal">
    <div class="modal-content" role="dialog" aria-modal="true" on:click|stopPropagation>
      <button class="close-button" on:click={closeModal} aria-label="Close modal">
        &times;
      </button>

      <h2>Add Family Member for {focusPersonName}</h2>

      <div class="form-section">
        <!-- Relationship Type Selector -->
        <div class="form-group">
          <label for="relationship-type">Relationship Type</label>
          <select id="relationship-type" bind:value={relationshipType} aria-label="Relationship Type">
            {#each relationshipOptions as option}
              <option value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            {/each}
          </select>
        </div>

        <!-- Facebook URL Input -->
        <div class="form-group">
          <label for="facebook-url">Facebook URL</label>
          <div class="input-with-validation">
            <input
              id="facebook-url"
              type="text"
              bind:value={facebookUrl}
              placeholder="Paste Facebook profile URL, username, or ID"
              aria-label="Facebook URL"
            />
            {#if showValidation}
              {#if isUrlValid}
                <span class="validation-icon valid" data-testid="url-valid-icon" aria-label="Valid URL">✓</span>
              {:else}
                <span class="validation-icon invalid" data-testid="url-invalid-icon" aria-label="Invalid URL">✗</span>
              {/if}
            {/if}
          </div>
          <p class="hint">Paste any Facebook profile URL, username, or ID</p>
        </div>

        <!-- Import & Preview Button -->
        {#if !importedData}
          <button
            class="import-button"
            on:click={handleImportPreview}
            disabled={!isUrlValid || isImporting}
          >
            {#if isImporting}
              <span data-testid="loading-spinner">Loading...</span>
            {:else}
              Import & Preview
            {/if}
          </button>
        {/if}
      </div>

      <!-- Preview Section (shown after import or in fallback mode) -->
      {#if importedData}
        <div class="preview-section">
          {#if fallbackMode}
            <!-- Fallback mode: Show helpful message -->
            <div class="fallback-message">
              <h3>We couldn't import this profile</h3>
              <p>Please enter the information manually below.</p>
            </div>
          {:else}
            <!-- Normal preview mode -->
            <h3>Preview</h3>

            {#if editablePhotoUrl}
              <div class="photo-preview">
                <img src={editablePhotoUrl} alt="{editableFirstName} {editableLastName}" />
              </div>
            {/if}

            <div class="preview-info">
              <p><strong>Full Name:</strong> {editableFirstName} {editableLastName}</p>
              {#if editableGender}
                <p><strong>Gender:</strong> {editableGender.charAt(0).toUpperCase() + editableGender.slice(1)}</p>
              {/if}
              {#if editableBirthDate}
                <p><strong>Birth Date:</strong> {editableBirthDate}</p>
              {/if}
              <p class="relationship-preview"><strong>{relationshipPreview}</strong></p>
            </div>
          {/if}

          <!-- Parent Role Selection (for ambiguous gender when adding child) -->
          {#if needsRoleSelection}
            <div class="parent-role-selection">
              <h4>Select Parent Role</h4>
              <p class="role-hint">Since the parent's gender is not specified, please select their role:</p>
              <div class="role-buttons">
                <button
                  class="role-button"
                  class:selected={selectedParentRole === 'mother'}
                  on:click={() => selectedParentRole = 'mother'}
                  aria-label="Select Mother role"
                >
                  Mother
                </button>
                <button
                  class="role-button"
                  class:selected={selectedParentRole === 'father'}
                  on:click={() => selectedParentRole = 'father'}
                  aria-label="Select Father role"
                >
                  Father
                </button>
              </div>
            </div>
          {/if}

          <!-- Editable Fields (shown in both normal and fallback mode) -->
          <div class="editable-fields">
            <h4>{fallbackMode ? 'Enter Details' : 'Edit Details (Optional)'}</h4>

            <div class="form-group">
              <label for="edit-first-name">First Name</label>
              <input
                id="edit-first-name"
                type="text"
                bind:value={editableFirstName}
                aria-label="First Name"
              />
            </div>

            <div class="form-group">
              <label for="edit-last-name">Last Name</label>
              <input
                id="edit-last-name"
                type="text"
                bind:value={editableLastName}
                aria-label="Last Name"
              />
            </div>

            <div class="form-group">
              <label for="edit-gender">Gender</label>
              <select id="edit-gender" bind:value={editableGender} aria-label="Gender">
                <option value="">Unspecified</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div class="form-group">
              <label for="edit-birth-date">Birth Date</label>
              <input
                id="edit-birth-date"
                type="date"
                bind:value={editableBirthDate}
                aria-label="Birth Date"
              />
            </div>
          </div>
        </div>

        <!-- Create & Add to Tree Button -->
        <div class="action-buttons">
          <button class="create-button" on:click={handleCreateAndAdd}>
            Create & Add to Tree
          </button>
          <button class="cancel-button" on:click={closeModal}>
            Cancel
          </button>
        </div>
      {:else}
        <!-- Cancel Button (before import) -->
        <div class="action-buttons">
          <button class="cancel-button" on:click={closeModal}>
            Cancel
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000; /* Higher than PersonModal (1000) for stacked modals */
    padding: 1rem;
  }

  .modal-content {
    background: white;
    border-radius: 8px;
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    padding: 2rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .close-button {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: #999;
    line-height: 1;
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-button:hover {
    color: #333;
  }

  h2 {
    margin: 0 0 1.5rem 0;
    font-size: 1.5rem;
    color: #333;
  }

  h3 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    color: #333;
  }

  h4 {
    margin: 1.5rem 0 1rem 0;
    font-size: 1rem;
    color: #555;
  }

  .form-section {
    margin-bottom: 2rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #555;
  }

  input[type="text"],
  input[type="date"],
  select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
    box-sizing: border-box;
  }

  input:focus,
  select:focus {
    outline: 2px solid #4CAF50;
    outline-offset: 2px;
    border-color: #4CAF50;
  }

  .input-with-validation {
    position: relative;
    display: flex;
    align-items: center;
  }

  .validation-icon {
    position: absolute;
    right: 0.75rem;
    font-size: 1.25rem;
    font-weight: bold;
  }

  .validation-icon.valid {
    color: #4CAF50;
  }

  .validation-icon.invalid {
    color: #f44336;
  }

  .hint {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: #999;
    font-style: italic;
  }

  .import-button {
    width: 100%;
    padding: 0.75rem 1.5rem;
    background-color: #1877f2;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .import-button:hover:not(:disabled) {
    background-color: #166fe5;
  }

  .import-button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }

  .preview-section {
    padding: 1.5rem;
    background: #f9f9f9;
    border-radius: 4px;
    margin-bottom: 1.5rem;
  }

  .fallback-message {
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 4px;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .fallback-message h3 {
    color: #856404;
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
  }

  .fallback-message p {
    color: #856404;
    margin: 0;
    font-size: 0.95rem;
  }

  .photo-preview {
    text-align: center;
    margin-bottom: 1rem;
  }

  .photo-preview img {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #ddd;
  }

  .preview-info p {
    margin: 0.5rem 0;
    color: #555;
  }

  .relationship-preview {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #ddd;
    color: #1877f2 !important;
    font-size: 1.05rem;
  }

  .parent-role-selection {
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 4px;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .parent-role-selection h4 {
    color: #856404;
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
  }

  .role-hint {
    color: #856404;
    margin: 0 0 1rem 0;
    font-size: 0.95rem;
  }

  .role-buttons {
    display: flex;
    gap: 1rem;
  }

  .role-button {
    flex: 1;
    padding: 0.75rem 1rem;
    border: 2px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 600;
    transition: all 0.2s;
  }

  .role-button:hover {
    border-color: #4CAF50;
    background: #f0f8f0;
  }

  .role-button.selected {
    border-color: #4CAF50;
    background: #4CAF50;
    color: white;
  }

  .editable-fields {
    margin-top: 1.5rem;
  }

  .action-buttons {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  .create-button,
  .cancel-button {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .create-button {
    background-color: #4CAF50;
    color: white;
  }

  .create-button:hover {
    background-color: #45a049;
  }

  .cancel-button {
    background-color: #f5f5f5;
    color: #333;
  }

  .cancel-button:hover {
    background-color: #e0e0e0;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .modal-content {
      padding: 1.5rem;
    }

    h2 {
      font-size: 1.25rem;
    }

    .action-buttons {
      flex-direction: column;
    }

    .create-button,
    .cancel-button {
      width: 100%;
    }
  }
</style>
