<script>
  import { createEventDispatcher, onMount } from 'svelte'
  import { determineParentRole, prepareChildFormData } from './quickAddChildUtils.js'
  import { error as errorNotification } from '../stores/notificationStore.js'

  export let parent = null
  export let onCancel = null

  const dispatch = createEventDispatcher()

  // Determine parent role automatically based on gender
  let autoParentRole = determineParentRole(parent?.gender)
  let selectedParentRole = autoParentRole || '' // Empty if user needs to select

  // Pre-fill form data with parent's last name
  let formData = prepareChildFormData(parent)
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

  function handleSubmit() {
    // Validate that parent role is selected (if it wasn't auto-determined)
    if (!selectedParentRole) {
      errorNotification('Please select parent role (Mother or Father)')
      return
    }

    const childData = {
      ...formData,
      birthDate: formData.birthDate || null,
      deathDate: formData.deathDate || null,
      gender: formData.gender || null
    }

    dispatch('submit', {
      childData,
      parentId: parent.id,
      parentRole: selectedParentRole
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

<div class="quick-add-child">
  <h3>Add Child for {parent?.firstName} {parent?.lastName}</h3>

  <form on:submit|preventDefault={handleSubmit}>
    <!-- Parent Role Selection (only shown if gender is 'other' or unspecified) -->
    {#if !autoParentRole}
      <div class="form-group">
        <label>Parent Role *</label>
        <div class="radio-group">
          <label class="radio-label">
            <input
              type="radio"
              name="parentRole"
              value="mother"
              checked={selectedParentRole === 'mother'}
              on:change={() => selectedParentRole = 'mother'}
              required
            />
            Mother
          </label>
          <label class="radio-label">
            <input
              type="radio"
              name="parentRole"
              value="father"
              checked={selectedParentRole === 'father'}
              on:change={() => selectedParentRole = 'father'}
              required
            />
            Father
          </label>
        </div>
      </div>
    {:else}
      <div class="auto-role-notice">
        This child will be added as <strong>{autoParentRole === 'mother' ? 'Mother' : 'Father'}</strong>
      </div>
    {/if}

    <div class="form-group">
      <label for="child-firstName">First Name *</label>
      <input
        id="child-firstName"
        type="text"
        bind:value={formData.firstName}
        bind:this={firstNameInput}
        required
      />
    </div>

    <div class="form-group">
      <label for="child-lastName">Last Name *</label>
      <input
        id="child-lastName"
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
            name="child-gender"
            value="female"
            checked={formData.gender === 'female'}
            on:change={() => formData.gender = 'female'}
          />
          female
        </label>
        <label class="radio-label">
          <input
            type="radio"
            name="child-gender"
            value="male"
            checked={formData.gender === 'male'}
            on:change={() => formData.gender = 'male'}
          />
          male
        </label>
        <label class="radio-label">
          <input
            type="radio"
            name="child-gender"
            value="other"
            checked={formData.gender === 'other'}
            on:change={() => formData.gender = 'other'}
          />
          other
        </label>
        <label class="radio-label">
          <input
            type="radio"
            name="child-gender"
            value=""
            checked={formData.gender === ''}
            on:change={() => formData.gender = ''}
          />
          unspecified
        </label>
      </div>
    </div>

    <div class="form-group">
      <label for="child-birthDate">Birth Date</label>
      <input
        id="child-birthDate"
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
        <label for="child-deathDate">Death Date</label>
        <input
          id="child-deathDate"
          type="date"
          bind:value={formData.deathDate}
        />
      </div>
    {/if}

    <div class="button-group">
      <button type="submit" class="add-button">
        Add Child
      </button>
      <button type="button" class="cancel-button" on:click={handleCancel}>
        Cancel
      </button>
    </div>
  </form>
</div>

<style>
  .quick-add-child {
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background-color: #f9f9f9;
    margin-top: 1rem;
  }

  .quick-add-child h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #333;
    font-size: 1.1rem;
  }

  .auto-role-notice {
    padding: 0.75rem;
    background-color: #e3f2fd;
    border-left: 4px solid #2196f3;
    margin-bottom: 1rem;
    font-size: 0.9rem;
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
