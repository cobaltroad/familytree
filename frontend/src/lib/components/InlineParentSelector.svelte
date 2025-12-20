<script>
  import { createEventDispatcher } from 'svelte'
  import { people } from '../../stores/familyStore.js'

  export let parentRole = 'mother' // 'mother' or 'father'
  export let currentParentId = null
  export let excludePersonId = null

  const dispatch = createEventDispatcher()

  // Generate unique ID for accessibility
  const selectId = `parent-select-${Math.random().toString(36).substr(2, 9)}`

  // Filter people by gender and exclude self
  $: eligiblePeople = $people.filter(person => {
    // Exclude self
    if (person.id === excludePersonId) return false

    // Filter by gender for parent role
    if (parentRole === 'mother') {
      return person.gender === 'female'
    } else if (parentRole === 'father') {
      return person.gender === 'male'
    }

    return false
  })

  // Handle selection change
  function handleChange(event) {
    const value = event.target.value
    const parentId = value === '' ? null : parseInt(value, 10)

    dispatch('select', { parentId, parentRole })
  }

  // Handle remove button click
  function handleRemove() {
    dispatch('remove', { parentRole })
  }

  // Capitalize parent role for display
  $: displayRole = parentRole.charAt(0).toUpperCase() + parentRole.slice(1)

  // Generate aria labels
  $: selectAriaLabel = `Select ${displayRole}`
  $: removeAriaLabel = `Remove ${displayRole}`
</script>

<div class="inline-parent-selector">
  <label for={selectId} class="parent-label">
    {displayRole}
  </label>

  <div class="selector-controls">
    <select
      id={selectId}
      class="parent-select"
      aria-label={selectAriaLabel}
      value={currentParentId || ''}
      on:change={handleChange}
    >
      <option value="">No {parentRole}</option>
      {#each eligiblePeople as person (person.id)}
        <option value={person.id}>
          {person.firstName} {person.lastName}
          {#if person.birthDate}
            (b. {new Date(person.birthDate).getFullYear()})
          {/if}
        </option>
      {/each}
    </select>

    {#if currentParentId}
      <button
        type="button"
        class="remove-button"
        aria-label={removeAriaLabel}
        on:click={handleRemove}
      >
        ×
      </button>
    {/if}
  </div>
</div>

<style>
  .inline-parent-selector {
    margin-bottom: 1rem;
  }

  .parent-label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    font-size: 0.875rem;
    color: #333;
    text-transform: capitalize;
  }

  .selector-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .parent-select {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
    background-color: white;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .parent-select:hover {
    border-color: #4CAF50;
  }

  .parent-select:focus {
    outline: 2px solid #4CAF50;
    outline-offset: 2px;
    border-color: #4CAF50;
  }

  .parent-select:focus:not(:focus-visible) {
    outline: none;
  }

  .remove-button {
    width: 32px;
    height: 32px;
    min-width: 32px;
    padding: 0;
    border: 1px solid #e57373;
    border-radius: 4px;
    background-color: #ffebee;
    color: #c62828;
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .remove-button:hover {
    background-color: #ef5350;
    color: white;
    border-color: #c62828;
  }

  .remove-button:focus {
    outline: 2px solid #c62828;
    outline-offset: 2px;
  }

  .remove-button:focus:not(:focus-visible) {
    outline: none;
  }

  .remove-button:active {
    transform: scale(0.95);
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .parent-label {
      font-size: 0.8125rem;
    }

    .parent-select {
      font-size: 0.9375rem;
      padding: 0.625rem;
    }

    .remove-button {
      width: 36px;
      height: 36px;
      min-width: 36px;
    }
  }

  /* Touch-friendly tap targets */
  @media (hover: none) and (pointer: coarse) {
    .parent-select {
      min-height: 48px;
    }

    .remove-button {
      min-height: 48px;
      min-width: 48px;
      width: 48px;
      height: 48px;
    }
  }
</style>
