<script>
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { api } from '$lib/api'
  import TimelineView from '$lib/TimelineView.svelte'
  import PedigreeView from '$lib/PedigreeView.svelte'
  import RadialView from '$lib/RadialView.svelte'
  import NetworkView from '$lib/NetworkView.svelte'
  import ImportView from '$lib/ImportView.svelte'
  import AdminView from '$lib/AdminView.svelte'
  import ViewSwitcher from '$lib/ViewSwitcher.svelte'
  import PersonModal from '$lib/PersonModal.svelte'
  import * as familyStore from '../stores/familyStore.js'

  // Get session from page data
  $: session = $page.data.session

  // Initialize currentPath from hash BEFORE first render
  // This ensures the correct view is shown immediately, not after onMount
  let currentPath = browser ? (window.location.hash.slice(1) || '/') : '/'

  // Normalize path (treat '/', '/tree', and '/list' as '/pedigree')
  $: normalizedPath = (currentPath === '/' || currentPath === '/tree' || currentPath === '/list') ? '/pedigree' : currentPath

  // Handle route changes via hash
  function handleHashChange() {
    if (browser) {
      currentPath = window.location.hash.slice(1) || '/'
    }
  }

  onMount(() => {
    // Check authentication first
    if (!session || !session.user) {
      // Not authenticated - redirect to signin
      goto('/signin')
      return
    }

    // Load data
    loadData()

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  })

  async function loadData() {
    familyStore.loading.set(true)
    familyStore.error.set(null)
    try {
      const [peopleData, relationshipsData] = await Promise.all([
        api.getAllPeople(),
        api.getAllRelationships()
      ])
      familyStore.people.set(peopleData || [])
      familyStore.relationships.set(relationshipsData || [])
    } catch (err) {
      // Check if it's an authentication error
      if (err.status === 401) {
        // Session expired or invalid - redirect to signin
        goto('/signin')
        return
      }

      // Other errors - show to user
      familyStore.error.set(err.message)
      console.error('Failed to load data:', err)
    } finally {
      familyStore.loading.set(false)
    }
  }
</script>

<main>
  <h1>Family Tree</h1>

  <ViewSwitcher currentPath={normalizedPath} />

  {#if normalizedPath === '/timeline'}
    <TimelineView />
  {:else if normalizedPath === '/pedigree'}
    <PedigreeView />
  {:else if normalizedPath === '/radial'}
    <RadialView />
  {:else if normalizedPath === '/network'}
    <NetworkView />
  {:else if normalizedPath === '/import'}
    <ImportView />
  {:else if normalizedPath === '/admin'}
    <AdminView />
  {:else}
    <PedigreeView />
  {/if}

  <PersonModal />
</main>

<style>
  main {
    width: 100%;
  }
</style>
