<script>
  export let title = ''
  export let count = undefined

  // Format title with count
  $: displayTitle = count !== undefined && count > 0 ? `${title} (${count})` : title
</script>

<section class="relationship-card-grid-section" aria-label={title || 'Relationships'}>
  {#if title}
    <h3 class="section-title grid-title">{displayTitle}</h3>
  {/if}

  <div class="relationship-card-grid card-grid grid-container">
    <slot />
  </div>
</section>

<style>
  .relationship-card-grid-section {
    margin-bottom: 1.5rem;
  }

  .section-title {
    font-size: 1rem;
    font-weight: 600;
    color: #333;
    margin: 0 0 1rem 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .relationship-card-grid {
    display: grid;
    gap: 1rem;
  }

  /* Desktop (>=1024px): 3 cards per row */
  @media (min-width: 1024px) {
    .relationship-card-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  /* Tablet (768-1023px): 2 cards per row */
  @media (min-width: 768px) and (max-width: 1023px) {
    .relationship-card-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* Mobile (<768px): 1 card per row (full width) */
  @media (max-width: 767px) {
    .relationship-card-grid {
      grid-template-columns: 1fr;
    }

    .section-title {
      font-size: 0.9375rem;
    }
  }

  /* Ensure smooth responsive transitions */
  .relationship-card-grid {
    transition: grid-template-columns 0.3s ease;
  }
</style>
