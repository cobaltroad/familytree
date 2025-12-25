<script>
  import { createEventDispatcher } from 'svelte'
  import TwoColumnLayout from './components/TwoColumnLayout.svelte'
  import CollapsibleSection from './components/CollapsibleSection.svelte'
  import PersonFormFields from './components/PersonFormFields.svelte'
  import RelationshipCard from './components/RelationshipCard.svelte'
  import RelationshipCardGrid from './components/RelationshipCardGrid.svelte'
  import QuickAddChild from './QuickAddChild.svelte'
  import QuickAddParent from './QuickAddParent.svelte'
  import QuickAddSpouse from './QuickAddSpouse.svelte'
  import LinkExistingParent from './LinkExistingParent.svelte'
  import LinkExistingSpouse from './LinkExistingSpouse.svelte'
  import { modal } from '../stores/modalStore.js'
  import { peopleById, createPersonRelationships } from '../stores/derivedStores.js'
  import { createPerson, updatePerson, deletePerson } from '../stores/actions/personActions.js'
  import { error as errorNotification, success as successNotification } from '../stores/notificationStore.js'
  import { addChildWithRelationship } from './quickAddChildUtils.js'
  import { addParentWithRelationship } from './quickAddParentUtils.js'
  import { addSpouseWithRelationship } from './quickAddSpouseUtils.js'
  import { api } from './api.js'
  import { people, relationships } from '../stores/familyStore.js'

  const dispatch = createEventDispatcher()

  // Quick Add Child state
  let showQuickAddChild = false

  // Quick Add Parent state
  let showQuickAddMother = false
  let showQuickAddFather = false

  // Quick Add Spouse state
  let showQuickAddSpouse = false

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

  // Quick Add Child handlers
  function toggleQuickAddChild() {
    showQuickAddChild = !showQuickAddChild
  }

  function handleQuickAddChildCancel() {
    showQuickAddChild = false
  }

  async function handleQuickAddChildSubmit(event) {
    const { childData, parentId, parentRole } = event.detail

    try {
      // Use atomic child creation with relationship
      const result = await addChildWithRelationship(api, childData, parentId, parentRole)

      if (result.success) {
        // Update stores with new child and relationship
        people.update(currentPeople => [...currentPeople, result.person])
        relationships.update(currentRelationships => [...currentRelationships, result.relationship])

        // Show success notification
        successNotification(`Child added successfully`)

        // Hide the form
        showQuickAddChild = false
      } else {
        // Show error notification
        errorNotification(result.error || 'Failed to add child')
      }
    } catch (err) {
      errorNotification('Failed to add child: ' + err.message)
    }
  }

  // Quick Add Parent handlers
  function toggleQuickAddMother() {
    showQuickAddMother = !showQuickAddMother
    if (showQuickAddMother) {
      showQuickAddFather = false // Close father form if open
    }
  }

  function toggleQuickAddFather() {
    showQuickAddFather = !showQuickAddFather
    if (showQuickAddFather) {
      showQuickAddMother = false // Close mother form if open
    }
  }

  function handleQuickAddMotherCancel() {
    showQuickAddMother = false
  }

  function handleQuickAddFatherCancel() {
    showQuickAddFather = false
  }

  async function handleQuickAddParentSubmit(event) {
    const { parentData, childId, parentType } = event.detail

    try {
      // Use atomic parent creation with relationship
      const result = await addParentWithRelationship(api, parentData, childId, parentType)

      if (result.success) {
        // Update stores with new parent and relationship
        people.update(currentPeople => [...currentPeople, result.person])
        relationships.update(currentRelationships => [...currentRelationships, result.relationship])

        // Show success notification
        const parentTypeDisplay = parentType === 'mother' ? 'Mother' : 'Father'
        successNotification(`${parentTypeDisplay} added successfully`)

        // Hide the form
        if (parentType === 'mother') {
          showQuickAddMother = false
        } else {
          showQuickAddFather = false
        }
      } else {
        // Show error notification
        errorNotification(result.error || 'Failed to add parent')
      }
    } catch (err) {
      errorNotification('Failed to add parent: ' + err.message)
    }
  }

  // Quick Add Spouse handlers
  function toggleQuickAddSpouse() {
    showQuickAddSpouse = !showQuickAddSpouse
  }

  function handleQuickAddSpouseCancel() {
    showQuickAddSpouse = false
  }

  async function handleQuickAddSpouseSubmit(event) {
    const { spouseData, personId } = event.detail

    try {
      // Use atomic spouse creation with bidirectional relationships
      const result = await addSpouseWithRelationship(api, spouseData, personId)

      if (result.success) {
        // Update stores with new spouse and both relationships
        people.update(currentPeople => [...currentPeople, result.person])
        relationships.update(currentRelationships => [...currentRelationships, ...result.relationships])

        // Show success notification
        successNotification('Spouse added successfully')

        // Hide the form
        showQuickAddSpouse = false
      } else {
        // Show error notification
        errorNotification(result.error || 'Failed to add spouse')
      }
    } catch (err) {
      errorNotification('Failed to add spouse: ' + err.message)
    }
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

              <!-- Parent Cards -->
              <RelationshipCardGrid title="Parents" count={($personRelationships.mother ? 1 : 0) + ($personRelationships.father ? 1 : 0)}>
                {#if $personRelationships.mother}
                  <RelationshipCard
                    person={$personRelationships.mother}
                    relationshipType="Mother"
                    on:click={handleCardClick}
                  />
                {:else}
                  <!-- Add Mother Button -->
                  <button
                    type="button"
                    class="add-parent-button"
                    data-testid="add-mother-button"
                    on:click={toggleQuickAddMother}
                  >
                    {showQuickAddMother ? 'Cancel' : 'Add New Person As Mother'}
                  </button>
                {/if}
                {#if $personRelationships.father}
                  <RelationshipCard
                    person={$personRelationships.father}
                    relationshipType="Father"
                    on:click={handleCardClick}
                  />
                {:else}
                  <!-- Add Father Button -->
                  <button
                    type="button"
                    class="add-parent-button"
                    data-testid="add-father-button"
                    on:click={toggleQuickAddFather}
                  >
                    {showQuickAddFather ? 'Cancel' : 'Add New Person As Father'}
                  </button>
                {/if}
              </RelationshipCardGrid>

              <!-- Quick Add Mother Form -->
              {#if showQuickAddMother}
                <div data-testid="quick-add-mother-form">
                  <QuickAddParent
                    child={person}
                    parentType="mother"
                    onCancel={handleQuickAddMotherCancel}
                    on:submit={handleQuickAddParentSubmit}
                    on:cancel={handleQuickAddMotherCancel}
                  />
                </div>
              {/if}

              <!-- Quick Add Father Form -->
              {#if showQuickAddFather}
                <div data-testid="quick-add-father-form">
                  <QuickAddParent
                    child={person}
                    parentType="father"
                    onCancel={handleQuickAddFatherCancel}
                    on:submit={handleQuickAddParentSubmit}
                    on:cancel={handleQuickAddFatherCancel}
                  />
                </div>
              {/if}

              <!-- Link Existing Mother -->
              {#if !$personRelationships.mother && !showQuickAddMother}
                <LinkExistingParent
                  child={person}
                  parentType="mother"
                  data-testid="link-existing-mother"
                />
              {/if}

              <!-- Link Existing Father -->
              {#if !$personRelationships.father && !showQuickAddFather}
                <LinkExistingParent
                  child={person}
                  parentType="father"
                  data-testid="link-existing-father"
                />
              {/if}

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

              <!-- Spouse Cards -->
              <RelationshipCardGrid title="Spouses" count={$personRelationships.spouses.length}>
                {#each $personRelationships.spouses as spouse (spouse.id)}
                  <RelationshipCard
                    person={spouse}
                    relationshipType="Spouse"
                    on:click={handleCardClick}
                  />
                {/each}
              </RelationshipCardGrid>

              <!-- Add Spouse Button (always visible, supports multiple spouses) -->
              <button
                type="button"
                class="add-spouse-button"
                data-testid="add-spouse-button"
                on:click={toggleQuickAddSpouse}
              >
                {showQuickAddSpouse ? 'Cancel' : ($personRelationships.spouses.length > 0 ? 'Add Another New Person As Spouse' : 'Add New Person As Spouse')}
              </button>

              <!-- Quick Add Spouse Form -->
              {#if showQuickAddSpouse}
                <div data-testid="quick-add-spouse-form">
                  <QuickAddSpouse
                    person={person}
                    onCancel={handleQuickAddSpouseCancel}
                    on:submit={handleQuickAddSpouseSubmit}
                    on:cancel={handleQuickAddSpouseCancel}
                  />
                </div>
              {/if}

              <!-- Link Existing Spouse (always show, supports multiple spouses) -->
              {#if !showQuickAddSpouse}
                <LinkExistingSpouse
                  person={person}
                  data-testid="link-existing-spouse"
                />
              {/if}

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

              <!-- Add Child Button -->
              <button
                type="button"
                class="add-child-button"
                data-testid="add-child-button"
                on:click={toggleQuickAddChild}
              >
                {showQuickAddChild ? 'Cancel' : 'Add New Person As Child'}
              </button>

              <!-- Quick Add Child Form -->
              {#if showQuickAddChild}
                <div data-testid="quick-add-child-form">
                  <QuickAddChild
                    parent={person}
                    onCancel={handleQuickAddChildCancel}
                    on:submit={handleQuickAddChildSubmit}
                    on:cancel={handleQuickAddChildCancel}
                  />
                </div>
              {/if}
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
            <div class="mobile-cards">
              {#if $personRelationships.mother}
                <RelationshipCard
                  person={$personRelationships.mother}
                  relationshipType="Mother"
                  on:click={handleCardClick}
                />
              {:else}
                <!-- Add Mother Button (Mobile) -->
                <button
                  type="button"
                  class="add-parent-button mobile"
                  data-testid="add-mother-button"
                  on:click={toggleQuickAddMother}
                >
                  {showQuickAddMother ? 'Cancel' : 'Add New Person As Mother'}
                </button>
              {/if}
              {#if $personRelationships.father}
                <RelationshipCard
                  person={$personRelationships.father}
                  relationshipType="Father"
                  on:click={handleCardClick}
                />
              {:else}
                <!-- Add Father Button (Mobile) -->
                <button
                  type="button"
                  class="add-parent-button mobile"
                  data-testid="add-father-button"
                  on:click={toggleQuickAddFather}
                >
                  {showQuickAddFather ? 'Cancel' : 'Add New Person As Father'}
                </button>
              {/if}
            </div>

            <!-- Quick Add Mother Form (Mobile) -->
            {#if showQuickAddMother}
              <div data-testid="quick-add-mother-form">
                <QuickAddParent
                  child={person}
                  parentType="mother"
                  onCancel={handleQuickAddMotherCancel}
                  on:submit={handleQuickAddParentSubmit}
                  on:cancel={handleQuickAddMotherCancel}
                />
              </div>
            {/if}

            <!-- Quick Add Father Form (Mobile) -->
            {#if showQuickAddFather}
              <div data-testid="quick-add-father-form">
                <QuickAddParent
                  child={person}
                  parentType="father"
                  onCancel={handleQuickAddFatherCancel}
                  on:submit={handleQuickAddParentSubmit}
                  on:cancel={handleQuickAddFatherCancel}
                />
              </div>
            {/if}

            <!-- Link Existing Mother (Mobile) -->
            {#if !$personRelationships.mother && !showQuickAddMother}
              <LinkExistingParent
                child={person}
                parentType="mother"
                data-testid="link-existing-mother"
              />
            {/if}

            <!-- Link Existing Father (Mobile) -->
            {#if !$personRelationships.father && !showQuickAddFather}
              <LinkExistingParent
                child={person}
                parentType="father"
                data-testid="link-existing-father"
              />
            {/if}
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

          <CollapsibleSection title="Spouses" expanded={false} count={$personRelationships.spouses.length}>
            <div class="mobile-cards">
              {#each $personRelationships.spouses as spouse (spouse.id)}
                <RelationshipCard
                  person={spouse}
                  relationshipType="Spouse"
                  on:click={handleCardClick}
                />
              {/each}
            </div>

            <!-- Add Spouse Button (Mobile) -->
            <button
              type="button"
              class="add-spouse-button mobile"
              data-testid="add-spouse-button"
              on:click={toggleQuickAddSpouse}
            >
              {showQuickAddSpouse ? 'Cancel' : ($personRelationships.spouses.length > 0 ? 'Add Another New Person As Spouse' : 'Add New Person As Spouse')}
            </button>

            <!-- Quick Add Spouse Form (Mobile) -->
            {#if showQuickAddSpouse}
              <div data-testid="quick-add-spouse-form">
                <QuickAddSpouse
                  person={person}
                  onCancel={handleQuickAddSpouseCancel}
                  on:submit={handleQuickAddSpouseSubmit}
                  on:cancel={handleQuickAddSpouseCancel}
                />
              </div>
            {/if}

            <!-- Link Existing Spouse (Mobile, always show, supports multiple spouses) -->
            {#if !showQuickAddSpouse}
              <LinkExistingSpouse
                person={person}
                data-testid="link-existing-spouse"
              />
            {/if}
          </CollapsibleSection>

          <CollapsibleSection title="Children" expanded={false} count={$personRelationships.children.length} data-testid="collapsible-children">
            <div class="mobile-cards">
              {#each $personRelationships.children as child (child.id)}
                <RelationshipCard
                  person={child}
                  relationshipType="Child"
                  on:click={handleCardClick}
                />
              {/each}
            </div>

            <!-- Add Child Button (Mobile) -->
            <button
              type="button"
              class="add-child-button mobile"
              data-testid="add-child-button"
              on:click={toggleQuickAddChild}
            >
              {showQuickAddChild ? 'Cancel' : 'Add New Person As Child'}
            </button>

            <!-- Quick Add Child Form (Mobile) -->
            {#if showQuickAddChild}
              <div data-testid="quick-add-child-form">
                <QuickAddChild
                  parent={person}
                  onCancel={handleQuickAddChildCancel}
                  on:submit={handleQuickAddChildSubmit}
                  on:cancel={handleQuickAddChildCancel}
                />
              </div>
            {/if}
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

  .add-child-button {
    width: 100%;
    padding: 0.75rem 1rem;
    margin-top: 1rem;
    background-color: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .add-child-button:hover {
    background-color: #1976D2;
  }

  .add-child-button:focus {
    outline: 2px solid #2196F3;
    outline-offset: 2px;
  }

  .add-child-button.mobile {
    margin-top: 0.75rem;
  }

  .add-parent-button {
    width: 100%;
    padding: 0.75rem 1rem;
    margin-top: 0.5rem;
    background-color: #FF9800;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .add-parent-button:hover {
    background-color: #F57C00;
  }

  .add-parent-button:focus {
    outline: 2px solid #FF9800;
    outline-offset: 2px;
  }

  .add-parent-button.mobile {
    margin-top: 0.75rem;
  }

  .add-spouse-button {
    width: 100%;
    padding: 0.75rem 1rem;
    margin-top: 1rem;
    background-color: #9C27B0;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .add-spouse-button:hover {
    background-color: #7B1FA2;
  }

  .add-spouse-button:focus {
    outline: 2px solid #9C27B0;
    outline-offset: 2px;
  }

  .add-spouse-button.mobile {
    margin-top: 0.75rem;
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
