<script>
  import { createEventDispatcher, onMount } from 'svelte'

  export let people = []
  export let placeholder = 'Search for people...'
  export let label = ''
  export let filterFunction = null

  const dispatch = createEventDispatcher()

  let searchQuery = ''
  let isOpen = false
  let highlightedIndex = -1
  let inputElement
  let selectedPeople = []

  // Filter and search people
  $: filteredPeople = filterPeople(people, searchQuery, filterFunction)

  /**
   * Filters people based on search query and custom filter function.
   * Implements fuzzy search across first name and last name.
   */
  function filterPeople(peopleList, query, customFilter) {
    let filtered = peopleList

    // Apply custom filter first if provided
    if (customFilter && typeof customFilter === 'function') {
      filtered = filtered.filter(customFilter)
    }

    // Apply search query filter
    if (query && query.trim()) {
      const lowerQuery = query.toLowerCase().trim()
      filtered = filtered.filter(person => {
        const firstName = (person.firstName || '').toLowerCase()
        const lastName = (person.lastName || '').toLowerCase()
        const fullName = `${firstName} ${lastName}`
        return fullName.includes(lowerQuery) || firstName.includes(lowerQuery) || lastName.includes(lowerQuery)
      })
    }

    return filtered
  }

  /**
   * Formats person display with name and birth year.
   */
  function formatPersonDisplay(person) {
    const name = `${person.firstName} ${person.lastName}`
    if (person.birthDate) {
      const year = new Date(person.birthDate).getFullYear()
      return `${name} (b. ${year})`
    }
    return name
  }

  /**
   * Checks if a person is currently selected.
   */
  function isPersonSelected(person) {
    return selectedPeople.some(p => p.id === person.id)
  }

  /**
   * Handles input focus - opens dropdown.
   */
  function handleFocus() {
    isOpen = true
  }

  /**
   * Handles input change - opens dropdown.
   */
  function handleInput() {
    if (!isOpen) {
      isOpen = true
    }
  }

  /**
   * Handles input blur - closes dropdown after brief delay (to allow click events).
   */
  function handleBlur() {
    setTimeout(() => {
      isOpen = false
      highlightedIndex = -1
    }, 200)
  }

  /**
   * Handles person selection - toggles selection.
   */
  function togglePersonSelection(person) {
    if (isPersonSelected(person)) {
      // Deselect
      selectedPeople = selectedPeople.filter(p => p.id !== person.id)
    } else {
      // Select
      selectedPeople = [...selectedPeople, person]
    }

    // Dispatch selection change event
    dispatch('selectionChange', selectedPeople)

    // Don't close dropdown, keep it open for multi-select
    // Don't clear search query - let user continue searching/selecting
  }

  /**
   * Removes a person from selection (from chip).
   */
  function removePerson(person, event) {
    event.stopPropagation()
    selectedPeople = selectedPeople.filter(p => p.id !== person.id)
    dispatch('selectionChange', selectedPeople)
  }

  /**
   * Clears all selections.
   */
  function clearAll(event) {
    event.stopPropagation()
    selectedPeople = []
    dispatch('selectionChange', selectedPeople)
  }

  /**
   * Handles keyboard navigation.
   */
  function handleKeydown(event) {
    if (!isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        isOpen = true
        event.preventDefault()
      }
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        highlightedIndex = (highlightedIndex + 1) % filteredPeople.length
        break
      case 'ArrowUp':
        event.preventDefault()
        highlightedIndex = highlightedIndex <= 0 ? filteredPeople.length - 1 : highlightedIndex - 1
        break
      case 'Enter':
        event.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredPeople.length) {
          togglePersonSelection(filteredPeople[highlightedIndex])
        }
        break
      case 'Escape':
        event.preventDefault()
        isOpen = false
        highlightedIndex = -1
        searchQuery = ''
        break
    }
  }

  /**
   * Handles option mouse enter for highlight.
   */
  function handleOptionMouseEnter(index) {
    highlightedIndex = index
  }

  /**
   * Generate unique ID for option.
   */
  function getOptionId(person, index) {
    return `person-multi-option-${person.id}-${index}`
  }

  /**
   * Get ARIA activedescendant value.
   */
  $: activeDescendantId = highlightedIndex >= 0 && highlightedIndex < filteredPeople.length
    ? getOptionId(filteredPeople[highlightedIndex], highlightedIndex)
    : ''
</script>

