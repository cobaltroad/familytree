<script>
  import { onMount, onDestroy } from 'svelte'
  import FileDropZone from './components/FileDropZone.svelte'
  import UploadProgress from './components/UploadProgress.svelte'
  import { api } from './api.js'
  import * as notificationStore from '../stores/notificationStore.js'

  export let isAuthenticated = true // Will be provided by parent component

  let uploadState = 'idle' // 'idle' | 'uploading' | 'completed' | 'error'
  let selectedFile = null
  let uploadProgress = 0
  let uploadedBytes = 0
  let totalBytes = 0
  let abortController = null
  let showHelpModal = false

  function handleFileSelected(event) {
    selectedFile = event.detail.file
    startUpload()
  }

  function handleFileError(event) {
    notificationStore.error(event.detail.message)
  }

  async function startUpload() {
    if (!selectedFile) return

    uploadState = 'uploading'
    uploadProgress = 0
    uploadedBytes = 0
    totalBytes = selectedFile.size
    abortController = new AbortController()

    try {
      const result = await api.uploadGedcomFile(
        selectedFile,
        handleProgress,
        abortController
      )

      // Success - redirect to parsing results
      uploadState = 'completed'
      notificationStore.success('File uploaded successfully')

      // Redirect to parsing view with uploadId
      window.location.hash = `#/gedcom/parsing/${result.uploadId}`
    } catch (error) {
      // Handle different error types
      if (error.message === 'Upload cancelled') {
        return // Don't show error for user-initiated cancel
      }

      uploadState = 'error'

      if (error.status === 401) {
        notificationStore.error('Authentication required. Please sign in.')
      } else {
        notificationStore.error(error.message || 'Upload failed. Please try again.')
      }

      // Reset to allow retry
      resetUpload()
    }
  }

  function handleProgress(percentage) {
    uploadProgress = percentage
    uploadedBytes = Math.round((percentage / 100) * totalBytes)
  }

  function handleCancelUpload() {
    if (abortController) {
      abortController.abort()
    }
    notificationStore.info('Upload cancelled')
    resetUpload()
  }

  function resetUpload() {
    uploadState = 'idle'
    selectedFile = null
    uploadProgress = 0
    uploadedBytes = 0
    totalBytes = 0
    abortController = null
  }

  function openHelpModal() {
    showHelpModal = true
  }

  function closeHelpModal() {
    showHelpModal = false
  }

  function handleHelpKeydown(event) {
    if (event.key === 'Escape') {
      closeHelpModal()
    }
  }

  function redirectToSignIn() {
    window.location.hash = '#/signin'
  }

  onMount(() => {
    if (showHelpModal) {
      document.addEventListener('keydown', handleHelpKeydown)
    }
  })

  onDestroy(() => {
    // Clean up abort controller if component unmounts during upload
    if (abortController) {
      abortController.abort()
    }
    document.removeEventListener('keydown', handleHelpKeydown)
  })

  // Add/remove escape listener when modal opens/closes
  $: if (showHelpModal) {
    document.addEventListener('keydown', handleHelpKeydown)
  } else {
    document.removeEventListener('keydown', handleHelpKeydown)
  }
</script>

