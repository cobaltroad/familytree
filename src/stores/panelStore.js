/**
 * Panel Store - Manages auto-collapse behavior for CollapsibleActionPanel components
 *
 * Tracks which panel is currently open in each group. When a new panel opens in a group,
 * the previously open panel in that group is automatically collapsed.
 *
 * Group-based auto-collapse:
 * - Panels in the same group auto-collapse each other (e.g., mother/father panels)
 * - Panels in different groups remain independent (e.g., spouse and children panels)
 *
 * @module panelStore
 */

import { writable, get } from 'svelte/store'

/**
 * Tracks currently open panel per group
 * Structure: { groupId: panelId }
 *
 * Example:
 * {
 *   "parents": "mother",
 *   "spouses": "spouse",
 *   "children": "child"
 * }
 */
export const openPanels = writable({})

/**
 * Opens a panel in a group, auto-collapsing any other panel in the same group
 *
 * @param {string|null|undefined} groupId - Group identifier (e.g., "parents", "spouses")
 * @param {string|null} panelId - Panel identifier (e.g., "mother", "father")
 */
export function openPanel(groupId, panelId) {
  // Do nothing if groupId is falsy (null, undefined, empty string)
  if (!groupId) return

  openPanels.update(state => ({
    ...state,
    [groupId]: panelId
  }))
}

/**
 * Closes a panel in a group (removes the group from state)
 *
 * @param {string|null|undefined} groupId - Group identifier to close
 */
export function closePanel(groupId) {
  // Do nothing if groupId is falsy (null, undefined, empty string)
  if (!groupId) return

  openPanels.update(state => {
    const newState = { ...state }
    delete newState[groupId]
    return newState
  })
}

/**
 * Checks if a specific panel is currently open in its group
 *
 * @param {string|null|undefined} groupId - Group identifier
 * @param {string|null} panelId - Panel identifier
 * @returns {boolean} True if the panel is open, false otherwise
 */
export function isPanelOpen(groupId, panelId) {
  if (!groupId || !panelId) return false

  const state = get(openPanels)
  return state[groupId] === panelId
}
