/**
 * Relationship CRUD actions with optimistic update pattern.
 * Handles bidirectional spouse deletion and unidirectional parent/child deletion.
 *
 * @module relationshipActions
 */

import { get } from 'svelte/store'
import { relationships } from '../familyStore.js'
import { success as successNotification, error as errorNotification } from '../notificationStore.js'
import { api } from '../../lib/api.js'

/**
 * Finds the reverse spouse relationship (B→A when given A→B).
 * Spouse relationships are bidirectional and must both be deleted.
 *
 * @param {Object} relationship - The original spouse relationship
 * @param {Array} allRelationships - All relationships in the store
 * @returns {Object|null} The reverse relationship or null if not found
 */
function findReverseSpouseRelationship(relationship, allRelationships) {
  if (relationship.type !== 'spouse') {
    return null
  }

  return allRelationships.find(rel =>
    rel.type === 'spouse' &&
    rel.id !== relationship.id &&
    rel.person1Id === relationship.person2Id &&
    rel.person2Id === relationship.person1Id
  ) || null
}

/**
 * Deletes a relationship with optimistic UI update pattern.
 * Handles bidirectional deletion for spouse relationships and unidirectional deletion for parent/child.
 *
 * For spouse relationships:
 * - Finds and deletes both A→B and B→A relationships
 * - If either deletion fails, both are rolled back
 *
 * For parent/child relationships:
 * - Deletes only the single relationship
 * - Rolls back on failure
 *
 * @param {Object} relationship - The relationship to delete
 * @param {string} relationshipType - Display type (Mother, Father, Spouse, Child, etc.)
 * @param {Object} person - The person on the other end of the relationship
 * @returns {Promise<void>}
 *
 * @example
 * // Delete a mother relationship
 * await deleteRelationship(motherRel, 'Mother', motherPerson)
 *
 * @example
 * // Delete a spouse relationship (deletes both bidirectional relationships)
 * await deleteRelationship(spouseRel, 'Spouse', spousePerson)
 */
export async function deleteRelationship(relationship, relationshipType, person) {
  // Capture current state for rollback
  const currentRelationships = get(relationships)

  // Determine if this is a bidirectional spouse relationship
  const isSpouse = relationship.type === 'spouse'
  const reverseRelationship = isSpouse
    ? findReverseSpouseRelationship(relationship, currentRelationships)
    : null

  // Collect all relationship IDs to delete
  const relationshipIdsToDelete = [relationship.id]
  const relationshipsToDelete = [relationship]

  if (reverseRelationship) {
    relationshipIdsToDelete.push(reverseRelationship.id)
    relationshipsToDelete.push(reverseRelationship)
  }

  // Apply optimistic update - remove all relationships immediately
  const optimisticRelationships = currentRelationships.filter(rel =>
    !relationshipIdsToDelete.includes(rel.id)
  )
  relationships.set(optimisticRelationships)

  try {
    // Delete all relationships via API
    await Promise.all(
      relationshipIdsToDelete.map(id => api.deleteRelationship(id))
    )

    // Success - show notification
    successNotification('Relationship removed successfully')
  } catch (err) {
    // Rollback - restore all deleted relationships
    relationships.set(currentRelationships)
    errorNotification('Failed to remove relationship')
  }
}
