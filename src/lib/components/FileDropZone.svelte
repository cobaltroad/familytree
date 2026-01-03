<script>
  import { createEventDispatcher } from 'svelte'

  export let disabled = false

  const dispatch = createEventDispatcher()
  let isDragOver = false
  let fileInput

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes

  function handleDragEnter(event) {
    if (disabled) return
    event.preventDefault()
    isDragOver = true
  }

  function handleDragOver(event) {
    if (disabled) return
    event.preventDefault()
    isDragOver = true
  }

  function handleDragLeave(event) {
    if (disabled) return
    event.preventDefault()
    isDragOver = false
  }

  function handleDrop(event) {
    if (disabled) return
    event.preventDefault()
    isDragOver = false

    const files = event.dataTransfer?.files
    if (!files || files.length === 0) {
      dispatch('error', { message: 'No file provided' })
      return
    }

    const file = files[0] // Only accept first file
    validateAndEmit(file)
  }

  function handleFileInputChange(event) {
    if (disabled) return
    const files = event.target?.files
    if (!files || files.length === 0) {
      return
    }

    const file = files[0]
    validateAndEmit(file)
  }

  function validateAndEmit(file) {
    // Validate file type (case-insensitive .ged extension)
    if (!file.name.toLowerCase().endsWith('.ged')) {
      dispatch('error', { message: 'Only .ged files are supported' })
      return
    }

    // Validate file is not empty
    if (file.size === 0) {
      dispatch('error', { message: 'File is empty' })
      return
    }

    // Validate file size (max 10MB)
    if (file.size > MAX_FILE_SIZE) {
      dispatch('error', { message: 'File size exceeds 10MB limit' })
      return
    }

    // File is valid
    dispatch('fileSelected', { file })
  }

  function handleClick() {
    if (disabled) return
    fileInput?.click()
  }

  function handleKeyDown(event) {
    if (disabled) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      fileInput?.click()
    }
  }
</script>

<div
  class="drop-zone {isDragOver ? 'drag-over' : ''} {disabled ? 'disabled' : ''}"
  role="button"
  tabindex={disabled ? -1 : 0}
  aria-label="Upload GEDCOM file - drag and drop or click to browse"
  aria-disabled={disabled}
  on:dragenter={handleDragEnter}
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
  on:click={handleClick}
  on:keydown={handleKeyDown}
>
  <svg class="upload-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>

  <p class="instruction">
    <strong>Drag and drop your GEDCOM file here</strong>
  </p>
  <p class="instruction-secondary">
    or <span class="clickable">Click to browse</span>
  </p>
  <p class="file-requirements">
    Accepts .ged files up to 10MB
  </p>

  <input
    bind:this={fileInput}
    type="file"
    accept=".ged"
    class="visually-hidden"
    id="gedcom-file-input"
    aria-label="GEDCOM file input"
    on:change={handleFileInputChange}
    disabled={disabled}
  />
</div>

<style>
  .drop-zone {
    border: 2px dashed #ccc;
    border-radius: 8px;
    padding: 3rem 2rem;
    text-align: center;
    background-color: #fafafa;
    cursor: pointer;
    transition: all 0.2s ease;
    outline: none;
  }

  .drop-zone:hover:not(.disabled) {
    border-color: #4CAF50;
    background-color: #f0f8f0;
  }

  .drop-zone:focus:not(.disabled) {
    border-color: #4CAF50;
    box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2);
  }

  .drop-zone.drag-over {
    border-color: #4CAF50;
    background-color: #e8f5e9;
    transform: scale(1.01);
  }

  .drop-zone.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    border-color: #e0e0e0;
  }

  .upload-icon {
    color: #4CAF50;
    margin: 0 auto 1rem;
    display: block;
  }

  .drag-over .upload-icon {
    transform: scale(1.1);
  }

  .instruction {
    font-size: 1.1rem;
    margin: 0.5rem 0;
    color: #333;
  }

  .instruction-secondary {
    font-size: 1rem;
    margin: 0.5rem 0;
    color: #666;
  }

  .clickable {
    color: #4CAF50;
    font-weight: 500;
    text-decoration: underline;
  }

  .file-requirements {
    font-size: 0.875rem;
    color: #999;
    margin-top: 1rem;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
    display: none;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .drop-zone {
      padding: 2rem 1rem;
    }

    .upload-icon {
      width: 48px;
      height: 48px;
    }

    .instruction {
      font-size: 1rem;
    }

    .instruction-secondary {
      font-size: 0.9rem;
    }
  }
</style>
