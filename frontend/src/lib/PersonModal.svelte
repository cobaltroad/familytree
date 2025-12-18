<script>
  import { createEventDispatcher } from 'svelte'
  import PersonForm from './PersonForm.svelte'

  export let person = null
  export let isOpen = false

  const dispatch = createEventDispatcher()

  function closeModal() {
    dispatch('close')
  }

  function handleSubmit(event) {
    dispatch('submit', event.detail)
    closeModal()
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
      <PersonForm {person} on:submit={handleSubmit} />
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

  @media (max-width: 768px) {
    .modal-content {
      max-width: 100%;
      max-height: 100vh;
      border-radius: 0;
    }
  }
</style>
