<script>
  import { createEventDispatcher } from 'svelte'
  import { slide } from 'svelte/transition'

  export let title = ''
  export let expanded = false
  export let count = undefined

  const dispatch = createEventDispatcher()

  // Generate unique ID for accessibility
  const sectionId = `section-${Math.random().toString(36).substr(2, 9)}`

  // Internal state to track expanded/collapsed
  let isExpanded = expanded

  // React to prop changes
  $: isExpanded = expanded

  function toggle() {
    isExpanded = !isExpanded
    dispatch('toggle', { expanded: isExpanded })
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggle()
    }
  }

  // Format title with count
  $: displayTitle = count !== undefined && count > 0 ? `${title} (${count})` : title

  // Aria label for accessibility
  $: ariaLabel = `${isExpanded ? 'Collapse' : 'Expand'} ${title} section`
</script>

<div class="collapsible-section">
  <div
    class="section-header"
    role="button"
    tabindex="0"
    aria-expanded={isExpanded}
    aria-controls={sectionId}
    aria-label={ariaLabel}
    on:click={toggle}
    on:keydown={handleKeyDown}
  >
    <h3 class="section-title">{displayTitle}</h3>
    <span class="chevron toggle-icon" class:expanded={isExpanded}>▼</span>
  </div>

  {#if isExpanded}
    <div
      id={sectionId}
      class="section-content expanded"
      transition:slide={{ duration: 250 }}
    >
      <slot />
    </div>
  {:else}
    <div
      id={sectionId}
      class="section-content collapsed"
      style="max-height: 0px; overflow: hidden;"
    >
    </div>
  {/if}
</div>

<style>
  .collapsible-section {
    margin-bottom: 1rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background-color: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    cursor: pointer;
    user-select: none;
    transition: background-color 0.2s;
  }

  .section-header:hover {
    background-color: #ececec;
  }

  .section-header:focus {
    outline: 2px solid #4CAF50;
    outline-offset: 2px;
  }

  .section-header:focus:not(:focus-visible) {
    outline: none;
  }

  .section-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
  }

  .chevron {
    display: inline-block;
    transition: transform 0.25s ease;
    color: #666;
    font-size: 0.875rem;
  }

  .chevron.expanded {
    transform: rotate(180deg);
  }

  .section-content {
    transition: max-height 0.25s ease, opacity 0.25s ease;
  }

  .section-content.expanded {
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-top: none;
    border-radius: 0 0 4px 4px;
  }

  .section-content.collapsed {
    opacity: 0;
    padding: 0;
    border: none;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .section-header {
      padding: 0.875rem;
    }

    .section-title {
      font-size: 1rem;
    }

    .section-content.expanded {
      padding: 0.875rem;
    }
  }

  /* Touch-friendly tap targets */
  @media (hover: none) and (pointer: coarse) {
    .section-header {
      padding: 1.125rem;
      min-height: 48px; /* WCAG 2.1 AA touch target size */
    }
  }
</style>
