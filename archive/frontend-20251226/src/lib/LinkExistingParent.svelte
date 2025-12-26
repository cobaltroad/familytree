<script>
  import { createEventDispatcher } from 'svelte'
  import { get } from 'svelte/store'
  import { people, relationships } from '../stores/familyStore.js'
  import { relationshipsByPerson } from '../stores/derivedStores.js'
  import { success as successNotification, error as errorNotification } from '../stores/notificationStore.js'
  import { api as defaultApi } from './api.js'
  import { createMotherFilter, createFatherFilter } from './linkExistingParentFilters.js'
  import PersonAutocomplete from './components/PersonAutocomplete.svelte'

  export let child = null
  export let parentType = '' // 'mother' or 'father'
  export let api = defaultApi

  const dispatch = createEventDispatcher()

  // Get reactive data from stores
  $: allPeople = $people
  $: allRelationships = $relationships
  $: childRelationships = child ? ($relationshipsByPerson.get(child.id) || []) : []

  // Create filter function based on parent type
  $: filterFunction = createFilterFunction(child, parentType, childRelationships, allPeople, allRelationships)

  /**
   * Creates the appropriate filter function based on parent type.
   */
  function createFilterFunction(childPerson, type, rels, peopleList, relList) {
    if (!childPerson) return () => true

    if (type === 'mother') {
      return createMotherFilter(childPerson, rels, peopleList, relList)
    } else if (type === 'father') {
      return createFatherFilter(childPerson, rels, peopleList, relList)
    }

    return () => true
  }

  /**
   * Handles person selection from autocomplete.
   * Creates relationship with optimistic update pattern.
   */
  async function handlePersonSelect(event) {
    const selectedPerson = event.detail

    if (!selectedPerson || !child) {
      return
    }

    // Capture current state for rollback
    const currentRelationships = get(relationships)

    // Create optimistic relationship
    const optimisticRelationship = {
      id: `temp-${Date.now()}`,
      person1Id: selectedPerson.id,
      person2Id: child.id,
      type: 'parentOf',
      parentRole: parentType
    }

    // Apply optimistic update
    relationships.update(rels => [...rels, optimisticRelationship])

    try {
      // Call API to create relationship
      const createdRelationship = await api.createRelationship({
        person1Id: selectedPerson.id,
        person2Id: child.id,
        type: parentType // Backend expects 'mother' or 'father', will normalize to 'parentOf'
      })

      // Replace optimistic relationship with server response
      relationships.update(rels =>
        rels.map(rel => rel.id === optimisticRelationship.id ? createdRelationship : rel)
      )

      // Show success notification
      const parentTypeDisplay = parentType === 'mother' ? 'Mother' : 'Father'
      successNotification(`Linked ${selectedPerson.firstName} ${selectedPerson.lastName} as ${parentTypeDisplay}`)

      // Dispatch success event
      dispatch('success', {
        parent: selectedPerson,
        child: child,
        relationship: createdRelationship
      })

    } catch (err) {
      // Rollback on error
      relationships.set(currentRelationships)

      // Show error notification
      const errorMessage = err.message || 'Failed to link parent'
      errorNotification(errorMessage)

      // Dispatch error event
      dispatch('error', {
        message: errorMessage,
        parent: selectedPerson,
        child: child
      })
    }
  }

  // Computed label
  $: label = parentType === 'mother' ? 'Link Existing Person as Mother' : 'Link Existing Person as Father'
</script>

<div class="link-existing-parent" {...$$restProps}>
  <h4>{label}</h4>

  <PersonAutocomplete
    people={allPeople}
    {filterFunction}
    {label}
    placeholder={`Search for ${child?.firstName}'s ${parentType}...`}
    on:select={handlePersonSelect}
  />

  <p class="help-text">
    Search and select a person to link as {child?.firstName}'s {parentType}.
    Only valid candidates are shown (excludes descendants, ancestors, and people too young).
  </p>

  <!-- Screen reader live region for announcements -->
  <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
    <!-- Announcements will be handled by notification store -->
  </div>
</div>

<style>
  .link-existing-parent {
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background-color: #fafafa;
    margin-top: 1rem;
  }

  .link-existing-parent h4 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #333;
    font-size: 1rem;
    font-weight: 600;
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
    .link-existing-parent {
      padding: 0.75rem;
    }

    .link-existing-parent h4 {
      font-size: 0.9rem;
    }

    .help-text {
      font-size: 0.8rem;
    }
  }
</style>
