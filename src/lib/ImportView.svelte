<script>
  import { success, error } from '../stores/notificationStore.js'

  let selectedFile = null
  let uploading = false
  let uploadProgress = 0
  let dragActive = false

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  function handleFileSelect(event) {
    const file = event.target.files[0]
    validateAndSelectFile(file)
  }

  function handleDrop(event) {
    event.preventDefault()
    dragActive = false

    const file = event.dataTransfer.files[0]
    validateAndSelectFile(file)
  }

  function handleDragOver(event) {
    event.preventDefault()
    dragActive = true
  }

  function handleDragLeave() {
    dragActive = false
  }

  function validateAndSelectFile(file) {
    if (!file) {
      return
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.ged')) {
      error('Only .ged files are supported')
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      error('File size exceeds 10MB limit')
      return
    }

    if (file.size === 0) {
      error('File is empty')
      return
    }

    selectedFile = file
  }

  async function handleUpload() {
    if (!selectedFile) {
      error('Please select a file first')
      return
    }

    uploading = true
    uploadProgress = 0

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      // Simulate progress (real implementation would use XMLHttpRequest for progress)
      uploadProgress = 30

      const response = await fetch('/api/gedcom/upload', {
        method: 'POST',
        body: formData
      })

      uploadProgress = 100

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Upload failed')
      }

      const result = await response.json()
      success(`File uploaded successfully: ${result.fileName}`)

      // Reset form
      selectedFile = null
      uploadProgress = 0

      // Redirect to parsing results page
      window.location.hash = `#/gedcom/parsing/${result.uploadId}`
    } catch (uploadError) {
      error(`Upload failed: ${uploadError.message}`)
      uploadProgress = 0
    } finally {
      uploading = false
    }
  }

  function clearSelection() {
    selectedFile = null
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }
</script>

<div class="import-view">
  <div class="header">
    <h2>Import GEDCOM File</h2>
    <p class="description">
      Upload a GEDCOM (.ged) file to import genealogy data from other family tree software.
      Maximum file size: 10MB.
    </p>
  </div>

  <div
    class="drop-zone"
    class:active={dragActive}
    on:drop={handleDrop}
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
  >
    {#if !selectedFile}
      <div class="drop-content">
        <span class="upload-icon">📁</span>
        <p class="drop-text">Drag and drop a .ged file here, or click to select</p>
        <input
          type="file"
          accept=".ged,.GED"
          on:change={handleFileSelect}
          class="file-input"
          id="file-input"
          disabled={uploading}
        />
        <label for="file-input" class="file-label">Choose File</label>
      </div>
    {:else}
      <div class="file-selected">
        <span class="file-icon">📄</span>
        <div class="file-info">
          <p class="file-name">{selectedFile.name}</p>
          <p class="file-size">{formatFileSize(selectedFile.size)}</p>
        </div>
        <button
          type="button"
          class="clear-button"
          on:click={clearSelection}
          disabled={uploading}
        >
          ✕
        </button>
      </div>
    {/if}
  </div>

  {#if uploadProgress > 0 && uploading}
    <div class="progress-bar">
      <div class="progress-fill" style="width: {uploadProgress}%"></div>
    </div>
    <p class="progress-text">Uploading... {uploadProgress}%</p>
  {/if}

  <div class="actions">
    <button
      type="button"
      class="upload-button"
      on:click={handleUpload}
      disabled={!selectedFile || uploading}
    >
      {uploading ? 'Uploading...' : 'Upload File'}
    </button>
  </div>

  <div class="info-section">
    <h3>What is GEDCOM?</h3>
    <p>
      GEDCOM (GEnealogical Data COMmunication) is a standard file format for sharing family tree
      data between different genealogy software applications.
    </p>
    <h3>Supported Features</h3>
    <ul>
      <li>File size up to 10MB</li>
      <li>Only .ged file extension accepted</li>
      <li>Secure upload with authentication required</li>
      <li>Temporary storage for processing</li>
    </ul>
  </div>
</div>

<style>
  .import-view {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .header {
    margin-bottom: 2rem;
  }

  .header h2 {
    margin: 0 0 0.5rem 0;
    color: #333;
  }

  .description {
    color: #666;
    margin: 0;
  }

  .drop-zone {
    border: 2px dashed #ccc;
    border-radius: 8px;
    padding: 3rem 2rem;
    text-align: center;
    background: #fafafa;
    transition: all 0.3s;
    margin-bottom: 1.5rem;
  }

  .drop-zone.active {
    border-color: #4caf50;
    background: #f0f8f0;
  }

  .drop-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .upload-icon {
    font-size: 4rem;
    opacity: 0.5;
  }

  .drop-text {
    color: #666;
    margin: 0;
    font-size: 1.1rem;
  }

  .file-input {
    display: none;
  }

  .file-label {
    display: inline-block;
    padding: 0.75rem 2rem;
    background: #4caf50;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s;
  }

  .file-label:hover {
    background: #45a049;
  }

  .file-selected {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: white;
    border-radius: 4px;
  }

  .file-icon {
    font-size: 2.5rem;
  }

  .file-info {
    flex: 1;
    text-align: left;
  }

  .file-name {
    margin: 0;
    font-weight: 500;
    color: #333;
  }

  .file-size {
    margin: 0.25rem 0 0 0;
    color: #666;
    font-size: 0.9rem;
  }

  .clear-button {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    color: #999;
    cursor: pointer;
    padding: 0.5rem;
    transition: color 0.2s;
  }

  .clear-button:hover {
    color: #f44336;
  }

  .clear-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .progress-fill {
    height: 100%;
    background: #4caf50;
    transition: width 0.3s;
  }

  .progress-text {
    text-align: center;
    color: #666;
    margin: 0 0 1.5rem 0;
  }

  .actions {
    display: flex;
    justify-content: center;
    margin-bottom: 2rem;
  }

  .upload-button {
    padding: 0.75rem 3rem;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1.1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .upload-button:hover:not(:disabled) {
    background: #45a049;
  }

  .upload-button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .info-section {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid #e0e0e0;
  }

  .info-section h3 {
    color: #333;
    margin: 1.5rem 0 0.5rem 0;
  }

  .info-section h3:first-child {
    margin-top: 0;
  }

  .info-section p {
    color: #666;
    line-height: 1.6;
  }

  .info-section ul {
    color: #666;
    line-height: 1.8;
  }

  @media (max-width: 768px) {
    .import-view {
      padding: 1rem;
    }

    .drop-zone {
      padding: 2rem 1rem;
    }

    .upload-icon {
      font-size: 3rem;
    }

    .drop-text {
      font-size: 1rem;
    }
  }
</style>
