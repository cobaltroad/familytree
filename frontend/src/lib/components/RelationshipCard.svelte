<script>
  import { createEventDispatcher } from 'svelte'

  export let person = null
  export let relationshipType = ''

  const dispatch = createEventDispatcher()

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

  $: lifespan = person ? formatLifespan(person.birthDate, person.deathDate) : ''
</script>

{#if person}
  <div
    class="relationship-card card"
    role="button"
    tabindex="0"
    aria-label={ariaLabel}
    on:click={handleClick}
    on:keydown={handleKeyDown}
  >
    <div class="card-content">
      <div class="photo-placeholder avatar person-icon">
        <span class="initials">
          {person.firstName?.[0] || ''}{person.lastName?.[0] || ''}
        </span>
      </div>

      <div class="person-info">
        <div class="relationship-type">{relationshipType}</div>
        <div class="person-name">{person.firstName} {person.lastName}</div>
        {#if lifespan}
          <div class="person-dates">{lifespan}</div>
        {/if}
      </div>
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

  .relationship-type {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #666;
    margin-bottom: 0.25rem;
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
