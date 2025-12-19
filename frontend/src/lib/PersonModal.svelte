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

  function handleAddChild(event) {
    dispatch('addChild', event.detail)
    // Note: We don't close the modal here - it stays open to show the new child
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
      <PersonForm {person} {people} {relationships} on:submit={handleSubmit} on:addChild={handleAddChild} />
      <div class="button-section">
        <button type="submit" form="person-form" class="update-button">
          {person ? 'Update' : 'Add'} Person
        </button>
        {#if person}
          <button class="delete-button" on:click={handleDelete}>
            Delete Person
          </button>
        {/if}
      </div>
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
    position: sticky;
    top: 0;
    float: right;
    background: white;
    border: none;
    font-size: 2rem;
    line-height: 1;
    cursor: pointer;
    color: #666;
    padding: 0.5rem;
    z-index: 10;
    margin: 0.5rem 0.5rem 0 0;
    border-radius: 4px;
  }

  .close-button:hover {
    color: #333;
    background: #f5f5f5;
  }

  .button-section {
    padding: 1rem;
    border-top: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  .update-button {
    background-color: #4CAF50;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.2s;
  }

  .update-button:hover {
    background-color: #45a049;
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
