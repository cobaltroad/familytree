<script>
  import { createEventDispatcher } from 'svelte'
  import QuickAddChild from './QuickAddChild.svelte'
  import { people as peopleStore, relationships as relationshipsStore } from '../stores/familyStore.js'
  import { createPersonRelationships } from '../stores/derivedStores.js'

  export let person = null
  export let people = []
  export let relationships = []

  const dispatch = createEventDispatcher()

  // Use stores if available, otherwise fall back to props
  // This provides backward compatibility while allowing gradual migration
  $: activePeople = ($peopleStore && $peopleStore.length > 0) ? $peopleStore : people
  $: activeRelationships = ($relationshipsStore && $relationshipsStore.length > 0) ? $relationshipsStore : relationships

  // State for showing/hiding quick add child form
  let showQuickAddChild = false

  // Use derived store for O(1) relationship lookups when stores are available
  // Falls back to manual computation for backward compatibility with prop-based approach
  $: personRelStore = person?.id && $peopleStore.length > 0 ? createPersonRelationships(person.id) : null
  $: derivedRels = personRelStore ? $personRelStore : null

  // Fallback: Manual computation for prop-based approach (backward compatibility)
  $: manualRels = person && !derivedRels ? computeRelationshipsManually(person, activePeople, activeRelationships) : null

  // Final relationships: prefer derived store, fallback to manual computation
  $: personRelationships = derivedRels || manualRels || {
    mother: null,
    father: null,
    siblings: [],
    children: []
  }

  // Manual computation for backward compatibility (used when stores are not available)
  function computeRelationshipsManually(person, people, relationships) {
    if (!person || relationships.length === 0) {
      return {
        mother: null,
        father: null,
        siblings: [],
        children: []
      }
    }

    // Find parents
    const motherRel = relationships.find(rel =>
      rel.type === 'parentOf' &&
      rel.person2Id === person.id &&
      rel.parentRole === 'mother'
    )
    const fatherRel = relationships.find(rel =>
      rel.type === 'parentOf' &&
      rel.person2Id === person.id &&
      rel.parentRole === 'father'
    )

    const mother = motherRel ? people.find(p => p.id === motherRel.person1Id) : null
    const father = fatherRel ? people.find(p => p.id === fatherRel.person1Id) : null

    // Find children
    const childRels = relationships.filter(rel =>
      rel.type === 'parentOf' && rel.person1Id === person.id
    )
    const children = childRels
      .map(rel => people.find(p => p.id === rel.person2Id))
      .filter(Boolean)

    // Find siblings (people who share at least one parent)
    const parentIds = [motherRel?.person1Id, fatherRel?.person1Id].filter(Boolean)
    let siblings = []
    if (parentIds.length > 0) {
      const siblingRels = relationships.filter(rel =>
        rel.type === 'parentOf' &&
        parentIds.includes(rel.person1Id) &&
        rel.person2Id !== person.id
      )
      const siblingIds = [...new Set(siblingRels.map(rel => rel.person2Id))]
      siblings = siblingIds
        .map(id => people.find(p => p.id === id))
        .filter(Boolean)
    }

    return { mother, father, siblings, children }
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

  // Format date as "DD MMM YYYY" (e.g., "15 May 1990")
  function formatDate(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr + 'T00:00:00') // Parse as local date
    const day = date.getDate()
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = monthNames[date.getMonth()]
    const year = date.getFullYear()
    return `${day} ${month} ${year}`
  }

  function handleShowQuickAddChild() {
    showQuickAddChild = true
  }

  function handleQuickAddChildSubmit(event) {
    dispatch('addChild', event.detail)
    showQuickAddChild = false
  }

  function handleQuickAddChildCancel() {
    showQuickAddChild = false
  }
</script>

<div class="card">
  <h2>{person ? 'Edit Person' : 'Add New Person'}</h2>

  <form id="person-form" on:submit|preventDefault={handleSubmit}>
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
      <label>Gender</label>
      <div class="radio-group">
        <label class="radio-label">
          <input
            type="radio"
            name="gender"
            value="female"
            checked={formData.gender === 'female'}
            on:change={() => formData.gender = 'female'}
          />
          female
        </label>
        <label class="radio-label">
          <input
            type="radio"
            name="gender"
            value="male"
            checked={formData.gender === 'male'}
            on:change={() => formData.gender = 'male'}
          />
          male
        </label>
        <label class="radio-label">
          <input
            type="radio"
            name="gender"
            value="other"
            checked={formData.gender === 'other'}
            on:change={() => formData.gender = 'other'}
          />
          other
        </label>
        <label class="radio-label">
          <input
            type="radio"
            name="gender"
            value=""
            checked={formData.gender === ''}
            on:change={() => formData.gender = ''}
          />
          unspecified
        </label>
      </div>
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

        {#if !showQuickAddChild}
          <button
            type="button"
            class="add-child-button"
            on:click={handleShowQuickAddChild}
          >
            + Add Child
          </button>
        {/if}

        {#if showQuickAddChild}
          <QuickAddChild
            parent={person}
            on:submit={handleQuickAddChildSubmit}
            on:cancel={handleQuickAddChildCancel}
          />
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
    color: #666;
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

  .radio-group {
    display: flex;
    gap: 1.5rem;
    margin-top: 0.5rem;
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-weight: normal;
  }

  .radio-label:has(input[type="radio"]:checked) {
    font-weight: bold;
  }

  .radio-label input[type="radio"] {
    cursor: pointer;
  }

  .add-child-button {
    margin-top: 0.75rem;
    background-color: #2196f3;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.2s;
  }

  .add-child-button:hover {
    background-color: #1976d2;
  }
</style>
