<script>
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { api } from '$lib/api'
  import PedigreeView from '$lib/PedigreeView.svelte'
  import TreeView from '$lib/TreeView.svelte'
  import NetworkView from '$lib/NetworkView.svelte'
  import ImportView from '$lib/ImportView.svelte'
  import AdminView from '$lib/AdminView.svelte'
  import DuplicateDetection from '$lib/DuplicateDetection.svelte'
  import GedcomUpload from '$lib/GedcomUpload.svelte'
  import GedcomParsingResults from '$lib/GedcomParsingResults.svelte'
  import GedcomPreview from '$lib/GedcomPreview.svelte'
  import GedcomImportProgress from '$lib/components/GedcomImportProgress.svelte'
  import ViewSwitcher from '$lib/ViewSwitcher.svelte'
  import PersonModal from '$lib/PersonModal.svelte'
  import * as familyStore from '../stores/familyStore.js'

  // Get session from page data
  $: session = $page.data.session

  // Initialize currentPath from hash BEFORE first render
  // This ensures the correct view is shown immediately, not after onMount
  let currentPath = browser ? (window.location.hash.slice(1) || '/') : '/'

  // Normalize path (treat '/', '/list', '/timeline', and '/radial' as '/pedigree')
  $: normalizedPath = (currentPath === '/' || currentPath === '/list' || currentPath === '/timeline' || currentPath === '/radial') ? '/pedigree' : currentPath

  // Extract uploadId from GEDCOM parsing route
  $: parsingUploadId = normalizedPath.startsWith('/gedcom/parsing/')
    ? normalizedPath.replace('/gedcom/parsing/', '')
    : null

  // Extract uploadId from GEDCOM preview route
  $: previewUploadId = normalizedPath.startsWith('/gedcom/preview/')
    ? normalizedPath.replace('/gedcom/preview/', '')
    : null

  // Extract uploadId from GEDCOM import progress route
  $: importUploadId = normalizedPath.startsWith('/gedcom/import-progress/')
    ? normalizedPath.replace('/gedcom/import-progress/', '')
    : null

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

  {#if normalizedPath === '/pedigree'}
    <PedigreeView />
  {:else if normalizedPath === '/tree'}
    <TreeView />
  {:else if normalizedPath === '/network'}
    <NetworkView />
  {:else if normalizedPath === '/duplicates'}
    <DuplicateDetection />
  {:else if normalizedPath === '/import'}
    <ImportView />
  {:else if normalizedPath === '/admin'}
    <AdminView />
  {:else if normalizedPath === '/gedcom/import'}
    <GedcomUpload isAuthenticated={session && session.user} />
  {:else if normalizedPath.startsWith('/gedcom/parsing/')}
    <GedcomParsingResults uploadId={parsingUploadId} />
  {:else if normalizedPath.startsWith('/gedcom/preview/')}
    <GedcomPreview uploadId={previewUploadId} />
  {:else if normalizedPath.startsWith('/gedcom/import-progress/')}
    <GedcomImportProgress uploadId={importUploadId} />
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
