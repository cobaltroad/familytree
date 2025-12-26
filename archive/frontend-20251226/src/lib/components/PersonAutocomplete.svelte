<script>
  import { createEventDispatcher, onMount } from 'svelte'

  export let people = []
  export let placeholder = 'Search for a person...'
  export let label = ''
  export let filterFunction = null

  const dispatch = createEventDispatcher()

  let searchQuery = ''
  let isOpen = false
  let highlightedIndex = -1
  let inputElement

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
   * Handles person selection.
   */
  function selectPerson(person) {
    dispatch('select', person)
    searchQuery = ''
    isOpen = false
    highlightedIndex = -1
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
          selectPerson(filteredPeople[highlightedIndex])
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
    return `person-option-${person.id}-${index}`
  }

  /**
   * Get ARIA activedescendant value.
   */
  $: activeDescendantId = highlightedIndex >= 0 && highlightedIndex < filteredPeople.length
    ? getOptionId(filteredPeople[highlightedIndex], highlightedIndex)
    : ''
</script>

<div class="person-autocomplete">
  {#if label}
    <label for="person-search" class="autocomplete-label">
      {label}
    </label>
  {/if}

  <div class="autocomplete-wrapper">
    <input
      id="person-search"
      type="text"
      bind:value={searchQuery}
      bind:this={inputElement}
      {placeholder}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={isOpen}
      aria-controls="person-listbox"
      aria-activedescendant={activeDescendantId}
      aria-label={label || 'Search for a person'}
      on:focus={handleFocus}
      on:blur={handleBlur}
      on:input={handleInput}
      on:keydown={handleKeydown}
    />

    {#if isOpen}
      <ul
        id="person-listbox"
        role="listbox"
        class="autocomplete-dropdown"
        aria-label="Person suggestions"
      >
        {#if filteredPeople.length === 0}
          <li class="no-results" role="status">
            No people found
          </li>
        {:else}
          {#each filteredPeople as person, index (person.id)}
            <li
              id={getOptionId(person, index)}
              role="option"
              aria-selected={index === highlightedIndex}
              class:highlighted={index === highlightedIndex}
              on:click={() => selectPerson(person)}
              on:mouseenter={() => handleOptionMouseEnter(index)}
              on:keydown
            >
              {formatPersonDisplay(person)}
            </li>
          {/each}
        {/if}
      </ul>
    {/if}
  </div>

  <div class="help-text" aria-live="polite" aria-atomic="true">
    {#if isOpen && filteredPeople.length > 0}
      {filteredPeople.length} {filteredPeople.length === 1 ? 'person' : 'people'} found. Use arrow keys to navigate, Enter to select, Escape to close.
    {:else if isOpen && filteredPeople.length === 0}
      No matching people found. Try a different search.
    {:else}
      Search by name to find a person
    {/if}
  </div>
</div>

<style>
  .person-autocomplete {
    position: relative;
    width: 100%;
  }

  .autocomplete-label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #333;
  }

  .autocomplete-wrapper {
    position: relative;
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

  .autocomplete-dropdown {
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

  .autocomplete-dropdown li {
    padding: 0.75rem;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .autocomplete-dropdown li:hover,
  .autocomplete-dropdown li.highlighted {
    background-color: #f0f0f0;
  }

  .autocomplete-dropdown li[aria-selected="true"] {
    background-color: #e8f5e9;
    font-weight: 500;
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

  /* Accessibility */
  .autocomplete-dropdown li:focus {
    outline: 2px solid #4CAF50;
    outline-offset: -2px;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .autocomplete-dropdown {
      max-height: 200px;
    }

    input[type="text"] {
      padding: 0.625rem;
    }
  }
</style>
