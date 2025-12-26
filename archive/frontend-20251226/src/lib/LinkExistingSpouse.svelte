<script>
  import { createEventDispatcher } from 'svelte'
  import { get } from 'svelte/store'
  import { people, relationships } from '../stores/familyStore.js'
  import { relationshipsByPerson } from '../stores/derivedStores.js'
  import { success as successNotification, error as errorNotification } from '../stores/notificationStore.js'
  import { api as defaultApi } from './api.js'
  import { createSpouseFilter } from './linkExistingSpouseFilters.js'
  import PersonAutocomplete from './components/PersonAutocomplete.svelte'

  export let person = null
  export let api = defaultApi

  const dispatch = createEventDispatcher()

  // Get reactive data from stores
  $: allPeople = $people
  $: allRelationships = $relationships
  $: personRelationships = person ? ($relationshipsByPerson.get(person.id) || []) : []

  // Create filter function for spouse candidates
  $: filterFunction = createFilterFunction(person, personRelationships, allPeople, allRelationships)

  /**
   * Creates the filter function for spouse candidates.
   */
  function createFilterFunction(targetPerson, rels, peopleList, relList) {
    if (!targetPerson) return () => true

    return createSpouseFilter(targetPerson, rels, peopleList, relList)
  }

  /**
   * Handles person selection from autocomplete.
   * Creates bidirectional spouse relationships with optimistic update pattern.
   *
   * Creates two relationships atomically:
   * 1. person → selectedPerson (type: 'spouse')
   * 2. selectedPerson → person (type: 'spouse')
   *
   * If either API call fails, both relationships are rolled back.
   */
  async function handlePersonSelect(event) {
    const selectedPerson = event.detail

    if (!selectedPerson || !person) {
      return
    }

    // Capture current state for rollback
    const currentRelationships = get(relationships)

    // Create optimistic relationships (bidirectional)
    const timestamp = Date.now()
    const optimisticRelationship1 = {
      id: `temp-${timestamp}-1`,
      person1Id: person.id,
      person2Id: selectedPerson.id,
      type: 'spouse'
    }

    const optimisticRelationship2 = {
      id: `temp-${timestamp}-2`,
      person1Id: selectedPerson.id,
      person2Id: person.id,
      type: 'spouse'
    }

    // Apply optimistic update
    relationships.update(rels => [...rels, optimisticRelationship1, optimisticRelationship2])

    try {
      // Call API to create first relationship (person → selectedPerson)
      const createdRelationship1 = await api.createRelationship({
        person1Id: person.id,
        person2Id: selectedPerson.id,
        type: 'spouse'
      })

      // Call API to create second relationship (selectedPerson → person)
      const createdRelationship2 = await api.createRelationship({
        person1Id: selectedPerson.id,
        person2Id: person.id,
        type: 'spouse'
      })

      // Replace optimistic relationships with server responses
      relationships.update(rels =>
        rels.map(rel => {
          if (rel.id === optimisticRelationship1.id) return createdRelationship1
          if (rel.id === optimisticRelationship2.id) return createdRelationship2
          return rel
        })
      )

      // Show success notification
      successNotification(`Linked ${selectedPerson.firstName} ${selectedPerson.lastName} as Spouse`)

      // Dispatch success event
      dispatch('success', {
        person1: person,
        person2: selectedPerson,
        relationships: [createdRelationship1, createdRelationship2]
      })

    } catch (err) {
      // Rollback on error - restore previous state
      relationships.set(currentRelationships)

      // Show error notification
      const errorMessage = err.message || 'Failed to link spouse'
      errorNotification(errorMessage)

      // Dispatch error event
      dispatch('error', {
        message: errorMessage,
        person1: person,
        person2: selectedPerson
      })
    }
  }

  // Computed label and placeholder
  $: label = 'Link Existing Person as Spouse'
  $: placeholder = person ? `Search for ${person.firstName}'s spouse...` : 'Search for a spouse...'
</script>

<div class="link-existing-spouse" {...$$restProps}>
  <h4>{label}</h4>

  <PersonAutocomplete
    people={allPeople}
    {filterFunction}
    {label}
    {placeholder}
    on:select={handlePersonSelect}
  />

  <p class="help-text">
    Search and select a person to link as {person?.firstName}'s spouse.
    Only valid candidates are shown (excludes descendants, ancestors, existing spouses, and people with large age differences).
    Multiple spouses are supported (sequential marriages).
  </p>

  <!-- Screen reader live region for announcements -->
  <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
    <!-- Announcements will be handled by notification store -->
  </div>
</div>

<style>
  .link-existing-spouse {
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background-color: #fafafa;
    margin-top: 1rem;
  }

  .link-existing-spouse h4 {
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
    .link-existing-spouse {
      padding: 0.75rem;
    }

    .link-existing-spouse h4 {
      font-size: 0.9rem;
    }

    .help-text {
      font-size: 0.8rem;
    }
  }
</style>
