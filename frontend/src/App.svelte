<script>
  import { onMount } from 'svelte'
  import { api } from './lib/api'
  import PersonForm from './lib/PersonForm.svelte'
  import PersonList from './lib/PersonList.svelte'
  import RelationshipForm from './lib/RelationshipForm.svelte'

  let people = []
  let relationships = []
  let loading = false
  let error = null

  onMount(() => {
    loadData()
  })

  async function loadData() {
    loading = true
    error = null
    try {
      const [peopleData, relationshipsData] = await Promise.all([
        api.getAllPeople(),
        api.getAllRelationships()
      ])
      people = peopleData || []
      relationships = relationshipsData || []
    } catch (err) {
      error = err.message
      console.error('Failed to load data:', err)
    } finally {
      loading = false
    }
  }

  async function handleAddPerson(event) {
    try {
      const newPerson = await api.createPerson(event.detail)
      people = [...people, newPerson]
    } catch (err) {
      alert('Failed to add person: ' + err.message)
    }
  }

  async function handleDeletePerson(event) {
    const id = event.detail
    if (!confirm('Are you sure you want to delete this person?')) return

    try {
      await api.deletePerson(id)
      people = people.filter(p => p.id !== id)
      relationships = relationships.filter(r =>
        r.person1Id !== id && r.person2Id !== id
      )
    } catch (err) {
      alert('Failed to delete person: ' + err.message)
    }
  }

  async function handleAddRelationship(event) {
    try {
      const newRel = await api.createRelationship(event.detail)
      relationships = [...relationships, newRel]
    } catch (err) {
      alert('Failed to add relationship: ' + err.message)
    }
  }

  async function handleDeleteRelationship(event) {
    const id = event.detail
    try {
      await api.deleteRelationship(id)
      relationships = relationships.filter(r => r.id !== id)
    } catch (err) {
      alert('Failed to delete relationship: ' + err.message)
    }
  }
</script>

<main>
  <h1>FamilyTree</h1>

  {#if error}
    <div class="card" style="background-color: #dc3545; color: white;">
      <p><strong>Error:</strong> {error}</p>
      <p>Make sure the backend server is running on http://localhost:8080</p>
      <button on:click={loadData}>Retry</button>
    </div>
  {/if}

  {#if loading}
    <p>Loading...</p>
  {:else}
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
      <PersonForm on:submit={handleAddPerson} />
      <RelationshipForm {people} on:submit={handleAddRelationship} />
    </div>

    <PersonList
      {people}
      {relationships}
      on:delete={handleDeletePerson}
      on:deleteRelationship={handleDeleteRelationship}
    />
  {/if}
</main>

<style>
  main {
    width: 100%;
  }

  @media (max-width: 768px) {
    main > div {
      grid-template-columns: 1fr !important;
    }
  }
</style>
