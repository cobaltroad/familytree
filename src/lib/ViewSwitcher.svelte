<script>
  import { modal } from '../stores/modalStore.js'

  export let currentPath = '/'

  const views = [
    { path: '/pedigree', label: 'Pedigree', icon: '📊' },
    { path: '/timeline', label: 'Timeline', icon: '📅' },
    { path: '/radial', label: 'Radial', icon: '⭕' },
    { path: '/network', label: 'Network', icon: '🕸️' },
    { path: '/import', label: 'Import', icon: '📁' },
    { path: '/admin', label: 'Admin', icon: '🔧' }
  ]

  // Normalize current path for comparison (treat '/' and '/tree' as '/pedigree')
  $: normalizedCurrent = (currentPath === '/' || currentPath === '/tree') ? '/pedigree' : currentPath
</script>

<nav class="view-switcher">
  {#each views as view}
    <a
      href="#{view.path}"
      class="view-tab"
      class:active={normalizedCurrent === view.path}
      aria-label={`Switch to ${view.label} view`}
    >
      <span class="icon">{view.icon}</span>
      <span class="label">{view.label}</span>
    </a>
  {/each}
  <button
    type="button"
    class="add-person-link"
    on:click={() => modal.openNew()}
    aria-label="Add a new person to the family tree"
  >
    <span class="icon">+</span>
    <span class="label">Add Person</span>
  </button>
</nav>

<style>
  .view-switcher {
    display: flex;
    gap: 0;
    background: white;
    border-bottom: 2px solid #e0e0e0;
    padding: 0 1rem;
    margin-bottom: 1rem;
    overflow-x: auto;
    /* Sticky for desktop */
    position: sticky;
    top: 0;
    z-index: 50;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .view-tab {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    text-decoration: none;
    color: #666;
    font-weight: 500;
    border-bottom: 3px solid transparent;
    transition: all 0.2s;
    white-space: nowrap;
    cursor: pointer;
  }

  .view-tab:hover {
    color: #333;
    background-color: #f5f5f5;
  }

  .view-tab.active {
    color: #4CAF50;
    border-bottom-color: #4CAF50;
    background-color: #f9fff9;
  }

  .icon {
    font-size: 1.2rem;
    line-height: 1;
  }

  .label {
    font-size: 0.95rem;
  }

  .add-person-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    text-decoration: none;
    color: #4CAF50;
    font-weight: 600;
    border: none;
    border-bottom: 3px solid transparent;
    background: transparent;
    transition: all 0.2s;
    white-space: nowrap;
    cursor: pointer;
    margin-left: auto;
  }

  .add-person-link:hover {
    color: #45a049;
    background-color: #f9fff9;
  }

  .add-person-link .icon {
    font-size: 1.5rem;
    line-height: 1;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .view-switcher {
      padding: 0 0.5rem;
      gap: 0;
    }

    .view-tab {
      flex-direction: column;
      padding: 0.75rem 0.5rem;
      gap: 0.25rem;
      font-size: 0.85rem;
    }

    .icon {
      font-size: 1.5rem;
    }

    .label {
      font-size: 0.7rem;
    }

    .add-person-link {
      flex-direction: column;
      padding: 0.75rem 0.5rem;
      gap: 0.25rem;
      font-size: 0.85rem;
    }

    .add-person-link .label {
      font-size: 0.7rem;
    }
  }

  /* Very small screens - show icons only */
  @media (max-width: 480px) {
    .label {
      display: none;
    }

    .view-tab {
      padding: 1rem 0.75rem;
    }

    .add-person-link {
      padding: 1rem 0.75rem;
    }

    .add-person-link .label {
      display: none;
    }
  }
</style>
