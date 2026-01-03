<script>
  import { createEventDispatcher } from 'svelte'

  export let progress = 0
  export let fileName = ''
  export let uploadedBytes = 0
  export let totalBytes = 0

  const dispatch = createEventDispatcher()

  // Clamp progress between 0 and 100
  $: clampedProgress = Math.max(0, Math.min(100, progress))

  function handleCancel() {
    dispatch('cancel')
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 KB'
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB'
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  $: uploadedSize = formatBytes(uploadedBytes)
  $: totalSize = formatBytes(totalBytes)
</script>

<div class="upload-progress" aria-live="polite">
  <div class="progress-header">
    <div class="file-info">
      {#if fileName}
        <p class="file-name" title={fileName}>
          {fileName.length > 40 ? fileName.substring(0, 37) + '...' : fileName}
        </p>
      {/if}
      <p class="upload-status">Uploading...</p>
    </div>
    {#if uploadedBytes > 0 && totalBytes > 0}
      <p class="file-size">{uploadedSize} / {totalSize}</p>
    {/if}
  </div>

  <div
    class="progress-bar"
    role="progressbar"
    aria-label="Upload progress: {clampedProgress}%"
    aria-valuenow={clampedProgress}
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div class="progress-fill" style="width: {clampedProgress}%"></div>
  </div>

  <div class="progress-footer">
    <p class="progress-percentage">{Math.round(clampedProgress)}%</p>
    <button
      type="button"
      class="cancel-button"
      aria-label="Cancel upload"
      on:click={handleCancel}
    >
      Cancel
    </button>
  </div>
</div>

<style>
  .upload-progress {
    background-color: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.5rem;
    max-width: 600px;
    margin: 0 auto;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
    gap: 1rem;
  }

  .file-info {
    flex: 1;
    min-width: 0;
  }

  .file-name {
    font-weight: 600;
    font-size: 1rem;
    margin: 0 0 0.25rem 0;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .upload-status {
    font-size: 0.875rem;
    color: #666;
    margin: 0;
  }

  .file-size {
    font-size: 0.875rem;
    color: #999;
    white-space: nowrap;
    margin: 0;
  }

  .progress-bar {
    height: 24px;
    background-color: #e0e0e0;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 1rem;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4CAF50 0%, #45a049 100%);
    transition: width 0.3s ease;
    border-radius: 12px;
  }

  .progress-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .progress-percentage {
    font-weight: 600;
    font-size: 1.125rem;
    color: #4CAF50;
    margin: 0;
  }

  .cancel-button {
    background-color: transparent;
    border: 1px solid #f44336;
    color: #f44336;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cancel-button:hover {
    background-color: #f44336;
    color: white;
  }

  .cancel-button:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.2);
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .upload-progress {
      padding: 1rem;
    }

    .progress-header {
      flex-direction: column;
      gap: 0.5rem;
    }

    .file-size {
      align-self: flex-start;
    }

    .file-name {
      font-size: 0.9rem;
    }

    .progress-percentage {
      font-size: 1rem;
    }

    .cancel-button {
      padding: 0.4rem 0.8rem;
      font-size: 0.8rem;
    }
  }
</style>
