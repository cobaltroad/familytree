/**
 * Person CRUD actions with optimistic update pattern.
 * Provides immediate UI feedback by applying changes optimistically before API calls complete.
 * Automatically rolls back changes if API calls fail.
 *
 * @module personActions
 */

import { get } from 'svelte/store'
import { people, relationships } from '../familyStore.js'
import { error as errorNotification, success as successNotification } from '../notificationStore.js'
import { api } from '../../lib/api.js'

/**
 * Generates a unique temporary ID for optimistic creates.
 * Format: "temp-{timestamp}"
 *
 * @returns {string} Temporary ID
 */
function generateTempId() {
  return `temp-${Date.now()}`
}

/**
 * Replaces a person at a specific index in the people array.
 * Helper function to maintain immutability while updating array elements.
 *
 * @param {Array} peopleArray - The array of people
 * @param {number} index - Index of person to replace
 * @param {Object} newPerson - New person object
 * @returns {Array} New array with person replaced
 */
function replacePersonAtIndex(peopleArray, index, newPerson) {
  return [
    ...peopleArray.slice(0, index),
    newPerson,
    ...peopleArray.slice(index + 1)
  ]
}

/**
 * Returns current people state.
 * Helper function to reduce code duplication across actions.
 *
 * @returns {Array} Current people array
 */
function initializeAction() {
  return get(people)
}

/**
 * Updates a person with optimistic UI update pattern.
 * Changes are applied immediately to the UI, then synchronized with the server.
 * If the API call fails, the UI automatically rolls back to the previous state.
 *
 * @param {number} personId - ID of the person to update
 * @param {Object} updatedData - Updated person fields
 * @returns {Promise<void>}
 *
 * @example
 * await updatePerson(1, { firstName: 'Jane', lastName: 'Smith' })
 */
export async function updatePerson(personId, updatedData) {
  // Initialize action and capture current state
  const currentPeople = initializeAction()
  const originalPersonIndex = currentPeople.findIndex(p => p.id === personId)

  if (originalPersonIndex === -1) {
    // Person not found in current state - still attempt API call
    // but don't apply optimistic update
    try {
      await api.updatePerson(personId, updatedData)
    } catch (err) {
      errorNotification('Failed to update person')
    }
    return
  }

  const originalPerson = currentPeople[originalPersonIndex]

  // Apply optimistic update immediately
  const optimisticPerson = { ...originalPerson, ...updatedData }
  const optimisticPeople = replacePersonAtIndex(currentPeople, originalPersonIndex, optimisticPerson)
  people.set(optimisticPeople)

  try {
    // Perform API call in background
    const serverPerson = await api.updatePerson(personId, updatedData)

    // Update with server response (may include additional fields)
    const updatedPeople = get(people).map(p =>
      p.id === personId ? serverPerson : p
    )
    people.set(updatedPeople)
  } catch (err) {
    // Rollback to original state on error
    const rollbackPeople = replacePersonAtIndex(currentPeople, originalPersonIndex, originalPerson)
    people.set(rollbackPeople)
    errorNotification('Failed to update person')
  }
}

/**
 * Creates a new person with optimistic UI update pattern.
 * Person appears immediately with a temporary ID, then replaced with real server ID on success.
 * If the API call fails, the temporary person is removed from the UI.
 *
 * @param {Object} personData - New person data
 * @returns {Promise<Object>} Created person object from server
 *
 * @example
 * const newPerson = await createPerson({ firstName: 'John', lastName: 'Doe', birthDate: '1980-01-01' })
 * console.log(newPerson.id) // Real server ID
 */
