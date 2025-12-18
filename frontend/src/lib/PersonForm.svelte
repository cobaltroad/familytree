<script>
  import { createEventDispatcher } from 'svelte'

  export let person = null

  const dispatch = createEventDispatcher()

  let formData = {
    firstName: '',
    lastName: '',
    birthDate: '',
    deathDate: '',
    gender: ''
  }

  let isAlive = true

  // Reactive update when person prop changes
  $: if (person) {
    formData = {
      firstName: person.firstName || '',
      lastName: person.lastName || '',
      birthDate: person.birthDate || '',
      deathDate: person.deathDate || '',
      gender: person.gender || ''
    }
    isAlive = !person.deathDate
  }

  $: if (isAlive) {
    formData.deathDate = ''
  }

  function handleSubmit() {
    const data = {
      ...formData,
      birthDate: formData.birthDate || null,
      deathDate: formData.deathDate || null,
      gender: formData.gender || null
    }

    if (person) {
      // Include ID for update
      dispatch('submit', { ...data, id: person.id })
    } else {
      dispatch('submit', data)
    }

    resetForm()
  }

  function resetForm() {
    if (!person) {
      formData = {
        firstName: '',
        lastName: '',
        birthDate: '',
        deathDate: '',
        gender: ''
      }
      isAlive = true
    }
  }

  export function clearForm() {
    person = null
    formData = {
      firstName: '',
      lastName: '',
      birthDate: '',
      deathDate: '',
      gender: ''
    }
    isAlive = true
  }
</script>

<div class="card">
  <h2>{person ? 'Edit Person' : 'Add New Person'}</h2>
  <form on:submit|preventDefault={handleSubmit}>
    <div class="form-group">
      <label for="firstName">First Name *</label>
      <input
        id="firstName"
        type="text"
        bind:value={formData.firstName}
        required
      />
    </div>

    <div class="form-group">
      <label for="lastName">Last Name *</label>
      <input
        id="lastName"
        type="text"
        bind:value={formData.lastName}
        required
      />
    </div>

    <div class="form-group">
      <label for="gender">Gender</label>
      <select id="gender" bind:value={formData.gender}>
        <option value="">Select...</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
        <option value="Other">Other</option>
      </select>
    </div>

    <div class="form-group">
      <label for="birthDate">Birth Date</label>
      <input
        id="birthDate"
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
        <label for="deathDate">Death Date</label>
        <input
          id="deathDate"
          type="date"
          bind:value={formData.deathDate}
        />
      </div>
    {/if}

    <div style="display: flex; gap: 0.5rem;">
      <button type="submit" class="primary">
        {person ? 'Update' : 'Add'} Person
      </button>
      {#if person}
        <button type="button" on:click={clearForm}>
          Cancel
        </button>
      {/if}
    </div>
  </form>
</div>
