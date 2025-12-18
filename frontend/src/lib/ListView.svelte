<script>
  import { createEventDispatcher } from 'svelte'
  import PersonForm from './PersonForm.svelte'
  import PersonList from './PersonList.svelte'
  import RelationshipForm from './RelationshipForm.svelte'

  export let people = []
  export let relationships = []
  export let loading = false
  export let error = null
  export let editingPerson = null
  export let onRetry = () => {}

  const dispatch = createEventDispatcher()
</script>

{#if error}
  <div class="card" style="background-color: #dc3545; color: white;">
    <p><strong>Error:</strong> {error}</p>
    <p>Make sure the backend server is running on http://localhost:8080</p>
    <button on:click={onRetry}>Retry</button>
  </div>
{/if}

{#if loading}
  <p>Loading...</p>
{:else}
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
    <PersonForm
      person={editingPerson}
      on:submit={(e) => dispatch('addPerson', e.detail)}
    />
    <RelationshipForm {people} on:submit={(e) => dispatch('addRelationship', e.detail)} />
  </div>

  <PersonList
    {people}
    {relationships}
    on:delete={(e) => dispatch('deletePerson', e.detail)}
    on:deleteRelationship={(e) => dispatch('deleteRelationship', e.detail)}
  />
{/if}

<style>
  @media (max-width: 768px) {
    div {
      grid-template-columns: 1fr !important;
    }
  }
</style>
