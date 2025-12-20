<script>
  import PersonForm from './PersonForm.svelte'
  import PersonList from './PersonList.svelte'
  import RelationshipForm from './RelationshipForm.svelte'
  import { people, relationships, loading, error } from '../stores/familyStore.js'

  export let editingPerson = null
</script>

{#if $error}
  <div class="card" style="background-color: #dc3545; color: white;">
    <p><strong>Error:</strong> {$error}</p>
    <p>Make sure the backend server is running on http://localhost:8080</p>
  </div>
{/if}

{#if $loading}
  <p>Loading...</p>
{:else}
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
    <PersonForm
      person={editingPerson}
    />
    <RelationshipForm />
  </div>

  <PersonList />
{/if}

<style>
  @media (max-width: 768px) {
    div {
      grid-template-columns: 1fr !important;
    }
  }
</style>
