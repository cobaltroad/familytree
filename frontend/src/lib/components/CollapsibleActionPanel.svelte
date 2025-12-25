<script>
  /**
   * CollapsibleActionPanel - A reusable collapsible panel for relationship management
   *
   * Provides a consistent UI pattern for adding/linking related people:
   * - Collapsed state shows a trigger button with "+" icon
   * - Expanded state shows "Create New" and "Link Existing" options
   * - Slot-based content for QuickAdd forms and Link components
   *
   * @component
   */
  import { createEventDispatcher } from 'svelte'
  import { slide } from 'svelte/transition'

  /** @type {string} - Label text shown on trigger button when collapsed */
  export let label = ''

  /** @type {string} - Relationship type for analytics/testing (e.g., "mother", "father", "spouse") */
  export let relationshipType = ''

  /** @type {string} - Label for "Create New Person" button */
  export let createLabel = 'Create New Person'

  /** @type {string} - Label for "Link Existing Person" button */
  export let linkLabel = 'Link Existing Person'

  const dispatch = createEventDispatcher()

  // Generate unique IDs for accessibility (WCAG 2.1 AA compliance)
  const panelId = `panel-${Math.random().toString(36).substr(2, 9)}`
  const triggerId = `trigger-${Math.random().toString(36).substr(2, 9)}`

  // Component state
  let isExpanded = false
  let currentView = 'options' // 'options' | 'create' | 'link'
  let triggerButton

  // Expand panel to show options
  function expand() {
    isExpanded = true
    currentView = 'options'
  }

  // Collapse panel and reset state
  function collapse() {
    isExpanded = false
    currentView = 'options'

    // Return focus to trigger button
    if (triggerButton) {
      triggerButton.focus()
    }
  }

  // Toggle between expanded and collapsed
  function toggle() {
    if (isExpanded) {
      collapse()
    } else {
      expand()
    }
  }

  // Show create slot content
  function showCreate() {
    currentView = 'create'
  }

  // Show link slot content
  function showLink() {
    currentView = 'link'
  }

  // Handle keyboard navigation on trigger button
  function handleTriggerKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggle()
    } else if (event.key === 'Escape' && isExpanded) {
      event.preventDefault()
      collapse()
    }
  }

  // Computed values for display
  $: triggerText = isExpanded ? 'Cancel' : label
  $: triggerIcon = isExpanded ? '×' : '+'
  $: showOptions = isExpanded && currentView === 'options'
  $: showCreateSlot = isExpanded && currentView === 'create'
  $: showLinkSlot = isExpanded && currentView === 'link'

  // Export collapse function for parent components
  export function collapsePanel() {
    collapse()
  }
</script>

<div class="collapsible-action-panel" data-relationship-type={relationshipType}>
  <!-- Trigger Button -->
  <button
    bind:this={triggerButton}
    id={triggerId}
    class="trigger-button"
    class:expanded={isExpanded}
    type="button"
    tabindex="0"
    aria-expanded={isExpanded}
    aria-controls={panelId}
    on:click={toggle}
    on:keydown={handleTriggerKeyDown}
  >
    <span class="trigger-icon">{triggerIcon}</span>
    <span class="trigger-text">{triggerText}</span>
  </button>

  <!-- Options Panel -->
  {#if isExpanded}
    <div
      id={panelId}
      class="options-panel"
      role="region"
      aria-labelledby={triggerId}
      transition:slide={{ duration: 250 }}
    >
      {#if showOptions}
        <!-- Option Buttons -->
        <div class="action-buttons">
          <button
            type="button"
            class="create-button primary full-width"
            data-action="create"
            on:click={showCreate}
          >
            {createLabel}
          </button>
          <button
            type="button"
            class="link-button secondary full-width"
            data-action="link"
            on:click={showLink}
          >
            {linkLabel}
          </button>
        </div>
      {/if}

      {#if showCreateSlot}
        <!-- Create Slot Content -->
        <div class="slot-content" data-slot="create">
          <slot name="create" />
        </div>
      {/if}

      {#if showLinkSlot}
        <!-- Link Slot Content -->
        <div class="slot-content" data-slot="link">
          <slot name="link" />
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .collapsible-action-panel {
    margin-bottom: 1rem;
  }

  /* Trigger Button */
  .trigger-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1rem;
    min-height: 48px; /* WCAG 2.1 AA touch target size */
    background-color: #f5f5f5;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    font-size: 0.95rem;
    font-weight: 500;
    color: #333;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
  }

  .trigger-button:hover {
    background-color: #e8e8e8;
    border-color: #b0b0b0;
  }

  .trigger-button:focus {
    outline: 2px solid #4CAF50;
    outline-offset: 2px;
  }

  .trigger-button:focus:not(:focus-visible) {
    outline: none;
  }

  .trigger-button.expanded {
    background-color: #fff;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .trigger-icon {
    font-size: 1.25rem;
    font-weight: bold;
    line-height: 1;
    color: #666;
  }

  .trigger-text {
    flex: 1;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Options Panel */
  .options-panel {
    border: 1px solid #d0d0d0;
    border-top: none;
    border-radius: 0 0 4px 4px;
    background-color: #fff;
    overflow: hidden;
  }

  /* Action Buttons Container */
  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
  }

  /* Button Base Styles */
  .action-buttons button {
    padding: 0.75rem 1rem;
    min-height: 48px;
    border-radius: 4px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }

  .full-width {
    width: 100%;
  }

  /* Primary Button (Create) - Blue */
  .primary {
    background-color: #2196F3;
    color: #fff;
  }

  .primary:hover {
    background-color: #1976D2;
  }

  .primary:focus {
    outline: 2px solid #2196F3;
    outline-offset: 2px;
  }

  /* Secondary Button (Link) - Gray */
  .secondary {
    background-color: #9E9E9E;
    color: #fff;
  }

  .secondary:hover {
    background-color: #757575;
  }

  .secondary:focus {
    outline: 2px solid #9E9E9E;
    outline-offset: 2px;
  }

  /* Slot Content Container */
  .slot-content {
    padding: 1rem;
  }

  /* Mobile Responsive (< 768px) */
  @media (max-width: 767px) {
    .trigger-button {
      padding: 0.875rem 1rem;
      font-size: 0.9rem;
    }

    .action-buttons {
      padding: 0.875rem;
    }

    .action-buttons button {
      padding: 0.875rem 1rem;
      font-size: 0.9rem;
    }

    .slot-content {
      padding: 0.875rem;
    }
  }

  /* Tablet and Desktop Responsive (≥ 768px) */
  @media (min-width: 768px) {
    .trigger-button {
      padding: 0.75rem 1rem;
    }

    .action-buttons {
      padding: 1rem;
    }
  }

  /* Touch-friendly tap targets for mobile devices */
  @media (hover: none) and (pointer: coarse) {
    .trigger-button,
    .action-buttons button {
      min-height: 48px;
      padding: 0.875rem 1rem;
    }
  }

  /* Ensure buttons don't exceed container width */
  button {
    max-width: 100%;
    box-sizing: border-box;
  }
</style>