export async function createPerson(personData) {
  // Initialize action and capture current state
  const currentPeople = initializeAction()

  // Generate temporary ID and create temporary person
  const tempId = generateTempId()
  const tempPerson = { ...personData, id: tempId }

  // Add person with temporary ID immediately
  const optimisticPeople = [...currentPeople, tempPerson]
  people.set(optimisticPeople)

  try {
    // Perform API call in background
    const serverPerson = await api.createPerson(personData)

    // Replace temporary person with real server person
    const updatedPeople = get(people).map(p =>
      p.id === tempId ? serverPerson : p
    )
    people.set(updatedPeople)

    // Return the server person for caller's use
    return serverPerson
  } catch (err) {
    // Remove temporary person on error (rollback to original state)
    people.set(currentPeople)
    errorNotification('Failed to create person')

    // Re-throw error so caller knows it failed
    throw err
  }
}

/**
 * Deletes a person with optimistic UI update pattern.
 * Person is removed immediately from the UI, then synchronized with the server.
 * If the API call fails, the person is restored to the UI at the original position.
 *
 * @param {number} personId - ID of the person to delete
 * @returns {Promise<void>}
 *
 * @example
 * await deletePerson(1)
 */
export async function deletePerson(personId) {
  // Initialize action and capture current state
  const currentPeople = initializeAction()
  const personIndex = currentPeople.findIndex(p => p.id === personId)

  if (personIndex === -1) {
    // Person not found - still attempt API call
    try {
      await api.deletePerson(personId)
    } catch (err) {
      errorNotification('Failed to delete person')
    }
    return
  }

  const deletedPerson = currentPeople[personIndex]

  // Remove person immediately
  const optimisticPeople = currentPeople.filter(p => p.id !== personId)
  people.set(optimisticPeople)

  try {
    // Perform API call in background
    await api.deletePerson(personId)

    // Deletion confirmed - no additional action needed
  } catch (err) {
    // Restore person at original position on error
    const rollbackPeople = replacePersonAtIndex(currentPeople, personIndex, deletedPerson)
    people.set(rollbackPeople)
    errorNotification('Failed to delete person')
  }
}

/**
 * Merges two people with optimistic UI update pattern.
 * Story #110: Execute Person Merge with Relationship Transfer
 *
 * Source person is removed immediately, target is updated, and relationships are transferred.
 * If the API call fails, all changes are rolled back.
 *
 * @param {number} sourceId - ID of source person (will be deleted)
 * @param {number} targetId - ID of target person (will receive merged data)
 * @returns {Promise<Object>} Merge result from server
 *
 * @example
 * const result = await mergePerson(15, 27)
 * // Returns: { success: true, targetId: 27, sourceId: 15, relationshipsTransferred: 3, mergedData: {...} }
 */
export async function mergePerson(sourceId, targetId) {
  // Initialize action and capture current state
  const currentPeople = get(people)
  const currentRelationships = get(relationships)

  const sourceIndex = currentPeople.findIndex(p => p.id === sourceId)
  const targetIndex = currentPeople.findIndex(p => p.id === targetId)

  if (sourceIndex === -1 || targetIndex === -1) {
    errorNotification('Cannot merge: person not found')
    return
  }

  const sourcePerson = currentPeople[sourceIndex]
  const targetPerson = currentPeople[targetIndex]

  try {
    // Perform API call first (not optimistic for merge - too complex to predict)
    const result = await api.mergePerson(sourceId, targetId)

    // Update stores based on server response
    // Remove source person
    const updatedPeople = currentPeople.filter(p => p.id !== sourceId)

    // Update target person with merged data
    const finalPeople = updatedPeople.map(p =>
      p.id === targetId ? result.mergedData : p
    )
    people.set(finalPeople)

    // Update relationships - remove source relationships and reload
    const updatedRelationships = currentRelationships.filter(
      rel => rel.person1Id !== sourceId && rel.person2Id !== sourceId
    )
    relationships.set(updatedRelationships)

    // Show success notification
    successNotification(
      `Successfully merged ${sourcePerson.firstName} ${sourcePerson.lastName} into ${targetPerson.firstName} ${targetPerson.lastName}`
    )

    return result
  } catch (err) {
    // No rollback needed since we didn't do optimistic update
    errorNotification(`Failed to merge people: ${err.message}`)
    throw err
  }
}
