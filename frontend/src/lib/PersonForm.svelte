<script>
  import { createEventDispatcher } from 'svelte'

  export let person = null

  const dispatch = createEventDispatcher()

  let formData = {
    firstName: person?.firstName || '',
    lastName: person?.lastName || '',
    birthDate: person?.birthDate || '',
    deathDate: person?.deathDate || '',
    gender: person?.gender || ''
  }

  let isAlive = person ? !person.deathDate : true

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
    dispatch('submit', data)
    resetForm()
  }

  function resetForm() {
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
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
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

    <button type="submit" class="primary">
      {person ? 'Update' : 'Add'} Person
    </button>
  </form>
</div>
