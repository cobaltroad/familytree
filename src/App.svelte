<script>
  import { onMount } from 'svelte'
  import { api } from './lib/api'
  import TimelineView from './lib/TimelineView.svelte'
  import PedigreeView from './lib/PedigreeView.svelte'
  import RadialView from './lib/RadialView.svelte'
  import NetworkView from './lib/NetworkView.svelte'
  import ImportView from './lib/ImportView.svelte'
  import GedcomUpload from './lib/GedcomUpload.svelte'
  import GedcomParsingResults from './lib/GedcomParsingResults.svelte'
  import GedcomPreview from './lib/GedcomPreview.svelte'
  import ViewSwitcher from './lib/ViewSwitcher.svelte'
  import PersonModal from './lib/PersonModal.svelte'
  import Notification from './lib/components/Notification.svelte'
  import * as familyStore from './stores/familyStore.js'

  let currentPath = window.location.hash.slice(1) || '/'

  // Normalize path (treat '/', '/tree', and '/list' as '/pedigree')
  $: normalizedPath = (currentPath === '/' || currentPath === '/tree' || currentPath === '/list') ? '/pedigree' : currentPath

  // Extract uploadId from GEDCOM parsing route
  $: parsingUploadId = normalizedPath.startsWith('/gedcom/parsing/')
    ? normalizedPath.replace('/gedcom/parsing/', '')
    : null

  // Extract uploadId from GEDCOM preview route
  $: previewUploadId = normalizedPath.startsWith('/gedcom/preview/')
    ? normalizedPath.replace('/gedcom/preview/', '')
    : null

  // Handle route changes
  function handleHashChange() {
    currentPath = window.location.hash.slice(1) || '/'
  }

  onMount(() => {
    loadData()
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
      familyStore.error.set(err.message)
      console.error('Failed to load data:', err)
    } finally {
      familyStore.loading.set(false)
    }
  }
</script>

<main>
  <h1>Family Tree</h1>

  <Notification />

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
  {:else if normalizedPath === '/gedcom/import'}
    <GedcomUpload isAuthenticated={true} />
  {:else if normalizedPath.startsWith('/gedcom/parsing/')}
    <GedcomParsingResults uploadId={parsingUploadId} />
  {:else if normalizedPath.startsWith('/gedcom/preview/')}
    <GedcomPreview uploadId={previewUploadId} />
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
