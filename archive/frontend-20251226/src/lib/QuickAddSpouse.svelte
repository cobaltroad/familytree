<script>
  import { createEventDispatcher, onMount } from 'svelte'
  import { prepareSpouseFormData } from './quickAddSpouseUtils.js'

  export let person = null
  export let onCancel = null

  const dispatch = createEventDispatcher()

  // Pre-fill form data with person's last name
  let formData = prepareSpouseFormData(person)
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
    const spouseData = {
      ...formData,
      birthDate: formData.birthDate || null,
      deathDate: formData.deathDate || null,
      gender: formData.gender || null
    }

    dispatch('submit', {
      spouseData,
      personId: person.id
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

<div class="quick-add-spouse">
  <h3>Add Spouse for {person?.firstName} {person?.lastName}</h3>

  <form on:submit|preventDefault={handleSubmit}>
    <div class="form-group">
      <label for="spouse-firstName">First Name *</label>
      <input
        id="spouse-firstName"
        type="text"
        bind:value={formData.firstName}
        bind:this={firstNameInput}
        required
      />
    </div>

    <div class="form-group">
      <label for="spouse-lastName">Last Name *</label>
      <input
        id="spouse-lastName"
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
            name="spouse-gender"
            value="female"
            checked={formData.gender === 'female'}
            on:change={() => formData.gender = 'female'}
          />
          female
        </label>
        <label class="radio-label">
          <input
            type="radio"
            name="spouse-gender"
            value="male"
            checked={formData.gender === 'male'}
            on:change={() => formData.gender = 'male'}
          />
          male
        </label>
        <label class="radio-label">
          <input
            type="radio"
            name="spouse-gender"
            value="other"
            checked={formData.gender === 'other'}
            on:change={() => formData.gender = 'other'}
          />
          other
        </label>
        <label class="radio-label">
          <input
            type="radio"
            name="spouse-gender"
            value=""
            checked={formData.gender === ''}
            on:change={() => formData.gender = ''}
          />
          unspecified
        </label>
      </div>
    </div>

    <div class="form-group">
      <label for="spouse-birthDate">Birth Date</label>
      <input
        id="spouse-birthDate"
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
        <label for="spouse-deathDate">Death Date</label>
        <input
          id="spouse-deathDate"
          type="date"
          bind:value={formData.deathDate}
        />
      </div>
    {/if}

    <div class="button-group">
      <button type="submit" class="add-button" data-testid="quick-add-spouse-submit">
        Add Spouse
      </button>
      <button type="button" class="cancel-button" data-testid="quick-add-spouse-cancel" on:click={handleCancel}>
        Cancel
      </button>
    </div>
  </form>
</div>

<style>
  .quick-add-spouse {
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background-color: #f9f9f9;
    margin-top: 1rem;
  }

  .quick-add-spouse h3 {
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
    background-color: #9C27B0;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.2s;
  }

  .add-button:hover {
    background-color: #7B1FA2;
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
