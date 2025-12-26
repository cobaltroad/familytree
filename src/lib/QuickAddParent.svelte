<script>
  import { createEventDispatcher, onMount } from 'svelte'
  import { determineChildGender, prepareParentFormData } from './quickAddParentUtils.js'
  import { error as errorNotification } from '../stores/notificationStore.js'

  export let child = null
  export let parentType = '' // 'mother' or 'father'
  export let onCancel = null

  const dispatch = createEventDispatcher()

  // Determine gender automatically based on parent type
  let autoGender = determineChildGender(parentType)

  // Pre-fill form data with child's last name
  let formData = prepareParentFormData(child)

  // Set gender to auto-determined value
  if (autoGender) {
    formData.gender = autoGender
  }

  let isAlive = true
  let firstNameInput

  // Focus on first name field when component mounts
  onMount(() => {
    if (firstNameInput) {
      firstNameInput.focus()
    }
  })

  $: if (isAlive) {
    formData.deathDate = ''
  }

  // Computed display name for parent type
  $: parentTypeDisplay = parentType === 'mother' ? 'Mother' : 'Father'

  function handleSubmit() {
    const parentData = {
      ...formData,
      birthDate: formData.birthDate || null,
      deathDate: formData.deathDate || null,
      gender: formData.gender || null
    }

    dispatch('submit', {
      parentData,
      childId: child.id,
      parentType: parentType
    })
  }

  function handleCancel() {
    if (onCancel) {
      onCancel()
    } else {
      dispatch('cancel')
    }
  }
</script>

<div class="quick-add-parent">
  <h3>Add {parentTypeDisplay} for {child?.firstName} {child?.lastName}</h3>

  <form on:submit|preventDefault={handleSubmit}>
    <div class="form-group">
      <label for="parent-firstName">First Name *</label>
      <input
        id="parent-firstName"
        type="text"
        bind:value={formData.firstName}
        bind:this={firstNameInput}
        required
      />
    </div>

    <div class="form-group">
      <label for="parent-lastName">Last Name *</label>
      <input
        id="parent-lastName"
        type="text"
        bind:value={formData.lastName}
        required
      />
    </div>

    <div class="form-group">
      <label>Gender</label>
      <div class="radio-group">
        <label class="radio-label">
          <input
            type="radio"
            name="parent-gender"
            value="female"
            checked={formData.gender === 'female'}
            on:change={() => formData.gender = 'female'}
          />
          female
        </label>
        <label class="radio-label">
          <input
            type="radio"
            name="parent-gender"
            value="male"
            checked={formData.gender === 'male'}
            on:change={() => formData.gender = 'male'}
          />
          male
        </label>
        <label class="radio-label">
          <input
            type="radio"
            name="parent-gender"
            value="other"
            checked={formData.gender === 'other'}
            on:change={() => formData.gender = 'other'}
          />
          other
        </label>
        <label class="radio-label">
          <input
            type="radio"
            name="parent-gender"
            value=""
            checked={formData.gender === ''}
            on:change={() => formData.gender = ''}
          />
          unspecified
        </label>
      </div>
    </div>

    <div class="form-group">
      <label for="parent-birthDate">Birth Date</label>
      <input
        id="parent-birthDate"
        type="date"
        bind:value={formData.birthDate}
      />
    </div>

    <div class="form-group">
      <label>
        <input
          type="checkbox"
          bind:checked={isAlive}
        />
        Still Alive
      </label>
    </div>

    {#if !isAlive}
      <div class="form-group">
        <label for="parent-deathDate">Death Date</label>
        <input
          id="parent-deathDate"
          type="date"
          bind:value={formData.deathDate}
        />
      </div>
    {/if}

    <div class="button-group">
      <button type="submit" class="add-button" data-testid="quick-add-parent-submit">
        Add {parentTypeDisplay}
      </button>
      <button type="button" class="cancel-button" data-testid="quick-add-parent-cancel" on:click={handleCancel}>
        Cancel
      </button>
    </div>
  </form>
</div>

<style>
  .quick-add-parent {
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background-color: #f9f9f9;
    margin-top: 1rem;
  }

  .quick-add-parent h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #333;
    font-size: 1.1rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.25rem;
    font-weight: 500;
    color: #555;
  }

  .form-group input[type="text"],
  .form-group input[type="date"] {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }

  .radio-group {
    display: flex;
    gap: 1.5rem;
    margin-top: 0.5rem;
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-weight: normal;
  }

  .radio-label:has(input[type="radio"]:checked) {
    font-weight: bold;
  }

  .radio-label input[type="radio"] {
    cursor: pointer;
  }

  .button-group {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }

  .add-button {
    background-color: #4CAF50;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.2s;
  }

  .add-button:hover {
    background-color: #45a049;
  }

  .cancel-button {
    background-color: #757575;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.2s;
  }

  .cancel-button:hover {
    background-color: #616161;
  }
</style>