<div class="person-multi-select">
  {#if label}
    <label for="person-multi-search" class="multi-select-label">
      {label}
    </label>
  {/if}

  <div class="multi-select-wrapper">
    <!-- Selected People Chips -->
    {#if selectedPeople.length > 0}
      <div class="selected-chips" role="list" aria-label="Selected people">
        {#each selectedPeople as person (person.id)}
          <div class="chip" role="listitem">
            <span class="chip-text">{person.firstName} {person.lastName}</span>
            <button
              type="button"
              class="chip-remove"
              aria-label="Remove {person.firstName} {person.lastName}"
              on:click={(e) => removePerson(person, e)}
            >
              &times;
            </button>
          </div>
        {/each}
        <button
          type="button"
          class="clear-all-button"
          on:click={clearAll}
          aria-label="Clear all selections"
        >
          Clear all
        </button>
      </div>
    {/if}

    <input
      id="person-multi-search"
      type="text"
      bind:value={searchQuery}
      bind:this={inputElement}
      {placeholder}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      aria-controls="person-multi-listbox"
      aria-activedescendant={activeDescendantId}
      aria-label={label || 'Search for people'}
      on:focus={handleFocus}
      on:blur={handleBlur}
      on:input={handleInput}
      on:keydown={handleKeydown}
    />

    {#if selectedPeople.length > 0}
      <div class="selection-badge" aria-label="{selectedPeople.length} people selected">
        {selectedPeople.length} selected
      </div>
    {/if}

    {#if isOpen}
      <ul
        id="person-multi-listbox"
        role="listbox"
        aria-multiselectable="true"
        class="multi-select-dropdown"
        aria-label="Person suggestions"
      >
        {#if filteredPeople.length === 0}
          <li class="no-results" role="status">
            No people found
          </li>
        {:else}
          {#each filteredPeople as person, index (person.id)}
            {@const selected = isPersonSelected(person)}
            <li
              id={getOptionId(person, index)}
              role="option"
              aria-selected={selected.toString()}
              class:highlighted={index === highlightedIndex}
              class:selected={selected}
              on:click={() => togglePersonSelection(person)}
              on:mouseenter={() => handleOptionMouseEnter(index)}
              on:keydown
            >
              {#if selected}
                <span class="checkmark" aria-hidden="true">✓</span>
              {/if}
              {formatPersonDisplay(person)}
            </li>
          {/each}
        {/if}
      </ul>
    {/if}
  </div>

  <div class="help-text" aria-live="polite" aria-atomic="true">
    {#if isOpen && filteredPeople.length > 0}
      {filteredPeople.length} {filteredPeople.length === 1 ? 'person' : 'people'} found. Click to select/deselect.
    {:else if isOpen && filteredPeople.length === 0}
      No matching people found. Try a different search.
    {:else if selectedPeople.length > 0}
      {selectedPeople.length} {selectedPeople.length === 1 ? 'person' : 'people'} selected
    {:else}
      Search by name to find people
    {/if}
  </div>

  <!-- Screen reader live region for selection announcements -->
  <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
    {#if selectedPeople.length > 0}
      {selectedPeople.length} {selectedPeople.length === 1 ? 'person' : 'people'} selected
    {/if}
  </div>
</div>

<style>
  .person-multi-select {
    position: relative;
    width: 100%;
  }

  .multi-select-label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #333;
  }

  .multi-select-wrapper {
    position: relative;
  }

  .selected-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    background-color: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 4px;
    align-items: center;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.625rem;
    background-color: #4CAF50;
    color: white;
    border-radius: 16px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .chip-text {
    line-height: 1;
  }

  .chip-remove {
    background: none;
    border: none;
    color: white;
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    margin: 0;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s;
  }

  .chip-remove:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }

  .chip-remove:focus {
    outline: 2px solid white;
    outline-offset: 1px;
  }

  .clear-all-button {
    padding: 0.375rem 0.75rem;
    background-color: #757575;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .clear-all-button:hover {
    background-color: #616161;
  }

  .clear-all-button:focus {
    outline: 2px solid #4CAF50;
    outline-offset: 2px;
  }

  input[type="text"] {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
    transition: border-color 0.2s;
  }

  input[type="text"]:focus {
    outline: none;
    border-color: #4CAF50;
    box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
  }

  .selection-badge {
    position: absolute;
    top: 0.5rem;
    right: 0.75rem;
    background-color: #4CAF50;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    pointer-events: none;
  }

  .multi-select-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-height: 300px;
    overflow-y: auto;
    background: white;
    border: 1px solid #ddd;
    border-top: none;
    border-radius: 0 0 4px 4px;
    margin: 0;
    padding: 0;
    list-style: none;
    z-index: 1000;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .multi-select-dropdown li {
    padding: 0.75rem;
    cursor: pointer;
    transition: background-color 0.15s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .multi-select-dropdown li:hover,
  .multi-select-dropdown li.highlighted {
    background-color: #f0f0f0;
  }

  .multi-select-dropdown li.selected {
    background-color: #e8f5e9;
    font-weight: 500;
  }

  .multi-select-dropdown li[aria-selected="true"] {
    background-color: #e8f5e9;
  }

  .checkmark {
    color: #4CAF50;
    font-weight: bold;
    font-size: 1rem;
  }

  .no-results {
    padding: 0.75rem;
    color: #999;
    font-style: italic;
    cursor: default;
  }

  .no-results:hover {
    background-color: transparent;
  }

  .help-text {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: #666;
    min-height: 1.25rem;
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

  /* Accessibility */
  .multi-select-dropdown li:focus {
    outline: 2px solid #4CAF50;
    outline-offset: -2px;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .multi-select-dropdown {
      max-height: 200px;
    }

    input[type="text"] {
      padding: 0.625rem;
    }

    .chip {
      font-size: 0.8rem;
      padding: 0.3rem 0.5rem;
    }
  }
</style>
