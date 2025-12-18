<script>
  import { createEventDispatcher } from 'svelte'

  export let person = null
  export let people = []
  export let relationships = []

  const dispatch = createEventDispatcher()

  let personRelationships = {
    mother: null,
    father: null,
    siblings: [],
    children: []
  }

  // Find all relationships for this person
  $: if (person && relationships.length > 0) {
    // Find parents
    const motherRel = relationships.find(rel =>
      rel.type === 'parentOf' &&
      rel.person2Id === person.id &&
      rel.parentType === 'mother'
    )
    const fatherRel = relationships.find(rel =>
      rel.type === 'parentOf' &&
      rel.person2Id === person.id &&
      rel.parentType === 'father'
    )

    personRelationships.mother = motherRel ? people.find(p => p.id === motherRel.person1Id) : null
    personRelationships.father = fatherRel ? people.find(p => p.id === fatherRel.person1Id) : null

    // Find children
    const childRels = relationships.filter(rel =>
      rel.type === 'parentOf' && rel.person1Id === person.id
    )
    personRelationships.children = childRels
      .map(rel => people.find(p => p.id === rel.person2Id))
      .filter(Boolean)

    // Find siblings (people who share at least one parent)
    const parentIds = [motherRel?.person1Id, fatherRel?.person1Id].filter(Boolean)
    if (parentIds.length > 0) {
      const siblingRels = relationships.filter(rel =>
        rel.type === 'parentOf' &&
        parentIds.includes(rel.person1Id) &&
        rel.person2Id !== person.id
      )
      const siblingIds = [...new Set(siblingRels.map(rel => rel.person2Id))]
      personRelationships.siblings = siblingIds
        .map(id => people.find(p => p.id === id))
        .filter(Boolean)
    } else {
      personRelationships.siblings = []
    }
  } else {
    personRelationships = {
      mother: null,
      father: null,
      siblings: [],
      children: []
    }
  }

  let formData = {
    firstName: '',
    lastName: '',
    birthDate: '',
    deathDate: '',
    gender: ''
  }

  let isAlive = true

  // Reactive update when person prop changes
  $: if (person) {
    formData = {
      firstName: person.firstName || '',
      lastName: person.lastName || '',
      birthDate: person.birthDate || '',
      deathDate: person.deathDate || '',
      gender: person.gender || ''
    }
    isAlive = !person.deathDate
  }

  $: if (isAlive) {
    formData.deathDate = ''
  }

  function handleSubmit() {
    const data = {
      ...formData,
      birthDate: formData.birthDate || null,
      deathDate: formData.deathDate || null,
      gender: formData.gender || null
    }

    if (person) {
      // Include ID for update
      dispatch('submit', { ...data, id: person.id })
    } else {
      dispatch('submit', data)
    }

    resetForm()
  }

  function resetForm() {
    if (!person) {
      formData = {
        firstName: '',
        lastName: '',
        birthDate: '',
        deathDate: '',
        gender: ''
      }
      isAlive = true
    }
  }

  export function clearForm() {
    person = null
    formData = {
      firstName: '',
      lastName: '',
      birthDate: '',
      deathDate: '',
      gender: ''
    }
    isAlive = true
  }
</script>

<div class="card">
  <h2>{person ? 'Edit Person' : 'Add New Person'}</h2>
  <form on:submit|preventDefault={handleSubmit}>
    <div class="form-group">
      <label for="firstName">First Name *</label>
      <input
        id="firstName"
        type="text"
        bind:value={formData.firstName}
        required
      />
    </div>

    <div class="form-group">
      <label for="lastName">Last Name *</label>
      <input
        id="lastName"
        type="text"
        bind:value={formData.lastName}
        required
      />
    </div>

    <div class="form-group">
      <label for="gender">Gender</label>
      <select id="gender" bind:value={formData.gender}>
        <option value="">Select...</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
        <option value="Other">Other</option>
      </select>
    </div>

    <div class="form-group">
      <label for="birthDate">Birth Date</label>
      <input
        id="birthDate"
        type="date"
        bind:value={formData.birthDate}
      />
    </div>

    <div class="form-group">
      <label>
        <input
          type="checkbox"
          bind:checked={isAlive}
        />
        Still Alive
      </label>
    </div>

    {#if !isAlive}
      <div class="form-group">
        <label for="deathDate">Death Date</label>
        <input
          id="deathDate"
          type="date"
          bind:value={formData.deathDate}
        />
      </div>
    {/if}

    <div style="display: flex; gap: 0.5rem;">
      <button type="submit" class="primary">
        {person ? 'Update' : 'Add'} Person
      </button>
      {#if person}
        <button type="button" on:click={clearForm}>
          Cancel
        </button>
      {/if}
    </div>
  </form>

  {#if person}
    <div class="relationships-section">
      <h3>Relationships</h3>

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
  {/if}
</div>

<style>
  .relationships-section {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 2px solid #e0e0e0;
  }

  .relationships-section h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #333;
  }

  .relationship-category {
    margin-bottom: 1.5rem;
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
    padding: 0.5rem 0.75rem;
    background: #f5f5f5;
    border-radius: 4px;
    margin-bottom: 0.5rem;
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
</style>
