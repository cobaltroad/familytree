/**
 * Utility functions for Smart Relationship Creator
 * Issue #88: Bidirectional Relationship Handling
 *
 * This module provides logic for:
 * - Determining parent roles based on gender
 * - Building relationship payloads for all relationship types
 * - Handling bidirectional spouse relationships
 * - Validating relationship data
 */

/**
 * Determines the parent role (mother/father) based on a person's gender.
 * Returns null for ambiguous cases (other/unspecified) where user selection is required.
 *
 * @param {string|null|undefined} gender - The gender of the person ('male', 'female', 'other', or '')
 * @returns {string|null} - 'father' for male, 'mother' for female, null for other/unspecified
 */
export function determineParentRoleFromGender(gender) {
  if (gender === 'male') return 'father'
  if (gender === 'female') return 'mother'
  return null // For 'other', '', null, or undefined - user must select
}

/**
 * Checks if parent role selection is needed based on relationship type and focus person's gender.
 * Only needed when adding a child and the focus person has ambiguous gender.
 *
 * @param {string} relationshipType - The type of relationship being created
 * @param {string} focusPersonGender - The gender of the focus person
 * @returns {boolean} - True if user must select parent role, false otherwise
 */
export function needsParentRoleSelection(relationshipType, focusPersonGender) {
  // Parent role selection is only needed when adding a child with ambiguous gender
  if (relationshipType !== 'child') return false

  // If gender is other or unspecified, user must select role
  const role = determineParentRoleFromGender(focusPersonGender)
  return role === null
}

/**
 * Helper function to create a parent-child relationship payload.
 * @private
 *
 * @param {number} parentId - ID of the parent
 * @param {number} childId - ID of the child
 * @param {string} parentRole - 'mother' or 'father'
 * @returns {Object} - Relationship payload
 */
function createParentChildPayload(parentId, childId, parentRole) {
  return {
    person1Id: parentId,
    person2Id: childId,
    type: parentRole,
    parentRole: parentRole
  }
}

/**
 * Builds relationship payload(s) for creating relationships between focus person and new person.
 * Returns an array of payloads because spouse relationships are bidirectional (2 payloads).
 *
 * Relationship Logic:
 * - Child: Focus person is parent of new person (parent1 -> child)
 * - Mother/Father: New person is parent of focus person (parent -> child1)
 * - Spouse: Bidirectional (person1 <-> person2)
 *
 * @param {Object} params - Relationship parameters
 * @param {string} params.relationshipType - Type: 'child', 'mother', 'father', 'spouse'
 * @param {number} params.focusPersonId - ID of the focus person (existing)
 * @param {number} params.newPersonId - ID of the newly created person
 * @param {string} params.focusPersonGender - Gender of focus person (for role determination)
 * @param {string} [params.selectedParentRole] - Explicitly selected role ('mother'/'father') for ambiguous cases
 * @returns {Array<Object>} - Array of relationship payloads (1 for parent/child, 2 for spouse)
 * @throws {Error} - If parameters are invalid or parent role selection is required but missing
 */
export function buildRelationshipPayloads({
  relationshipType,
  focusPersonId,
  newPersonId,
  focusPersonGender,
  selectedParentRole = null
}) {
  // Validate required parameters
  if (!focusPersonId || !newPersonId) {
    throw new Error('Missing required parameters: focusPersonId and newPersonId are required')
  }

  // Handle each relationship type
  switch (relationshipType) {
    case 'child': {
      // Focus person is parent, new person is child
      // Determine parent role from focus person's gender or use explicit selection
      let parentRole = selectedParentRole

      if (!parentRole) {
        parentRole = determineParentRoleFromGender(focusPersonGender)
      }

      if (!parentRole) {
        throw new Error('Parent role selection required for ambiguous gender (other/unspecified)')
      }

      return [createParentChildPayload(focusPersonId, newPersonId, parentRole)]
    }

    case 'mother':
      // New person is mother of focus person
      return [createParentChildPayload(newPersonId, focusPersonId, 'mother')]

    case 'father':
      // New person is father of focus person
      return [createParentChildPayload(newPersonId, focusPersonId, 'father')]

    case 'spouse': {
      // Spouse relationships are BIDIRECTIONAL - create both directions
      return [
        {
          person1Id: focusPersonId,
          person2Id: newPersonId,
          type: 'spouse',
          parentRole: null
        },
        {
          person1Id: newPersonId,
          person2Id: focusPersonId,
          type: 'spouse',
          parentRole: null
        }
      ]
    }

    default:
      throw new Error(`Invalid relationship type: ${relationshipType}. Valid types: child, mother, father, spouse`)
  }
}

/**
 * Validates relationship data before attempting to create relationships.
 * Provides user-friendly error messages for missing or invalid data.
 *
 * @param {Object} params - Relationship parameters (same as buildRelationshipPayloads)
 * @returns {Object} - { valid: boolean, error: string|null }
 */
export function validateRelationshipData({
  relationshipType,
  focusPersonId,
  newPersonId,
  focusPersonGender,
  selectedParentRole = null
}) {
  // Validate required IDs
  if (!focusPersonId || !newPersonId) {
    return {
      valid: false,
      error: 'Missing person IDs'
    }
  }

  // Validate relationship type
  const validTypes = ['child', 'mother', 'father', 'spouse']
  if (!validTypes.includes(relationshipType)) {
    return {
      valid: false,
      error: `Invalid relationship type: ${relationshipType}`
    }
  }

  // Check if parent role selection is needed but missing
  if (needsParentRoleSelection(relationshipType, focusPersonGender) && !selectedParentRole) {
    return {
      valid: false,
      error: 'Please select parent role (mother or father) for ambiguous gender'
    }
  }

  // All validation passed
  return {
    valid: true,
    error: null
  }
}
