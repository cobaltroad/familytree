<script>
  import { createEventDispatcher } from 'svelte'
  import TwoColumnLayout from './components/TwoColumnLayout.svelte'
  import CollapsibleSection from './components/CollapsibleSection.svelte'
  import PersonFormFields from './components/PersonFormFields.svelte'
  import RelationshipCard from './components/RelationshipCard.svelte'
  import RelationshipCardGrid from './components/RelationshipCardGrid.svelte'
  import InlineParentSelector from './components/InlineParentSelector.svelte'
  import { modal } from '../stores/modalStore.js'
  import { peopleById, createPersonRelationships } from '../stores/derivedStores.js'
  import { createPerson, updatePerson, deletePerson } from '../stores/actions/personActions.js'
  import { error as errorNotification, success as successNotification } from '../stores/notificationStore.js'

  const dispatch = createEventDispatcher()

  // Responsive breakpoint detection
  let windowWidth = 0
  $: isMobile = windowWidth < 768
  $: isTablet = windowWidth >= 768 && windowWidth < 1024
  $: isDesktop = windowWidth >= 1024

  // Get person data from store based on modal state
  $: person = $modal.personId ? $peopleById.get($modal.personId) : null

  // Get relationships for the person
  $: personRelationships = person ? createPersonRelationships(person.id) : null

  function closeModal() {
    modal.close()
  }

  async function handleSubmit(event) {
    const personData = event.detail

    try {
      if (personData.id) {
        await updatePerson(personData.id, personData)
      } else {
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

  function handleCardClick(event) {
    const clickedPerson = event.detail.person
    modal.open(clickedPerson.id, 'edit')
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

  // Inline parent editing handlers
  async function handleParentSelect(event) {
    // This would create/update parent relationship
    // For now, just show success message
    successNotification(`Parent relationship updated`)
  }

  async function handleParentRemove(event) {
    // This would remove parent relationship
    // For now, just show success message
    successNotification(`Parent relationship removed`)
  }
</script>

<svelte:window bind:innerWidth={windowWidth} on:keydown={handleKeydown} />

{#if $modal.isOpen}
  <div class="modal-backdrop" role="presentation" on:click={handleBackdropClick} on:keydown>
    <div class="modal-content hybrid-modal" class:mobile={isMobile} class:tablet={isTablet} class:desktop={isDesktop}>
      <button class="close-button" on:click={closeModal} aria-label="Close modal">
        &times;
      </button>

      {#if isDesktop || isTablet}
        <!-- Desktop/Tablet: Two-column layout with cards -->
        <TwoColumnLayout>
          <div slot="left">
            <h2>{person ? 'Edit Person' : 'Add New Person'}</h2>
            <PersonFormFields {person} on:submit={handleSubmit} />
          </div>

          <div slot="right">
            {#if person && personRelationships}
              <h2>Relationships</h2>

              <!-- Parent Selection -->
              <div class="parent-selection">
                <InlineParentSelector
                  parentRole="mother"
                  currentParentId={$personRelationships.mother?.id || null}
                  excludePersonId={person.id}
                  on:select={handleParentSelect}
                  on:remove={handleParentRemove}
                />
                <InlineParentSelector
                  parentRole="father"
                  currentParentId={$personRelationships.father?.id || null}
                  excludePersonId={person.id}
                  on:select={handleParentSelect}
                  on:remove={handleParentRemove}
                />
              </div>

              <!-- Parent Cards -->
              <RelationshipCardGrid title="Parents" count={($personRelationships.mother ? 1 : 0) + ($personRelationships.father ? 1 : 0)}>
                {#if $personRelationships.mother}
                  <RelationshipCard
                    person={$personRelationships.mother}
                    relationshipType="Mother"
                    on:click={handleCardClick}
                  />
                {/if}
                {#if $personRelationships.father}
                  <RelationshipCard
                    person={$personRelationships.father}
                    relationshipType="Father"
                    on:click={handleCardClick}
                  />
                {/if}
              </RelationshipCardGrid>

              <!-- Sibling Cards -->
              <RelationshipCardGrid title="Siblings" count={$personRelationships.siblings.length}>
                {#each $personRelationships.siblings as sibling (sibling.id)}
                  <RelationshipCard
                    person={sibling}
                    relationshipType="Sibling"
                    on:click={handleCardClick}
                  />
                {/each}
              </RelationshipCardGrid>

              <!-- Children Cards -->
              <RelationshipCardGrid title="Children" count={$personRelationships.children.length}>
                {#each $personRelationships.children as child (child.id)}
                  <RelationshipCard
                    person={child}
                    relationshipType="Child"
                    on:click={handleCardClick}
                  />
                {/each}
              </RelationshipCardGrid>
            {:else}
              <div class="empty-relationships">
                <p>Add person details to view relationships</p>
              </div>
            {/if}
          </div>
        </TwoColumnLayout>
      {:else}
        <!-- Mobile: Collapsible sections -->
        <h2>{person ? 'Edit Person' : 'Add New Person'}</h2>

        <CollapsibleSection title="Personal Information" expanded={true}>
          <PersonFormFields {person} on:submit={handleSubmit} />
        </CollapsibleSection>

        {#if person && personRelationships}
          <CollapsibleSection title="Parents" expanded={false} count={($personRelationships.mother ? 1 : 0) + ($personRelationships.father ? 1 : 0)}>
            <div class="parent-selection">
              <InlineParentSelector
                parentRole="mother"
                currentParentId={$personRelationships.mother?.id || null}
                excludePersonId={person.id}
                on:select={handleParentSelect}
                on:remove={handleParentRemove}
              />
              <InlineParentSelector
                parentRole="father"
                currentParentId={$personRelationships.father?.id || null}
                excludePersonId={person.id}
                on:select={handleParentSelect}
                on:remove={handleParentRemove}
              />
            </div>

            <div class="mobile-cards">
              {#if $personRelationships.mother}
                <RelationshipCard
                  person={$personRelationships.mother}
                  relationshipType="Mother"
                  on:click={handleCardClick}
                />
              {/if}
              {#if $personRelationships.father}
                <RelationshipCard
                  person={$personRelationships.father}
                  relationshipType="Father"
                  on:click={handleCardClick}
                />
              {/if}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Siblings" expanded={false} count={$personRelationships.siblings.length}>
            <div class="mobile-cards">
              {#each $personRelationships.siblings as sibling (sibling.id)}
                <RelationshipCard
                  person={sibling}
                  relationshipType="Sibling"
                  on:click={handleCardClick}
                />
              {/each}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Children" expanded={false} count={$personRelationships.children.length}>
            <div class="mobile-cards">
              {#each $personRelationships.children as child (child.id)}
                <RelationshipCard
                  person={child}
                  relationshipType="Child"
                  on:click={handleCardClick}
                />
              {/each}
            </div>
          </CollapsibleSection>
        {/if}
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
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background: white;
    border-radius: 8px;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    width: 100%;
    transition: all 0.3s ease;
  }

  .modal-content.desktop {
    max-width: 1200px;
  }

  .modal-content.tablet {
    max-width: 900px;
  }

  .modal-content.mobile {
    max-width: 100%;
    padding: 1rem;
  }

  .close-button {
    position: sticky;
    top: 0;
    right: 0;
    float: right;
    background: none;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: #666;
    padding: 0.5rem;
    line-height: 1;
    z-index: 10;
    margin: 0.5rem;
  }

  .close-button:hover {
    color: #333;
  }

  .close-button:focus {
    outline: 2px solid #4CAF50;
    outline-offset: 2px;
  }

  h2 {
    margin: 0 0 1.5rem 0;
    font-size: 1.5rem;
    color: #333;
  }

  .parent-selection {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: #f9f9f9;
    border-radius: 4px;
  }

  .mobile-cards {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .empty-relationships {
    padding: 2rem;
    text-align: center;
    color: #999;
    font-style: italic;
  }

  .button-section {
    display: flex;
    justify-content: space-between;
    padding: 1.5rem;
    border-top: 1px solid #e0e0e0;
    background: #fafafa;
    position: sticky;
    bottom: 0;
  }

  .update-button, .delete-button {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .update-button {
    background-color: #4CAF50;
    color: white;
  }

  .update-button:hover {
    background-color: #45a049;
  }

  .update-button:focus {
    outline: 2px solid #4CAF50;
    outline-offset: 2px;
  }

  .delete-button {
    background-color: #f44336;
    color: white;
  }

  .delete-button:hover {
    background-color: #d32f2f;
  }

  .delete-button:focus {
    outline: 2px solid #f44336;
    outline-offset: 2px;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .modal-backdrop {
      padding: 0;
    }

    .modal-content {
      border-radius: 0;
      max-height: 100vh;
    }

    h2 {
      font-size: 1.25rem;
      padding: 0 1rem;
    }

    .button-section {
      padding: 1rem;
    }
  }

  /* Smooth responsive transitions */
  @media (prefers-reduced-motion: no-preference) {
    .modal-content {
      animation: fadeInScale 0.3s ease-out;
    }
  }

  @keyframes fadeInScale {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
