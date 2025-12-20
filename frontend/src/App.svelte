<script>
  import { onMount } from 'svelte'
  import { api } from './lib/api'
  import { addChildWithRelationship } from './lib/quickAddChildUtils.js'
  import ListView from './lib/ListView.svelte'
  import TreeView from './lib/TreeView.svelte'
  import TimelineView from './lib/TimelineView.svelte'
  import PedigreeView from './lib/PedigreeView.svelte'
  import RadialView from './lib/RadialView.svelte'
  import ViewSwitcher from './lib/ViewSwitcher.svelte'
  import PersonModal from './lib/PersonModal.svelte'
  import Notification from './lib/components/Notification.svelte'
  import * as familyStore from './stores/familyStore.js'
  import { success, error as errorNotification } from './stores/notificationStore.js'

  let people = []
  let relationships = []
  let loading = false
  let error = null

  // Sync local state with stores (Phase 1.1: backward compatible approach)
  // This allows components to gradually migrate to using stores
  $: familyStore.people.set(people)
  $: familyStore.relationships.set(relationships)
  $: familyStore.loading.set(loading)
  $: familyStore.error.set(error)

  // Expose stores to DevTools in development mode
  if (import.meta.env.DEV) {
    if (!window.__SVELTE_STORES__) {
      window.__SVELTE_STORES__ = {}
    }
    window.__SVELTE_STORES__.familyStore = familyStore
  }
  let editingPerson = null
  let isModalOpen = false
  let modalKey = 0 // Key to force modal component recreation
  let currentPath = window.location.hash.slice(1) || '/'
  let successMessage = null
  let successTimeout = null

  // Normalize path (treat '/' as '/tree')
  $: normalizedPath = currentPath === '/' ? '/tree' : currentPath

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
      errorNotification('Failed to save person: ' + err.message)
    }
  }

  function handleEditPerson(event) {
    editingPerson = event.detail
    isModalOpen = true
    modalKey += 1 // Increment key to force component recreation
  }

  function handleOpenAddPersonModal() {
    editingPerson = null
    isModalOpen = true
    modalKey += 1 // Increment key to force component recreation
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
      errorNotification('Failed to delete person: ' + err.message)
    }
  }

  async function handleAddRelationship(event) {
    try {
      const newRel = await api.createRelationship(event.detail)
      relationships = [...relationships, newRel]
    } catch (err) {
      errorNotification('Failed to add relationship: ' + err.message)
    }
  }

  async function handleDeleteRelationship(event) {
    const id = event.detail
    try {
      await api.deleteRelationship(id)
      relationships = relationships.filter(r => r.id !== id)
    } catch (err) {
      errorNotification('Failed to delete relationship: ' + err.message)
    }
  }

  async function handleAddChild(event) {
    const { childData, parentId, parentRole } = event.detail

    try {
      const result = await addChildWithRelationship(api, childData, parentId, parentRole)

      if (result.success) {
        // Update state with new person and relationship
        people = [...people, result.person]
        relationships = [...relationships, result.relationship]

        // Show success notification
        showSuccessMessage(`Child ${result.person.firstName} ${result.person.lastName} added successfully!`)

        // Update the editing person to reflect new data (refresh modal)
        // This ensures the children list updates in the modal
        editingPerson = people.find(p => p.id === parentId)
        modalKey += 1 // Force modal refresh
      } else {
        errorNotification('Failed to add child: ' + result.error)
      }
    } catch (err) {
      errorNotification('Failed to add child: ' + err.message)
    }
  }

  function showSuccessMessage(message) {
    // Clear any existing timeout
    if (successTimeout) {
      clearTimeout(successTimeout)
    }

    successMessage = message

    // Auto-hide after 3 seconds
    successTimeout = setTimeout(() => {
      successMessage = null
    }, 3000)
  }
</script>

<main>
  <h1>Family Tree</h1>

  <!-- Toast Notifications -->
  <Notification />

  <!-- Success notification -->
  {#if successMessage}
    <div class="success-notification">
      {successMessage}
    </div>
  {/if}

  <!-- Only show ViewSwitcher when not in list view -->
  {#if normalizedPath !== '/list'}
    <ViewSwitcher currentPath={normalizedPath} />
  {/if}

  {#if normalizedPath === '/list'}
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
  {:else if normalizedPath === '/tree'}
    <TreeView
      {people}
      {relationships}
      on:editPerson={handleEditPerson}
      on:addPerson={handleOpenAddPersonModal}
    />
  {:else if normalizedPath === '/timeline'}
    <TimelineView
      {people}
      {relationships}
      on:editPerson={handleEditPerson}
      on:addPerson={handleOpenAddPersonModal}
    />
  {:else if normalizedPath === '/pedigree'}
    <PedigreeView
      {people}
      {relationships}
      on:editPerson={handleEditPerson}
      on:addPerson={handleOpenAddPersonModal}
    />
  {:else if normalizedPath === '/radial'}
    <RadialView
      {people}
      {relationships}
      on:editPerson={handleEditPerson}
      on:addPerson={handleOpenAddPersonModal}
    />
  {:else}
    <!-- Default to tree view for unknown routes -->
    <TreeView
      {people}
      {relationships}
      on:editPerson={handleEditPerson}
      on:addPerson={handleOpenAddPersonModal}
    />
  {/if}

  {#key modalKey}
    <PersonModal
      person={editingPerson}
      {people}
      {relationships}
      isOpen={isModalOpen}
      on:close={handleModalClose}
      on:submit={handleModalSubmit}
      on:delete={handleDeletePerson}
      on:addChild={handleAddChild}
    />
  {/key}
</main>

<style>
  main {
    width: 100%;
  }

  .success-notification {
    position: fixed;
    top: 80px;
    right: 20px;
    background-color: #4CAF50;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 4px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
    z-index: 2000;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
</style>
