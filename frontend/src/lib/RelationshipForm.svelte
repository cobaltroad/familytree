<script>
  import { createEventDispatcher } from 'svelte'

  export let people = []

  const dispatch = createEventDispatcher()

  let formData = {
    person1Id: '',
    person2Id: '',
    type: ''
  }

  function handleSubmit() {
    if (!formData.person1Id || !formData.person2Id || !formData.type) {
      alert('Please fill in all fields')
      return
    }

    if (formData.person1Id === formData.person2Id) {
      alert('Cannot create a relationship with the same person')
      return
    }

    dispatch('submit', {
      person1Id: parseInt(formData.person1Id),
      person2Id: parseInt(formData.person2Id),
      type: formData.type
    })

    resetForm()
  }

  function resetForm() {
    formData = {
      person1Id: '',
      person2Id: '',
      type: ''
    }
  }
</script>

<div class="card">
  <h2>Add Relationship</h2>
  <form on:submit|preventDefault={handleSubmit}>
    <div class="form-group">
      <label for="person1">Person 1 *</label>
      <select id="person1" bind:value={formData.person1Id} required>
        <option value="">Select person...</option>
        {#each people as person}
          <option value={person.id}>
            {person.firstName} {person.lastName}
          </option>
        {/each}
      </select>
    </div>

    <div class="form-group">
      <label for="type">Relationship Type *</label>
      <select id="type" bind:value={formData.type} required>
        <option value="">Select type...</option>
        <option value="parent">Parent</option>
        <option value="spouse">Spouse</option>
        <option value="sibling">Sibling</option>
      </select>
    </div>

    <div class="form-group">
      <label for="person2">Person 2 *</label>
      <select id="person2" bind:value={formData.person2Id} required>
        <option value="">Select person...</option>
        {#each people as person}
          <option value={person.id}>
            {person.firstName} {person.lastName}
          </option>
        {/each}
      </select>
    </div>

    <button type="submit" class="primary">Add Relationship</button>
  </form>
</div>
