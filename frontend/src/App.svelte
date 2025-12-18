<script>
  import { onMount } from 'svelte'
  import { api } from './lib/api'
  import ListView from './lib/ListView.svelte'
  import TreeView from './lib/TreeView.svelte'
  import PersonModal from './lib/PersonModal.svelte'

  let people = []
  let relationships = []
  let loading = false
  let error = null
  let editingPerson = null
  let isModalOpen = false
  let currentPath = window.location.hash.slice(1) || '/'

  // Handle route changes
  function handleHashChange() {
    currentPath = window.location.hash.slice(1) || '/'
  }

  onMount(() => {
    loadData()
    window.addEventListener('hashchange', handleHashChange)
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
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
      const personData = event.detail

      if (personData.id) {
        // Update existing person
        const updatedPerson = await api.updatePerson(personData.id, personData)
        people = people.map(p => p.id === updatedPerson.id ? updatedPerson : p)
        editingPerson = null
      } else {
        // Create new person
        const newPerson = await api.createPerson(personData)
        people = [...people, newPerson]
      }
    } catch (err) {
      alert('Failed to save person: ' + err.message)
    }
  }

  function handleEditPerson(event) {
    editingPerson = event.detail
    isModalOpen = true
  }

  function handleOpenAddPersonModal() {
    editingPerson = null
    isModalOpen = true
  }

  function handleModalClose() {
    isModalOpen = false
    editingPerson = null
  }

  async function handleModalSubmit(event) {
    await handleAddPerson(event)
    handleModalClose()
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
  <h1>Family Tree</h1>

  {#if currentPath === '/list'}
    <ListView
      {people}
      {relationships}
      {loading}
      {error}
      editingPerson={editingPerson}
      onRetry={loadData}
      on:addPerson={handleAddPerson}
      on:deletePerson={handleDeletePerson}
      on:addRelationship={handleAddRelationship}
      on:deleteRelationship={handleDeleteRelationship}
    />
  {:else}
    <TreeView
      {people}
      {relationships}
      on:editPerson={handleEditPerson}
      on:addPerson={handleOpenAddPersonModal}
    />
  {/if}

  <PersonModal
    person={editingPerson}
    {people}
    {relationships}
    isOpen={isModalOpen}
    on:close={handleModalClose}
    on:submit={handleModalSubmit}
    on:delete={handleDeletePerson}
  />
</main>

<style>
  main {
    width: 100%;
  }
</style>