<div class="gedcom-upload-page">
  <header class="page-header">
    <h1>Import GEDCOM File</h1>
    <button
      type="button"
      class="help-button"
      on:click={openHelpModal}
      aria-label="What is GEDCOM?"
    >
      What is GEDCOM?
    </button>
  </header>

  {#if !isAuthenticated}
    <div class="auth-required">
      <svg class="lock-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <h2>Authentication Required</h2>
      <p>You must be signed in to import GEDCOM files.</p>
      <button
        type="button"
        class="sign-in-button"
        on:click={redirectToSignIn}
      >
        Sign In
      </button>
    </div>
  {:else}
    <div class="upload-container">
      {#if uploadState === 'idle' || uploadState === 'error'}
        <div class="instructions">
          <p>
            Upload your GEDCOM file to import your family tree data.
            GEDCOM files contain genealogical information including people,
            relationships, dates, and events.
          </p>
        </div>

        <FileDropZone
          on:fileSelected={handleFileSelected}
          on:error={handleFileError}
        />
      {:else if uploadState === 'uploading'}
        <UploadProgress
          progress={uploadProgress}
          fileName={selectedFile?.name}
          uploadedBytes={uploadedBytes}
          totalBytes={totalBytes}
          on:cancel={handleCancelUpload}
        />
      {/if}
    </div>
  {/if}
</div>

<!-- Help Modal -->
{#if showHelpModal}
  <button
    class="modal-overlay"
    on:click={closeHelpModal}
    aria-label="Close modal"
    type="button"
  >
    <div
      class="modal"
      role="dialog"
      aria-labelledby="help-modal-title"
      aria-modal="true"
      on:click|stopPropagation
      on:keydown={() => {}}
    >
      <header class="modal-header">
        <h2 id="help-modal-title">What is GEDCOM?</h2>
        <button
          type="button"
          class="modal-close"
          aria-label="Close help modal"
          on:click={closeHelpModal}
        >
          ×
        </button>
      </header>

      <div class="modal-content">
        <p>
          <strong>GEDCOM</strong> (Genealogical Data Communication) is a standard file format
          for exchanging genealogical data between different family tree software programs.
        </p>

        <h3>Key Features:</h3>
        <ul>
          <li>Standard format used by all major genealogy applications</li>
          <li>Contains information about individuals, families, and relationships</li>
          <li>Includes dates, places, events, and notes</li>
          <li>Text-based format with .ged file extension</li>
        </ul>

        <h3>How to Get a GEDCOM File:</h3>
        <ol>
          <li>Export from your current family tree software (Ancestry, MyHeritage, etc.)</li>
          <li>Look for "Export" or "Download GEDCOM" option in your software</li>
          <li>Save the .ged file to your computer</li>
          <li>Upload it here to import your family tree</li>
        </ol>

        <h3>File Requirements:</h3>
        <ul>
          <li>Must have .ged file extension</li>
          <li>Maximum file size: 10MB</li>
          <li>Should be in standard GEDCOM 5.5 or later format</li>
        </ul>
      </div>

      <footer class="modal-footer">
        <button
          type="button"
          class="button-primary"
          on:click={closeHelpModal}
        >
          Got it
        </button>
      </footer>
    </div>
  </button>
{/if}

<style>
  .gedcom-upload-page {
    max-width: 800px;
    margin: 2rem auto;
    padding: 0 1rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    gap: 1rem;
  }

  h1 {
    font-size: 2rem;
    color: #333;
    margin: 0;
  }

  .help-button {
    background-color: #2196F3;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .help-button:hover {
    background-color: #1976D2;
  }

  .help-button:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.3);
  }

  .auth-required {
    text-align: center;
    padding: 3rem 2rem;
    background-color: #fafafa;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
  }

  .lock-icon {
    color: #999;
    margin-bottom: 1rem;
  }

  .auth-required h2 {
    font-size: 1.5rem;
    color: #333;
    margin: 0 0 0.5rem 0;
  }

  .auth-required p {
    color: #666;
    margin: 0 0 1.5rem 0;
  }

  .sign-in-button {
    background-color: #4CAF50;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .sign-in-button:hover {
    background-color: #45a049;
  }

  .sign-in-button:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.3);
  }

  .upload-container {
    margin-top: 2rem;
  }

  .instructions {
    background-color: #e3f2fd;
    border-left: 4px solid #2196F3;
    padding: 1rem 1.5rem;
    margin-bottom: 2rem;
    border-radius: 4px;
  }

  .instructions p {
    margin: 0;
    color: #1565C0;
    line-height: 1.6;
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 1rem;
    border: none;
    cursor: pointer;
  }

  .modal {
    background-color: white;
    border-radius: 8px;
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
    cursor: default;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: #333;
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 2rem;
    color: #999;
    cursor: pointer;
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .modal-close:hover {
    background-color: #f5f5f5;
    color: #333;
  }

  .modal-close:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
  }

  .modal-content {
    padding: 1.5rem;
  }

  .modal-content p {
    margin: 0 0 1rem 0;
    line-height: 1.6;
    color: #333;
  }

  .modal-content h3 {
    font-size: 1.125rem;
    color: #333;
    margin: 1.5rem 0 0.75rem 0;
  }

  .modal-content h3:first-child {
    margin-top: 0;
  }

  .modal-content ul,
  .modal-content ol {
    margin: 0 0 1rem 0;
    padding-left: 1.5rem;
  }

  .modal-content li {
    margin-bottom: 0.5rem;
    line-height: 1.6;
    color: #555;
  }

  .modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid #e0e0e0;
    display: flex;
    justify-content: flex-end;
  }

  .button-primary {
    background-color: #4CAF50;
    color: white;
    border: none;
    padding: 0.5rem 1.5rem;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .button-primary:hover {
    background-color: #45a049;
  }

  .button-primary:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.3);
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .gedcom-upload-page {
      margin: 1rem auto;
    }

    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    h1 {
      font-size: 1.5rem;
    }

    .help-button {
      align-self: stretch;
      width: 100%;
    }

    .auth-required {
      padding: 2rem 1rem;
    }

    .modal {
      max-height: 95vh;
    }

    .modal-header,
    .modal-content,
    .modal-footer {
      padding: 1rem;
    }
  }
</style>
