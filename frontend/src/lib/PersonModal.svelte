<script>
  import { createEventDispatcher } from 'svelte'
  import PersonForm from './PersonForm.svelte'

  export let person = null
  export let people = []
  export let relationships = []
  export let isOpen = false

  const dispatch = createEventDispatcher()

  function closeModal() {
    dispatch('close')
  }

  function handleSubmit(event) {
    dispatch('submit', event.detail)
    closeModal()
  }

  function handleDelete() {
    if (person && confirm(`Are you sure you want to delete ${person.firstName} ${person.lastName}?`)) {
      dispatch('delete', person.id)
      closeModal()
    }
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal()
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      closeModal()
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick}>
    <div class="modal-content">
      <button class="close-button" on:click={closeModal} aria-label="Close modal">
        &times;
      </button>
      <PersonForm {person} {people} {relationships} on:submit={handleSubmit} />
      {#if person}
        <div class="delete-section">
          <button class="delete-button" on:click={handleDelete}>
            Delete Person
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background: white;
    border-radius: 8px;
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .close-button {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: none;
    border: none;
    font-size: 2rem;
    line-height: 1;
    cursor: pointer;
    color: #666;
    padding: 0.25rem 0.5rem;
    z-index: 1;
  }

  .close-button:hover {
    color: #333;
  }

  .delete-section {
    padding: 1rem;
    border-top: 1px solid #e0e0e0;
    display: flex;
    justify-content: center;
  }

  .delete-button {
    background-color: #dc3545;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.2s;
  }

  .delete-button:hover {
    background-color: #c82333;
  }

  @media (max-width: 768px) {
    .modal-content {
      max-width: 100%;
      max-height: 100vh;
      border-radius: 0;
    }
  }
</style>
