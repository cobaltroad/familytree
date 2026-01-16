<script>
  import { onMount } from 'svelte'
  import { api } from './api.js'
  import DuplicateCard from './components/DuplicateCard.svelte'

  let duplicates = []
  let loading = true
  let error = null

  onMount(() => {
    loadDuplicates()
  })

  async function loadDuplicates() {
    loading = true
    error = null

    try {
      const data = await api.getPeopleDuplicates()
      // Sort by confidence (highest first)
      duplicates = data.sort((a, b) => b.confidence - a.confidence)
    } catch (err) {
      error = err.message
      console.error('Failed to load duplicates:', err)
    } finally {
      loading = false
    }
  }

  function handleRetry() {
    loadDuplicates()
  }

  function handleBackToTree() {
    window.location.hash = '#/pedigree'
  }

  function handleReviewMerge(event) {
    // Dispatch event to parent component or handle navigation
    // For now, this is a placeholder for future merge workflow
    const { person1, person2 } = event.detail
    console.log('Review merge requested:', person1, person2)
    // Future: Navigate to merge review interface
  }
</script>

<div class="duplicate-detection">
  {#if loading}
    <div class="loading-state">
      <div class="spinner" aria-label="Loading" role="status"></div>
      <p>Scanning for duplicates...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <div class="error-icon" aria-hidden="true">⚠️</div>
      <h2>Error Loading Duplicates</h2>
      <p class="error-message">{error}</p>
      <button
        type="button"
        class="retry-button"
        on:click={handleRetry}
        aria-label="Try again to load duplicates"
      >
        Try Again
      </button>
    </div>
  {:else if duplicates.length === 0}
    <div class="empty-state">
      <div class="checkmark-icon" aria-hidden="true">✓</div>
      <h2>No Duplicates Found</h2>
      <p>Your family tree looks clean! No potential duplicate records were detected.</p>
      <button
        type="button"
        class="back-button"
        on:click={handleBackToTree}
        aria-label="Back to tree view"
      >
        Back to Tree
      </button>
    </div>
  {:else}
    <div class="duplicates-container">
      <div class="header">
        <h2>Potential Duplicates Detected</h2>
        <p class="subtitle">
          Found {duplicates.length} potential duplicate
          {duplicates.length === 1 ? 'pair' : 'pairs'} in your family tree.
          Review each match and choose whether to merge or keep them separate.
        </p>
      </div>

      <div class="duplicates-list" role="list">
        {#each duplicates as duplicate (duplicate.person1.id + '-' + duplicate.person2.id)}
          <DuplicateCard
            {duplicate}
            on:reviewMerge={handleReviewMerge}
          />
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .duplicate-detection {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  /* Loading State */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: 1.5rem;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #4CAF50;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .loading-state p {
    font-size: 1.125rem;
    color: #666;
    margin: 0;
  }

  /* Error State */
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: 1rem;
    text-align: center;
  }

  .error-icon {
    font-size: 4rem;
    margin-bottom: 0.5rem;
  }

  .error-state h2 {
    font-size: 1.75rem;
    color: #333;
    margin: 0;
  }

  .error-message {
    font-size: 1rem;
    color: #666;
    max-width: 500px;
    margin: 0;
  }

  .retry-button {
    margin-top: 1rem;
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

  .retry-button:hover {
    background-color: #45a049;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
  }

  .retry-button:focus {
    outline: 2px solid #4CAF50;
    outline-offset: 2px;
  }

  /* Empty State */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: 1rem;
    text-align: center;
  }

  .checkmark-icon {
    width: 80px;
    height: 80px;
    background-color: #4CAF50;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  .empty-state h2 {
    font-size: 1.75rem;
    color: #333;
    margin: 0;
  }

  .empty-state p {
    font-size: 1rem;
    color: #666;
    max-width: 500px;
    margin: 0;
  }

  .back-button {
    margin-top: 1rem;
    padding: 0.75rem 2rem;
    background-color: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .back-button:hover {
    background-color: #1976D2;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
  }

  .back-button:focus {
    outline: 2px solid #2196F3;
    outline-offset: 2px;
  }

  /* Duplicates List */
  .duplicates-container {
    width: 100%;
  }

  .header {
    margin-bottom: 2rem;
    text-align: center;
  }

  .header h2 {
    font-size: 2rem;
    color: #333;
    margin: 0 0 0.5rem 0;
  }

  .subtitle {
    font-size: 1rem;
    color: #666;
    max-width: 700px;
    margin: 0 auto;
    line-height: 1.6;
  }

  .duplicates-list {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .duplicate-detection {
      padding: 1rem;
    }

    .header h2 {
      font-size: 1.5rem;
    }

    .subtitle {
      font-size: 0.9375rem;
    }

    .error-state h2,
    .empty-state h2 {
      font-size: 1.5rem;
    }

    .checkmark-icon {
      width: 64px;
      height: 64px;
      font-size: 2.5rem;
    }

    .error-icon {
      font-size: 3rem;
    }
  }

  /* Accessibility - High contrast mode */
  @media (prefers-contrast: high) {
    .spinner {
      border-width: 6px;
    }

    .checkmark-icon {
      border: 3px solid #2e7d32;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
      border-top-color: transparent;
      border-left-color: #4CAF50;
    }

    .retry-button:hover,
    .back-button:hover {
      transform: none;
    }
  }
</style>
