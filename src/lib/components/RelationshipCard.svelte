<script>
  import { createEventDispatcher } from 'svelte'
  import { page } from '$app/stores'

  export let person = null
  export let relationshipType = ''
  export let relationship = null
  export let isMobile = false

  const dispatch = createEventDispatcher()

  // Story #84: Get user's defaultPersonId from session
  $: defaultPersonId = $page?.data?.session?.user?.defaultPersonId

  // Story #84: Check if this card shows the user's profile
  $: isUserProfile = person && defaultPersonId && person.id === defaultPersonId

  let isHovering = false

  function handleClick() {
    if (person) {
      dispatch('click', { person })
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
    }
  }

  function handleDeleteClick(event) {
    event.stopPropagation() // Prevent card click event
    if (relationship && person) {
      dispatch('delete', {
        relationship,
        person,
        relationshipType
      })
    }
  }

  function handleDeleteKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      event.stopPropagation()
      handleDeleteClick(event)
    }
  }

  function handleMouseEnter() {
    isHovering = true
  }

  function handleMouseLeave() {
    isHovering = false
  }

  // Format lifespan for display
  function formatLifespan(birthDate, deathDate) {
    if (!birthDate) return ''

    const birth = new Date(birthDate).getFullYear()
    const death = deathDate ? new Date(deathDate).getFullYear() : 'present'

    return `${birth}–${death}`
  }

  // Generate accessible label
  $: ariaLabel = person
    ? `View ${person.firstName} ${person.lastName}, ${relationshipType}`
    : relationshipType

  $: deleteAriaLabel = person && relationshipType
    ? `Remove ${person.firstName} ${person.lastName} as ${relationshipType}`
    : 'Remove relationship'

  $: lifespan = person ? formatLifespan(person.birthDate, person.deathDate) : ''

  // Show delete button on hover (desktop) or always (mobile)
  $: showDeleteButton = relationship && (isMobile || isHovering)
</script>

{#if person}
  <div
    class="relationship-card card"
    role="button"
    tabindex="0"
    aria-label={ariaLabel}
    on:click={handleClick}
    on:keydown={handleKeyDown}
    on:mouseenter={handleMouseEnter}
    on:mouseleave={handleMouseLeave}
  >
    <div class="card-content">
      <div class="photo-placeholder avatar person-icon">
        <span class="initials">
          {person.firstName?.[0] || ''}{person.lastName?.[0] || ''}
        </span>
      </div>

      <div class="person-info">
        <div class="relationship-type-row">
          <span class="relationship-type">{relationshipType}</span>
          {#if isUserProfile}
            <span class="you-badge">You</span>
          {/if}
        </div>
        <div class="person-name">{person.firstName} {person.lastName}</div>
        {#if lifespan}
          <div class="person-dates">{lifespan}</div>
        {/if}
      </div>

      {#if showDeleteButton}
        <button
          type="button"
          class="delete-button"
          aria-label={deleteAriaLabel}
          on:click={handleDeleteClick}
          on:keydown={handleDeleteKeyDown}
        >
          <span class="icon-trash" aria-hidden="true">🗑</span>
        </button>
      {/if}
    </div>
  </div>
{:else}
  <div class="relationship-card card empty">
    <div class="card-content">
      <div class="relationship-type">{relationshipType}</div>
      <div class="empty-message">No data available</div>
    </div>
  </div>
{/if}

<style>
  .relationship-card {
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  }

  .relationship-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-color: #4CAF50;
  }

  .relationship-card:focus {
    outline: 2px solid #4CAF50;
    outline-offset: 2px;
  }

  .relationship-card:focus:not(:focus-visible) {
    outline: none;
  }

  .relationship-card:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }

  .card-content {
    display: flex;
    align-items: center;
    gap: 1rem;
    position: relative;
  }

  .delete-button {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    background-color: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.375rem 0.5rem;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    min-height: 32px;
    z-index: 10;
  }

  .delete-button:hover {
    background-color: #d32f2f;
    transform: translateY(-50%) scale(1.05);
  }

  .delete-button:focus {
    outline: 2px solid #f44336;
    outline-offset: 2px;
  }

  .delete-button:active {
    transform: translateY(-50%) scale(0.95);
  }

  .icon-trash {
    display: inline-block;
    font-size: 1rem;
  }

  .photo-placeholder {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .initials {
    color: white;
    font-weight: 600;
    font-size: 1.125rem;
    text-transform: uppercase;
  }

  .person-info {
    flex: 1;
    min-width: 0;
  }

  .relationship-type-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .relationship-type {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #666;
    letter-spacing: 0.5px;
  }

  .you-badge {
    display: inline-block;
    background-color: #3b82f6;
    color: white;
    font-size: 0.625rem;
    font-weight: 600;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .person-name {
    font-size: 1rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 0.125rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .person-dates {
    font-size: 0.875rem;
    color: #666;
  }

  .empty-message {
    font-size: 0.875rem;
    color: #999;
    font-style: italic;
  }

  .relationship-card.empty {
    cursor: default;
    opacity: 0.6;
  }

  .relationship-card.empty:hover {
    transform: none;
    box-shadow: none;
    border-color: #e0e0e0;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .relationship-card {
      padding: 0.875rem;
    }

    .photo-placeholder {
      width: 40px;
      height: 40px;
    }

    .initials {
      font-size: 1rem;
    }

    .person-name {
      font-size: 0.9375rem;
    }

    .person-dates {
      font-size: 0.8125rem;
    }
  }

  /* Touch-friendly tap targets */
  @media (hover: none) and (pointer: coarse) {
    .relationship-card {
      min-height: 48px;
      padding: 1.125rem;
    }
  }
</style>
