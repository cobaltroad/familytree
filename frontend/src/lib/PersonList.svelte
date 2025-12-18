<script>
  import { createEventDispatcher } from 'svelte'

  export let people = []
  export let relationships = []

  const dispatch = createEventDispatcher()

  function formatDate(dateStr) {
    if (!dateStr) return 'Unknown'
    return new Date(dateStr).toLocaleDateString()
  }

  function getRelationships(personId) {
    return relationships.filter(rel =>
      rel.person1Id === personId || rel.person2Id === personId
    )
  }

  function getRelatedPerson(rel, personId) {
    const relatedId = rel.person1Id === personId ? rel.person2Id : rel.person1Id
    return people.find(p => p.id === relatedId)
  }

  function formatRelationshipForPerson(rel, personId) {
    const isFromPerson1 = rel.person1Id === personId
    const relatedPerson = getRelatedPerson(rel, personId)

    if (rel.type === 'parentOf') {
      // If this person is person1, they are the parent
      // If this person is person2, they are the child
      const label = isFromPerson1 ? 'Parent of' : 'Child of'
      return { label, person: relatedPerson }
    } else if (rel.type === 'spouse') {
      return { label: 'Spouse', person: relatedPerson }
    } else if (rel.type === 'sibling') {
      return { label: 'Sibling', person: relatedPerson }
    }

    // Fallback for unknown types
    return { label: rel.type, person: relatedPerson }
  }
</script>

<div class="card">
  <h2>Family Members ({people.length})</h2>

  {#if people.length === 0}
    <p>No family members yet. Add your first person above!</p>
  {:else}
    <div class="grid">
      {#each people as person (person.id)}
        <div class="card">
          <h3>{person.firstName} {person.lastName}</h3>
          <p>
            <strong>Gender:</strong> {person.gender || 'Not specified'}<br/>
            <strong>Born:</strong> {formatDate(person.birthDate)}<br/>
            {#if person.deathDate}
              <strong>Died:</strong> {formatDate(person.deathDate)}<br/>
            {/if}
          </p>

          {#if getRelationships(person.id).length > 0}
            <div style="margin-top: 1rem;">
              <strong>Relationships:</strong>
              <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                {#each getRelationships(person.id) as rel}
                  {@const formatted = formatRelationshipForPerson(rel, person.id)}
                  <li>
                    {formatted.label} - {formatted.person?.firstName} {formatted.person?.lastName}
                    <button
                      class="danger"
                      style="margin-left: 0.5rem; padding: 0.2em 0.5em; font-size: 0.8em;"
                      on:click={() => dispatch('deleteRelationship', rel.id)}
                    >
                      Remove
                    </button>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          <div style="margin-top: 1rem;">
            <button
              class="danger"
              on:click={() => dispatch('delete', person.id)}
            >
              Delete
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
