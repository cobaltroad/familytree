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
      if (rel.parentRole === 'mother') {
        const label = isFromPerson1 ? 'Mother of' : 'Child of'
        return { label, person: relatedPerson, parentRole: 'mother' }
      } else if (rel.parentRole === 'father') {
        const label = isFromPerson1 ? 'Father of' : 'Child of'
        return { label, person: relatedPerson, parentRole: 'father' }
      }
      // Fallback for old parentOf without role
      const label = isFromPerson1 ? 'Parent of' : 'Child of'
      return { label, person: relatedPerson }
    } else if (rel.type === 'spouse') {
      return { label: 'Spouse', person: relatedPerson }
    }

    // Fallback for unknown types
    return { label: rel.type, person: relatedPerson }
  }

  function getParents(personId) {
    const parentRels = relationships.filter(rel =>
      rel.type === 'parentOf' && rel.person2Id === personId
    )

    const motherRel = parentRels.find(r => r.parentRole === 'mother')
    const fatherRel = parentRels.find(r => r.parentRole === 'father')

    return {
      mother: motherRel ? people.find(p => p.id === motherRel.person1Id) : null,
      father: fatherRel ? people.find(p => p.id === fatherRel.person1Id) : null
    }
  }

  function getSiblings(personId) {
    const parents = getParents(personId)

    // Must have both parents to have siblings
    if (!parents.mother || !parents.father) {
      return []
    }

    const motherId = parents.mother.id
    const fatherId = parents.father.id

    // Find all people (except this person) who have the same mother and father
    return people.filter(p => {
      if (p.id === personId) return false

      const pParents = getParents(p.id)
      return pParents.mother?.id === motherId && pParents.father?.id === fatherId
    })
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

          {#if getSiblings(person.id).length > 0}
            <div style="margin-top: 1rem;">
              <strong>Siblings:</strong>
              <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                {#each getSiblings(person.id) as sibling}
                  <li>{sibling.firstName} {sibling.lastName}</li>
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
