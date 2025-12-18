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
    <div style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
      <select bind:value={formData.person1Id} required>
        <option value="">Select person...</option>
        {#each people as person}
          <option value={person.id}>{person.firstName} {person.lastName}</option>
        {/each}
      </select>

      <span>is the</span>

      <select bind:value={formData.type} required>
        <option value="">relationship...</option>
        <option value="mother">mother</option>
        <option value="father">father</option>
        <option value="spouse">spouse</option>
      </select>

      <span>of</span>

      <select bind:value={formData.person2Id} required>
        <option value="">Select person...</option>
        {#each people as person}
          <option value={person.id}>{person.firstName} {person.lastName}</option>
        {/each}
      </select>
    </div>

    <button type="submit" class="primary">Add Relationship</button>
  </form>
</div>
