<script>
  import { createEventDispatcher } from 'svelte'
  import { get } from 'svelte/store'
  import { people, relationships } from '../stores/familyStore.js'
  import { relationshipsByPerson } from '../stores/derivedStores.js'
  import { success as successNotification, error as errorNotification } from '../stores/notificationStore.js'
  import { api as defaultApi } from './api.js'
  import { createChildFilter } from './linkExistingChildFilters.js'
  import PersonMultiSelect from './components/PersonMultiSelect.svelte'

  export let parent = null
  export let api = defaultApi

  const dispatch = createEventDispatcher()

  // Get reactive data from stores
  $: allPeople = $people
  $: allRelationships = $relationships
  $: parentRelationships = parent ? ($relationshipsByPerson.get(parent.id) || []) : []

  // Parent role selection
  let selectedParentRole = ''
  let roleInitialized = false

  // Auto-determine parent role based on gender (only on first init)
  $: if (parent && !roleInitialized) {
    if (parent.gender === 'male') {
      selectedParentRole = 'father'
    } else if (parent.gender === 'female') {
      selectedParentRole = 'mother'
    } else {
      selectedParentRole = ''
    }
    roleInitialized = true
  }

  // Selected children
  let selectedChildren = []
  let multiSelectKey = 0 // Used to force re-render of PersonMultiSelect

  // Create filter function for child candidates
  $: filterFunction = createFilterFunction(parent, parentRelationships, allPeople, allRelationships)

  /**
   * Creates the filter function for child candidates.
   */
  function createFilterFunction(targetParent, rels, peopleList, relList) {
    if (!targetParent) return () => true

    return createChildFilter(targetParent, rels, peopleList, relList)
  }

  /**
   * Handles selection change from PersonMultiSelect.
   */
  function handleSelectionChange(event) {
    selectedChildren = event.detail
  }

  /**
   * Handles linking selected children.
   * Creates multiple parent→child relationships with optimistic update pattern.
   * Supports partial success (some children link, others fail).
   */
  async function handleLinkChildren() {
    if (!parent || selectedChildren.length === 0 || !selectedParentRole) {
      return
    }

    // Capture current state for rollback
    const currentRelationships = get(relationships)

    // Create optimistic relationships for all selected children
    const timestamp = Date.now()
    const optimisticRelationships = selectedChildren.map((child, index) => ({
      id: `temp-${timestamp}-${index}`,
      person1Id: parent.id,
      person2Id: child.id,
      type: 'parentOf',
      parentRole: selectedParentRole
    }))

    // Apply optimistic update
    relationships.update(rels => [...rels, ...optimisticRelationships])

    // Track results
    let successCount = 0
    let failureCount = 0
    const createdRelationships = []
    const failedChildren = []

    // Create relationships for each child
    for (let i = 0; i < selectedChildren.length; i++) {
      const child = selectedChildren[i]
      try {
        const createdRelationship = await api.createRelationship({
          person1Id: parent.id,
          person2Id: child.id,
          type: selectedParentRole // Backend expects 'mother' or 'father'
        })

        createdRelationships.push({
          optimisticId: optimisticRelationships[i].id,
          serverRelationship: createdRelationship
        })
        successCount++
      } catch (err) {
        failedChildren.push(child)
        failureCount++
      }
    }

    // Update relationships store with results
    if (successCount > 0 || failureCount > 0) {
      relationships.update(rels => {
        // Remove all optimistic relationships
        let updatedRels = rels.filter(rel => !rel.id.toString().startsWith(`temp-${timestamp}`))

        // Add successful relationships from server
        createdRelationships.forEach(({ serverRelationship }) => {
          updatedRels.push(serverRelationship)
        })

        return updatedRels
      })
    } else {
      // Complete failure - rollback all
      relationships.set(currentRelationships)
    }

    // Show notifications
    if (successCount > 0) {
      const childrenWord = successCount === 1 ? 'child' : 'children'
      successNotification(`Successfully linked ${successCount} ${childrenWord}`)
    }

    if (failureCount > 0) {
      const childrenWord = failureCount === 1 ? 'child' : 'children'
      errorNotification(`Failed to link ${failureCount} ${childrenWord}`)
    }

    // Dispatch events
    if (successCount > 0) {
      dispatch('success', {
        successCount,
        failureCount,
        total: selectedChildren.length
      })
    }

    if (failureCount > 0) {
      dispatch('error', {
        successCount,
        failureCount,
        total: selectedChildren.length
      })
    }

    // Clear selections on complete success
    if (failureCount === 0) {
      selectedChildren = []
      multiSelectKey++ // Force PersonMultiSelect to reset by re-rendering
    }
  }

  // Computed states
  $: canLink = selectedChildren.length > 0 && selectedParentRole !== ''
  $: label = 'Link Existing Person(s) as Children'
  $: placeholder = parent ? `Search for ${parent.firstName}'s children...` : 'Search for children...'
