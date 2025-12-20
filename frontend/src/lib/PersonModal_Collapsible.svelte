<script>
  import { createEventDispatcher } from 'svelte'
  import PersonFormFields from './components/PersonFormFields.svelte'
  import CollapsibleSection from './components/CollapsibleSection.svelte'
  import { modal } from '../stores/modalStore.js'
  import { peopleById } from '../stores/derivedStores.js'
  import { createPersonRelationships } from '../stores/derivedStores.js'
  import { createPerson, updatePerson, deletePerson } from '../stores/actions/personActions.js'
  import { error as errorNotification } from '../stores/notificationStore.js'

  const dispatch = createEventDispatcher()
  let formFieldsComponent

  // Get person data from store based on modal state
  $: person = $modal.personId ? $peopleById.get($modal.personId) : null
  $: isEditMode = $modal.mode === 'edit'
  $: isAddMode = $modal.mode === 'add'

  // Get person relationships if in edit mode
  $: personRelStore = person?.id ? createPersonRelationships(person.id) : null
  $: personRelationships = personRelStore ? $personRelStore : {
    mother: null,
    father: null,
    siblings: [],
    children: []
  }

  // Calculate relationship count for section header
  $: relationshipCount = person ? (
    (personRelationships.mother ? 1 : 0) +
    (personRelationships.father ? 1 : 0) +
    personRelationships.siblings.length +
    personRelationships.children.length
  ) : 0

  // Section expanded states
  let personalInfoExpanded = true
  let relationshipsExpanded = true

  // Update expanded states based on mode
  $: if (isEditMode) {
    personalInfoExpanded = true
    relationshipsExpanded = true
  } else if (isAddMode) {
    personalInfoExpanded = true
    relationshipsExpanded = false
  }

  function closeModal() {
    modal.close()
  }

  async function handleSubmit(event) {
    const personData = event.detail

    try {
      if (personData.id) {
        // Update existing person
        await updatePerson(personData.id, personData)
      } else {
        // Create new person
        await createPerson(personData)
      }
      closeModal()
    } catch (err) {
      errorNotification('Failed to save person: ' + err.message)
    }
  }

  async function handleDelete() {
    if (person && confirm(`Are you sure you want to delete ${person.firstName} ${person.lastName}?`)) {
      try {
        await deletePerson(person.id)
        closeModal()
      } catch (err) {
        errorNotification('Failed to delete person: ' + err.message)
      }
    }
  }

  function handleAddChild(event) {
    dispatch('addChild', event.detail)
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

  function handlePersonalInfoToggle(event) {
    personalInfoExpanded = event.detail.expanded
  }

  function handleRelationshipsToggle(event) {
    relationshipsExpanded = event.detail.expanded
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if $modal.isOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick}>
    <div class="modal-content">
      <button class="close-button" on:click={closeModal} aria-label="Close modal">
        &times;
      </button>

      <h2 class="modal-title">{person ? 'Edit Person' : 'Add New Person'}</h2>

      <CollapsibleSection
        title="Personal Information"
        expanded={personalInfoExpanded}
        on:toggle={handlePersonalInfoToggle}
      >
        <PersonFormFields bind:this={formFieldsComponent} {person} on:submit={handleSubmit} />
      </CollapsibleSection>

      {#if person}
        <CollapsibleSection
          title="Relationships"
          count={relationshipCount}
          expanded={relationshipsExpanded}
          on:toggle={handleRelationshipsToggle}
        >
          <div class="relationships-section">
            <div class="relationship-category">
              <h4>Parents</h4>
              <ul class="relationship-list">
                {#if personRelationships.mother}
                  <li>Mother: {personRelationships.mother.firstName} {personRelationships.mother.lastName}</li>
                {:else}
                  <li>Mother: <span class="unknown">&lt;unknown&gt;</span></li>
                {/if}
                {#if personRelationships.father}
                  <li>Father: {personRelationships.father.firstName} {personRelationships.father.lastName}</li>
                {:else}
                  <li>Father: <span class="unknown">&lt;unknown&gt;</span></li>
                {/if}
              </ul>
            </div>

            <div class="relationship-category">
              <h4>Siblings</h4>
              {#if personRelationships.siblings.length > 0}
                <ul class="relationship-list">
                  {#each personRelationships.siblings as sibling}
                    <li>{sibling.firstName} {sibling.lastName}</li>
                  {/each}
                </ul>
              {:else}
                <p class="no-relationships">No siblings</p>
              {/if}
            </div>

            <div class="relationship-category">
              <h4>Children</h4>
              {#if personRelationships.children.length > 0}
                <ul class="relationship-list">
                  {#each personRelationships.children as child}
                    <li>{child.firstName} {child.lastName}</li>
                  {/each}
                </ul>
              {:else}
                <p class="no-relationships">No children</p>
              {/if}
            </div>
          </div>
        </CollapsibleSection>
      {/if}

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

  .modal-title {
    padding: 1rem 1rem 0.5rem 1rem;
    margin: 0;
    font-size: 1.5rem;
    color: #333;
  }

  .relationships-section {
    padding: 0;
  }

  .relationship-category {
    margin-bottom: 1.5rem;
  }

  .relationship-category:last-child {
    margin-bottom: 0;
  }

  .relationship-category h4 {
    margin: 0 0 0.5rem 0;
    color: #555;
    font-size: 0.95rem;
    font-weight: 600;
  }

  .relationship-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .relationship-list li {
    padding: 0.5rem 0;
    margin-bottom: 0.25rem;
    font-size: 0.9rem;
  }

  .unknown {
    color: #999;
    font-style: italic;
  }

  .no-relationships {
    color: #999;
    font-style: italic;
    margin: 0;
    font-size: 0.9rem;
  }

  .button-section {
    padding: 1rem;
    border-top: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    background: white;
    position: sticky;
    bottom: 0;
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

    .modal-title {
      font-size: 1.25rem;
    }

    .button-section {
      flex-direction: column;
    }
  }
</style>
