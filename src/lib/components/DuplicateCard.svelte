<script>
  import { createEventDispatcher } from 'svelte'

  export let duplicate

  const dispatch = createEventDispatcher()

  function handleReviewMerge() {
    dispatch('reviewMerge', {
      person1: duplicate.person1,
      person2: duplicate.person2
    })
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleReviewMerge()
    }
  }

  // Determine confidence badge color class
  function getConfidenceClass(confidence) {
    if (confidence >= 90) return 'confidence-high'
    if (confidence >= 75) return 'confidence-medium'
    return 'confidence-low'
  }

  // Format date for display
  function formatDate(dateString) {
    if (!dateString) return ''
    return dateString
  }

  $: confidenceClass = getConfidenceClass(duplicate.confidence)
  $: ariaLabel = `Potential duplicate: ${duplicate.person1.name} and ${duplicate.person2.name}, ${duplicate.confidence}% match confidence`
</script>

<article class="duplicate-card" role="article" aria-label={ariaLabel}>
  <div class="card-header">
    <div class="confidence-badge {confidenceClass}">
      {duplicate.confidence}%
    </div>
  </div>

  <div class="card-body">
    <div class="person-comparison">
      <div class="person-info">
        <div class="person-label">Person A</div>
        <div class="person-name">{duplicate.person1.name}</div>
        {#if duplicate.person1.birthDate}
          <div class="person-date">{formatDate(duplicate.person1.birthDate)}</div>
        {/if}
      </div>

      <div class="vs-divider">
        <span class="vs-text">vs</span>
      </div>

      <div class="person-info">
        <div class="person-label">Person B</div>
        <div class="person-name">{duplicate.person2.name}</div>
        {#if duplicate.person2.birthDate}
          <div class="person-date">{formatDate(duplicate.person2.birthDate)}</div>
        {/if}
      </div>
    </div>

    {#if duplicate.matchingFields && duplicate.matchingFields.length > 0}
      <div class="matching-fields">
        <span class="fields-label">Matching:</span>
        {#each duplicate.matchingFields as field}
          <span class="field-badge">{field}</span>
        {/each}
      </div>
    {/if}
  </div>

  <div class="card-footer">
    <button
      type="button"
      class="review-merge-button"
      on:click={handleReviewMerge}
      on:keydown={handleKeyDown}
      aria-label="Review merge options for {duplicate.person1.name} and {duplicate.person2.name}"
    >
      Review Merge
    </button>
  </div>
</article>

<style>
  .duplicate-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1rem;
    transition: all 0.2s ease;
  }

  .duplicate-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: #4CAF50;
  }

  .card-header {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1rem;
  }

  .confidence-badge {
    display: inline-block;
    padding: 0.375rem 0.75rem;
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.875rem;
    text-align: center;
    min-width: 60px;
  }

  .confidence-high {
    background-color: #4CAF50;
    color: white;
  }

  .confidence-medium {
    background-color: #FF9800;
    color: white;
  }

  .confidence-low {
    background-color: #F44336;
    color: white;
  }

  .card-body {
    margin-bottom: 1.5rem;
  }

  .person-comparison {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 1.5rem;
    align-items: center;
  }

  .person-info {
    text-align: center;
  }

  .person-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #666;
    letter-spacing: 0.5px;
    margin-bottom: 0.5rem;
  }

  .person-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 0.25rem;
  }

  .person-date {
    font-size: 0.875rem;
    color: #666;
  }

  .vs-divider {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
  }

  .vs-text {
    font-size: 0.875rem;
    font-weight: 600;
    color: #999;
    text-transform: uppercase;
  }

  .matching-fields {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #f0f0f0;
  }

  .fields-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
  }

  .field-badge {
    display: inline-block;
    padding: 0.25rem 0.625rem;
    background-color: #E3F2FD;
    color: #1976D2;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .card-footer {
    display: flex;
    justify-content: center;
  }

  .review-merge-button {
    padding: 0.75rem 2rem;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .review-merge-button:hover {
    background-color: #45a049;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
  }

  .review-merge-button:active {
    transform: translateY(0);
    box-shadow: 0 1px 4px rgba(76, 175, 80, 0.3);
  }

  .review-merge-button:focus {
    outline: 2px solid #4CAF50;
    outline-offset: 2px;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .duplicate-card {
      padding: 1rem;
    }

    .person-comparison {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .vs-divider {
      width: 100%;
      margin: 0.5rem 0;
    }

    .vs-text {
      font-size: 0.75rem;
    }

    .person-name {
      font-size: 1rem;
    }

    .review-merge-button {
      width: 100%;
      padding: 0.875rem;
    }
  }
</style>