</script>

<div class="link-existing-children" {...$$restProps}>
  <h4>{label}</h4>

  <!-- Parent Role Selector -->
  <div class="parent-role-selector">
    <div class="parent-role-label">Parent Role *</div>
    <div role="radiogroup" aria-label="Parent role selection">
      <label class="radio-label">
        <input
          type="radio"
          name="parentRole"
          value="mother"
          checked={selectedParentRole === 'mother'}
          on:change={() => selectedParentRole = 'mother'}
          aria-label="Link as Mother"
        />
        Mother
      </label>
      <label class="radio-label">
        <input
          type="radio"
          name="parentRole"
          value="father"
          checked={selectedParentRole === 'father'}
          on:change={() => selectedParentRole = 'father'}
          aria-label="Link as Father"
        />
        Father
      </label>
    </div>
  </div>

  <!-- Multi-Select for Children -->
  {#key multiSelectKey}
    <PersonMultiSelect
      people={allPeople}
      {filterFunction}
      label="Select Children"
      {placeholder}
      on:selectionChange={handleSelectionChange}
    />
  {/key}

  <!-- Link Button -->
  <button
    type="button"
    class="link-button"
    disabled={!canLink}
    on:click={handleLinkChildren}
    aria-label="Link {selectedChildren.length} selected {selectedChildren.length === 1 ? 'child' : 'children'}"
  >
    Link Selected Children ({selectedChildren.length})
  </button>

  <p class="help-text">
    Search and select one or more people to link as {parent?.firstName}'s children.
    Only valid candidates are shown (excludes ancestors, descendants, existing children, and people chronologically too old).
    {#if selectedChildren.length > 0}
      <br>
      <strong>{selectedChildren.length} {selectedChildren.length === 1 ? 'person' : 'people'} selected</strong>
    {/if}
  </p>

  <!-- Screen reader live region for announcements -->
  <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
    <!-- Announcements will be handled by notification store -->
  </div>
</div>

<style>
  .link-existing-children {
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background-color: #fafafa;
    margin-top: 1rem;
  }

  .link-existing-children h4 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #333;
    font-size: 1rem;
    font-weight: 600;
  }

  .parent-role-selector {
    margin-bottom: 1rem;
  }

  .parent-role-label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #555;
  }

  .radio-label {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-right: 1.5rem;
    cursor: pointer;
    font-weight: normal;
  }

  .radio-label:has(input[type="radio"]:checked) {
    font-weight: bold;
  }

  .radio-label input[type="radio"] {
    cursor: pointer;
  }

  .link-button {
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

  .link-button:hover:not(:disabled) {
    background-color: #1976D2;
  }

  .link-button:focus {
    outline: 2px solid #2196F3;
    outline-offset: 2px;
  }

  .link-button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .help-text {
    margin-top: 0.75rem;
    font-size: 0.875rem;
    color: #666;
    line-height: 1.4;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .link-existing-children {
      padding: 0.75rem;
    }

    .link-existing-children h4 {
      font-size: 0.9rem;
    }

    .help-text {
      font-size: 0.8rem;
    }

    .radio-label {
      margin-right: 1rem;
    }
  }
</style>
