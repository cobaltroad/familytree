import { readable } from 'svelte/store'

/**
 * Viewer Mode Store - Detects if the application is running in viewer mode
 *
 * Viewer mode is a read-only mode for static site deployment where all
 * editing features are disabled. Users can view the family tree but cannot
 * add, edit, or delete people or relationships.
 *
 * Detection is based on the VITE_VIEWER_MODE environment variable:
 * - VITE_VIEWER_MODE="true" → Viewer mode enabled
 * - VITE_VIEWER_MODE="false" or undefined → Viewer mode disabled (default)
 *
 * Usage:
 * ```svelte
 * <script>
 *   import { isViewerMode } from '../stores/viewerModeStore.js'
 * </script>
 *
 * {#if !$isViewerMode}
 *   <button>Add Person</button>
 * {/if}
 * ```
 */

/**
 * Determine if viewer mode is enabled based on environment variable
 * @returns {boolean} True if viewer mode is enabled, false otherwise
 */
function detectViewerMode() {
  // Access the Vite environment variable
  const viewerModeEnv = import.meta.env.VITE_VIEWER_MODE

  // Convert to boolean: only "true" string enables viewer mode
  return viewerModeEnv === 'true'
}

/**
 * Readable store that exposes the viewer mode state
 * This store cannot be modified (read-only) since it's determined by environment
 */
export const isViewerMode = readable(detectViewerMode())
