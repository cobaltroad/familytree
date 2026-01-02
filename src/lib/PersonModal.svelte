<script>
  import { createEventDispatcher } from 'svelte'
  import { page } from '$app/stores'
  import TwoColumnLayout from './components/TwoColumnLayout.svelte'
  import CollapsibleSection from './components/CollapsibleSection.svelte'
  import CollapsibleActionPanel from './components/CollapsibleActionPanel.svelte'
  import PersonFormFields from './components/PersonFormFields.svelte'
  import RelationshipCard from './components/RelationshipCard.svelte'
  import RelationshipCardGrid from './components/RelationshipCardGrid.svelte'
  import ConfirmationDialog from './components/ConfirmationDialog.svelte'
  import QuickAddChild from './QuickAddChild.svelte'
  import QuickAddParent from './QuickAddParent.svelte'
  import QuickAddSpouse from './QuickAddSpouse.svelte'
  import LinkExistingParent from './LinkExistingParent.svelte'
  import LinkExistingSpouse from './LinkExistingSpouse.svelte'
  import LinkExistingChildren from './LinkExistingChildren.svelte'
  import SmartRelationshipCreator from './SmartRelationshipCreator.svelte'
  import { modal } from '../stores/modalStore.js'
  import { peopleById, createPersonRelationships, relationshipsByPerson } from '../stores/derivedStores.js'
  import { createPerson, updatePerson, deletePerson } from '../stores/actions/personActions.js'
  import { deleteRelationship } from '../stores/actions/relationshipActions.js'
  import { error as errorNotification, success as successNotification } from '../stores/notificationStore.js'
  import { addChildWithRelationship } from './quickAddChildUtils.js'
  import { addParentWithRelationship } from './quickAddParentUtils.js'
  import { addSpouseWithRelationship } from './quickAddSpouseUtils.js'
  import { api } from './api.js'
  import { people, relationships } from '../stores/familyStore.js'
  import { openPanels } from '../stores/panelStore.js'

  const dispatch = createEventDispatcher()

  // Facebook import state
  let facebookUrl = ''
  let isImporting = false

  // Story #84: Get user's defaultPersonId from session
  $: defaultPersonId = $page?.data?.session?.user?.defaultPersonId

  // Story #84: Check if current person is the user's profile
  $: isUserProfile = person && defaultPersonId && person.id === defaultPersonId

  // Spouse Panel references (for collapsing after success)
  let spousePanelDesktop = null
  let spousePanelMobile = null

  // Child Panel references (for collapsing after success)
  let childPanelDesktop = null
  let childPanelMobile = null

  // Confirmation dialog state
  let showConfirmDialog = false
  let pendingDeleteRelationship = null
  let pendingDeletePerson = null
  let pendingDeleteType = null

  // SmartRelationshipCreator modal state
  let isSmartRelationshipCreatorOpen = false
  let smartRelationshipFocusPersonId = null

  // Responsive breakpoint detection
  let windowWidth = 0
  $: isMobile = windowWidth < 768
  $: isTablet = windowWidth >= 768 && windowWidth < 1024
  $: isDesktop = windowWidth >= 1024

  // Get person data from store based on modal state
  $: person = $modal.personId ? $peopleById.get($modal.personId) : null

  // Get relationships for the person
  $: personRelationships = person ? createPersonRelationships(person.id) : null

  // Get actual relationship objects for the person
  $: personRelationshipObjects = person ? $relationshipsByPerson.get(person.id) || [] : []

  // Get first spouse (for QuickAddChild spouse parameter)
  $: firstSpouse = personRelationships ? $personRelationships.spouses[0] || null : null

  // Helper to find relationship object for a specific person and type
  function findRelationshipObject(relatedPersonId, type, parentRole = null) {
    if (!personRelationshipObjects) return null

    return personRelationshipObjects.find(rel => {
      if (type === 'spouse') {
        return rel.type === 'spouse' && (
          (rel.person1Id === person.id && rel.person2Id === relatedPersonId) ||
          (rel.person2Id === person.id && rel.person1Id === relatedPersonId)
        )
      } else if (type === 'parentOf') {
        // For parents: person is person2Id (child), related person is person1Id (parent)
        // For children: person is person1Id (parent), related person is person2Id (child)
        if (parentRole) {
          // Looking for a parent relationship
          return rel.type === 'parentOf' &&
            rel.person2Id === person.id &&
            rel.person1Id === relatedPersonId &&
            rel.parentRole === parentRole
        } else {
          // Looking for a child relationship
          return rel.type === 'parentOf' &&
            rel.person1Id === person.id &&
            rel.person2Id === relatedPersonId
        }
      }
      return false
    }) || null
  }

  function closeModal() {
    // Reset panel store when modal closes (AC10)
    openPanels.set({})
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

  // Helper function to collapse both desktop and mobile panels
  function collapsePanels(desktopPanel, mobilePanel) {
    if (desktopPanel) {
      desktopPanel.collapsePanel()
    }
    if (mobilePanel) {
      mobilePanel.collapsePanel()
    }
  }

  // Quick Add Child handler (used by CollapsibleActionPanel slots)
  async function handleQuickAddChildSubmit(event) {
    const { childData, parentId, parentRole, spouse, includeSpouse } = event.detail

    try {
      // Use atomic child creation with relationship (supports spouse as second parent)
      const result = await addChildWithRelationship(api, childData, parentId, parentRole, spouse, includeSpouse)

      if (result.success) {
        // Update stores with new child and relationship(s)
        people.update(currentPeople => [...currentPeople, result.person])

        // Handle both single and multiple relationships
        if (result.relationships && result.relationships.length > 0) {
          relationships.update(currentRelationships => [...currentRelationships, ...result.relationships])
        } else if (result.relationship) {
          // Backwards compatibility
          relationships.update(currentRelationships => [...currentRelationships, result.relationship])
        }

        // Show success notification
        const successMessage = includeSpouse && spouse
          ? `Child added successfully with both parents`
          : `Child added successfully`
        successNotification(successMessage)

        // Collapse the panel (but keep it visible for adding more children)
        collapsePanels(childPanelDesktop, childPanelMobile)
      } else {
        // Show error notification
        errorNotification(result.error || 'Failed to add child')
      }
    } catch (err) {
      errorNotification('Failed to add child: ' + err.message)
    }
  }

  // Handle successful child link from LinkExistingChildren
  function handleLinkChildrenSuccess() {
    // Collapse the panel after successful link
    collapsePanels(childPanelDesktop, childPanelMobile)
  }

  // Quick Add Parent handler (used by CollapsibleActionPanel slots)
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

        // Note: CollapsibleActionPanel will disappear automatically when parent is added
        // because the panel is conditionally rendered based on parent existence
      } else {
        // Show error notification
        errorNotification(result.error || 'Failed to add parent')
      }
    } catch (err) {
      errorNotification('Failed to add parent: ' + err.message)
    }
  }

  // Quick Add Spouse handlers
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

        // Collapse the panel (but keep it visible for adding more spouses)
        collapsePanels(spousePanelDesktop, spousePanelMobile)
      } else {
        // Show error notification
        errorNotification(result.error || 'Failed to add spouse')
      }
    } catch (err) {
      errorNotification('Failed to add spouse: ' + err.message)
    }
  }

  // Handle successful spouse link from LinkExistingSpouse
  function handleLinkSpouseSuccess() {
    // Collapse the panel after successful link
    collapsePanels(spousePanelDesktop, spousePanelMobile)
  }

  // Delete relationship handlers
  function handleDeleteRelationship(event) {
    const { relationship, person: relatedPerson, relationshipType } = event.detail

    // Store pending deletion data
    pendingDeleteRelationship = relationship
    pendingDeletePerson = relatedPerson
    pendingDeleteType = relationshipType

    // Show confirmation dialog
    showConfirmDialog = true
  }

  function handleConfirmDelete() {
    if (pendingDeleteRelationship && pendingDeletePerson && pendingDeleteType) {
      // Call the delete action
      deleteRelationship(pendingDeleteRelationship, pendingDeleteType, pendingDeletePerson)

      // Reset state
      showConfirmDialog = false
      pendingDeleteRelationship = null
      pendingDeletePerson = null
      pendingDeleteType = null
    }
  }

  function handleCancelDelete() {
    // Reset state without deleting
    showConfirmDialog = false
    pendingDeleteRelationship = null
    pendingDeletePerson = null
    pendingDeleteType = null
  }

  // SmartRelationshipCreator handlers
  function openSmartRelationshipCreator() {
    if (person) {
      smartRelationshipFocusPersonId = person.id
      isSmartRelationshipCreatorOpen = true
    }
  }

  function closeSmartRelationshipCreator() {
    isSmartRelationshipCreatorOpen = false
    smartRelationshipFocusPersonId = null
  }

  // Facebook Re-Sync/Import handler
  async function handleFacebookSync() {
    // Prompt user for Facebook URL
    const url = prompt('Enter Facebook profile URL, username, or user ID:')

    if (!url || !url.trim()) {
      return // User canceled or entered empty string
    }

    facebookUrl = url.trim()
    isImporting = true

    try {
      const personData = await api.fetchFacebookProfile(facebookUrl)

      // Update the person object with Facebook data
      // We need to get a reference to the PersonFormFields component
      // For now, we'll dispatch an event that PersonFormFields can listen to
      // Actually, we'll directly update the person data in the modal

      // Pre-populate form fields with Facebook data
      if (person) {
        // Update existing person
        const updates = {}
        if (personData.firstName) updates.firstName = personData.firstName
        if (personData.lastName) updates.lastName = personData.lastName
        if (personData.birthDate) updates.birthDate = personData.birthDate
        if (personData.gender) updates.gender = personData.gender
        if (personData.photoUrl) updates.photoUrl = personData.photoUrl

        // Optimistically update the person
        await updatePerson(person.id, { ...person, ...updates })
      } else {
        // For new person, we need to communicate with PersonFormFields
        // This is tricky - let's dispatch a custom event that PersonFormFields can listen to
        dispatch('facebookDataFetched', personData)
      }

      // Build success message
      const importedFields = []
      if (personData.firstName || personData.lastName) importedFields.push('name')
      if (personData.birthDate) importedFields.push('birth date')
      if (personData.gender) importedFields.push('gender')
      if (personData.photoUrl) importedFields.push('photo')

      if (importedFields.length > 0) {
        successNotification(
          `${person ? 'Re-synced' : 'Imported'} ${importedFields.join(', ')} from Facebook profile`
        )
      } else {
        errorNotification('Profile found but no additional data available (check privacy settings)')
      }

      // Clear Facebook URL
      facebookUrl = ''
    } catch (error) {
      errorNotification(error.message || 'Failed to sync Facebook profile')
    } finally {
      isImporting = false
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
            <div class="header-with-badge">
              <h2>{person ? 'Edit Person' : 'Add New Person'}</h2>
              {#if isUserProfile}
                <span class="profile-badge">Your Profile</span>
              {/if}
            </div>
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
                    relationship={findRelationshipObject($personRelationships.mother.id, 'parentOf', 'mother')}
                    isMobile={isMobile}
                    on:click={handleCardClick}
                    on:delete={handleDeleteRelationship}
                  />
                {/if}
                {#if $personRelationships.father}
                  <RelationshipCard
                    person={$personRelationships.father}
                    relationshipType="Father"
                    relationship={findRelationshipObject($personRelationships.father.id, 'parentOf', 'father')}
                    isMobile={isMobile}
                    on:click={handleCardClick}
                    on:delete={handleDeleteRelationship}
                  />
                {/if}
              </RelationshipCardGrid>

              <!-- Mother Panel (CollapsibleActionPanel) -->
              {#if !$personRelationships.mother}
                <CollapsibleActionPanel
                  label="Add/Link Mother"
                  relationshipType="mother"
                  groupId="parents"
                  panelId="mother"
                  createLabel="Create New Person"
                  linkLabel="Link Existing Person"
                >
                  <div slot="create">
                    <QuickAddParent
                      child={person}
                      parentType="mother"
                      on:submit={handleQuickAddParentSubmit}
                    />
                  </div>
                  <div slot="link">
                    <LinkExistingParent
                      child={person}
                      parentType="mother"
                    />
                  </div>
                </CollapsibleActionPanel>
              {/if}

              <!-- Father Panel (CollapsibleActionPanel) -->
              {#if !$personRelationships.father}
                <CollapsibleActionPanel
                  label="Add/Link Father"
                  relationshipType="father"
                  groupId="parents"
                  panelId="father"
                  createLabel="Create New Person"
                  linkLabel="Link Existing Person"
                >
                  <div slot="create">
                    <QuickAddParent
                      child={person}
                      parentType="father"
                      on:submit={handleQuickAddParentSubmit}
                    />
                  </div>
                  <div slot="link">
                    <LinkExistingParent
                      child={person}
                      parentType="father"
                    />
                  </div>
                </CollapsibleActionPanel>
              {/if}

              <!-- Sibling Cards -->
              <RelationshipCardGrid title="Siblings" count={$personRelationships.siblings.length}>
                {#each $personRelationships.siblings as sibling (sibling.id)}
                  <RelationshipCard
                    person={sibling}
                    relationshipType="Sibling"
                    isMobile={isMobile}
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
                    relationship={findRelationshipObject(spouse.id, 'spouse')}
                    isMobile={isMobile}
                    on:click={handleCardClick}
                    on:delete={handleDeleteRelationship}
                  />
                {/each}
              </RelationshipCardGrid>

              <!-- Spouse Panel (CollapsibleActionPanel - always visible, supports multiple spouses) -->
              <CollapsibleActionPanel
                bind:this={spousePanelDesktop}
                label={$personRelationships.spouses.length > 0 ? "Add/Link Another Spouse" : "Add/Link Spouse"}
                relationshipType="spouse"
                groupId="spouses"
                panelId="spouse"
                createLabel="Create New Person"
                linkLabel="Link Existing Person"
              >
                <div slot="create">
                  <QuickAddSpouse
                    person={person}
                    on:submit={handleQuickAddSpouseSubmit}
                  />
                </div>
                <div slot="link">
                  <LinkExistingSpouse
                    person={person}
                    on:success={handleLinkSpouseSuccess}
                  />
                </div>
              </CollapsibleActionPanel>

              <!-- Children Cards -->
              <RelationshipCardGrid title="Children" count={$personRelationships.children.length}>
                {#each $personRelationships.children as child (child.id)}
                  <RelationshipCard
                    person={child}
                    relationshipType="Child"
                    relationship={findRelationshipObject(child.id, 'parentOf')}
                    isMobile={isMobile}
                    on:click={handleCardClick}
                    on:delete={handleDeleteRelationship}
                  />
                {/each}
              </RelationshipCardGrid>

              <!-- Child Panel (CollapsibleActionPanel - always visible, supports multiple children) -->
              <CollapsibleActionPanel
                bind:this={childPanelDesktop}
                label="Add/Link Children"
                relationshipType="child"
                groupId="children"
                panelId="child"
                createLabel="Create New Person"
                linkLabel="Link Existing Person(s)"
              >
                <div slot="create">
                  <QuickAddChild
                    parent={person}
                    spouse={firstSpouse}
                    on:submit={handleQuickAddChildSubmit}
                  />
                </div>
                <div slot="link">
                  <LinkExistingChildren
                    parent={person}
                    on:success={handleLinkChildrenSuccess}
                  />
                </div>
              </CollapsibleActionPanel>

              <!-- Add from Facebook button -->
              <div class="add-from-facebook-section">
                <button
                  class="add-from-facebook-button"
                  data-testid="add-from-facebook-button"
                  aria-label="Add family member from Facebook profile"
                  on:click={openSmartRelationshipCreator}
                  type="button"
                >
                  Add from Facebook
                </button>
              </div>
            {:else}
              <div class="empty-relationships">
                <p>Add person details to view relationships</p>
              </div>
            {/if}
          </div>
        </TwoColumnLayout>
      {:else}
        <!-- Mobile: Collapsible sections -->
        <div class="header-with-badge">
          <h2>{person ? 'Edit Person' : 'Add New Person'}</h2>
          {#if isUserProfile}
            <span class="profile-badge">Your Profile</span>
          {/if}
        </div>

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
                  relationship={findRelationshipObject($personRelationships.mother.id, 'parentOf', 'mother')}
                  isMobile={isMobile}
                  on:click={handleCardClick}
                  on:delete={handleDeleteRelationship}
                />
              {/if}
              {#if $personRelationships.father}
                <RelationshipCard
                  person={$personRelationships.father}
                  relationshipType="Father"
                  relationship={findRelationshipObject($personRelationships.father.id, 'parentOf', 'father')}
                  isMobile={isMobile}
                  on:click={handleCardClick}
                  on:delete={handleDeleteRelationship}
                />
              {/if}
            </div>

            <!-- Mother Panel (Mobile) -->
            {#if !$personRelationships.mother}
              <CollapsibleActionPanel
                label="Add/Link Mother"
                relationshipType="mother"
                groupId="parents"
                panelId="mother"
                createLabel="Create New Person"
                linkLabel="Link Existing Person"
              >
                <div slot="create">
                  <QuickAddParent
                    child={person}
                    parentType="mother"
                    on:submit={handleQuickAddParentSubmit}
                  />
                </div>
                <div slot="link">
                  <LinkExistingParent
                    child={person}
                    parentType="mother"
                  />
                </div>
              </CollapsibleActionPanel>
            {/if}

            <!-- Father Panel (Mobile) -->
            {#if !$personRelationships.father}
              <CollapsibleActionPanel
                label="Add/Link Father"
                relationshipType="father"
                groupId="parents"
                panelId="father"
                createLabel="Create New Person"
                linkLabel="Link Existing Person"
              >
                <div slot="create">
                  <QuickAddParent
                    child={person}
                    parentType="father"
                    on:submit={handleQuickAddParentSubmit}
                  />
                </div>
                <div slot="link">
                  <LinkExistingParent
                    child={person}
                    parentType="father"
                  />
                </div>
              </CollapsibleActionPanel>
            {/if}
          </CollapsibleSection>

          <CollapsibleSection title="Siblings" expanded={false} count={$personRelationships.siblings.length}>
            <div class="mobile-cards">
              {#each $personRelationships.siblings as sibling (sibling.id)}
                <RelationshipCard
                  person={sibling}
                  relationshipType="Sibling"
                  isMobile={isMobile}
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
                  relationship={findRelationshipObject(spouse.id, 'spouse')}
                  isMobile={isMobile}
                  on:click={handleCardClick}
                  on:delete={handleDeleteRelationship}
                />
              {/each}
            </div>

            <!-- Spouse Panel (Mobile - CollapsibleActionPanel, always visible, supports multiple spouses) -->
            <CollapsibleActionPanel
              bind:this={spousePanelMobile}
              label={$personRelationships.spouses.length > 0 ? "Add/Link Another Spouse" : "Add/Link Spouse"}
              relationshipType="spouse"
              groupId="spouses"
              panelId="spouse"
              createLabel="Create New Person"
              linkLabel="Link Existing Person"
            >
              <div slot="create">
                <QuickAddSpouse
                  person={person}
                  on:submit={handleQuickAddSpouseSubmit}
                />
              </div>
              <div slot="link">
                <LinkExistingSpouse
                  person={person}
                  on:success={handleLinkSpouseSuccess}
                />
              </div>
            </CollapsibleActionPanel>
          </CollapsibleSection>

          <CollapsibleSection title="Children" expanded={false} count={$personRelationships.children.length} data-testid="collapsible-children">
            <div class="mobile-cards">
              {#each $personRelationships.children as child (child.id)}
                <RelationshipCard
                  person={child}
                  relationshipType="Child"
                  relationship={findRelationshipObject(child.id, 'parentOf')}
                  isMobile={isMobile}
                  on:click={handleCardClick}
                  on:delete={handleDeleteRelationship}
                />
              {/each}
            </div>

            <!-- Child Panel (Mobile - CollapsibleActionPanel, always visible, supports multiple children) -->
            <CollapsibleActionPanel
              bind:this={childPanelMobile}
              label="Add/Link Children"
              relationshipType="child"
              groupId="children"
              panelId="child"
              createLabel="Create New Person"
              linkLabel="Link Existing Person(s)"
            >
              <div slot="create">
                <QuickAddChild
                  parent={person}
                  spouse={firstSpouse}
                  on:submit={handleQuickAddChildSubmit}
                />
              </div>
              <div slot="link">
                <LinkExistingChildren
                  parent={person}
                  on:success={handleLinkChildrenSuccess}
                />
              </div>
            </CollapsibleActionPanel>
          </CollapsibleSection>

          <!-- Add from Facebook button (Mobile) -->
          <div class="add-from-facebook-section mobile">
            <button
              class="add-from-facebook-button"
              data-testid="add-from-facebook-button"
              aria-label="Add family member from Facebook profile"
              on:click={openSmartRelationshipCreator}
              type="button"
            >
              Add from Facebook
            </button>
          </div>
        {/if}
      {/if}

      <div class="button-section">
        <div class="left-buttons">
          <button type="submit" form="person-form" class="update-button">
            {person ? 'Update' : 'Add'} Person
          </button>
          <button
            type="button"
            class="resync-facebook-button"
            data-testid="resync-facebook"
            on:click={handleFacebookSync}
            disabled={isImporting}
          >
            {isImporting ? 'Syncing...' : (person ? 'Re-Sync from Facebook' : 'Import from Facebook')}
          </button>
        </div>
        {#if person}
          <button class="delete-button" on:click={handleDelete}>
            Delete Person
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- SmartRelationshipCreator Modal -->
<SmartRelationshipCreator
  isOpen={isSmartRelationshipCreatorOpen}
  focusPersonId={smartRelationshipFocusPersonId}
  on:close={closeSmartRelationshipCreator}
/>

<!-- Confirmation Dialog for Relationship Deletion -->
<ConfirmationDialog
  isOpen={showConfirmDialog}
  title="Delete Relationship"
  message={pendingDeletePerson && pendingDeleteType
    ? `Are you sure you want to remove ${pendingDeletePerson.firstName} ${pendingDeletePerson.lastName} as ${pendingDeleteType}?`
    : 'Are you sure you want to delete this relationship?'}
  confirmText="Delete"
  cancelText="Cancel"
  isDangerous={true}
  on:confirm={handleConfirmDelete}
  on:cancel={handleCancelDelete}
/>

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

  .header-with-badge {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  h2 {
    margin: 0;
    font-size: 1.5rem;
    color: #333;
  }

  .profile-badge {
    display: inline-block;
    background-color: #3b82f6;
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
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
    align-items: center;
    padding: 1.5rem;
    border-top: 1px solid #e0e0e0;
    background: #fafafa;
    position: sticky;
    bottom: 0;
  }

  .left-buttons {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .update-button, .delete-button, .resync-facebook-button {
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

  .resync-facebook-button {
    background-color: white;
    color: #1877f2;
    border: 2px solid #1877f2;
  }

  .resync-facebook-button:hover:not(:disabled) {
    background-color: #f0f7ff;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(24, 119, 242, 0.2);
  }

  .resync-facebook-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .resync-facebook-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    border-color: #ccc;
    color: #999;
  }

  .resync-facebook-button:focus {
    outline: 2px solid #1877f2;
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

  .add-from-facebook-section {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 2px solid #e0e0e0;
  }

  .add-from-facebook-section.mobile {
    margin: 1rem;
    padding: 1rem 0;
  }

  .add-from-facebook-button {
    width: 100%;
    padding: 0.875rem 1.5rem;
    background-color: #1877f2;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(24, 119, 242, 0.2);
  }

  .add-from-facebook-button:hover {
    background-color: #166fe5;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(24, 119, 242, 0.3);
  }

  .add-from-facebook-button:active {
    transform: translateY(0);
  }

  .add-from-facebook-button:focus {
    outline: 2px solid #1877f2;
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
      flex-direction: column;
      gap: 0.75rem;
    }

    .left-buttons {
      width: 100%;
      flex-direction: column;
      gap: 0.75rem;
    }

    .update-button, .delete-button, .resync-facebook-button {
      width: 100%;
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
