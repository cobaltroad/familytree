/**
 * Utility functions for Quick Add Child functionality
 */

/**
 * Determines the parent role (mother/father) based on parent's gender
 * @param {string} parentGender - The gender of the parent ('male', 'female', 'other', or '')
 * @returns {string|null} - 'father' for male, 'mother' for female, null for other/unspecified
 */
export function determineParentRole(parentGender) {
  if (parentGender === 'male') return 'father'
  if (parentGender === 'female') return 'mother'
  return null // For 'other' or unspecified, user must select
}

/**
 * Prepares initial form data for adding a child
 * Pre-fills the last name from the parent
 * @param {Object} parent - The parent person object
 * @returns {Object} - Initial form data for the child
 */
export function prepareChildFormData(parent) {
  return {
    firstName: '',
    lastName: parent?.lastName || '',
    birthDate: '',
    deathDate: '',
    gender: ''
  }
}

/**
 * Creates relationship payload for parent-child relationship
 * @param {number} parentId - The ID of the parent
 * @param {number} childId - The ID of the child
 * @param {string} parentRole - 'mother' or 'father'
 * @returns {Object} - Relationship payload ready for API
 * @throws {Error} - If parentRole is not specified
 */
export function createParentChildRelationship(parentId, childId, parentRole) {
  if (!parentRole) {
    throw new Error('Parent role must be specified')
  }

  return {
    person1Id: parentId,
    person2Id: childId,
    type: parentRole, // 'mother' or 'father' - backend normalizes to 'parentOf'
    parentRole: parentRole
  }
}

/**
 * Combines person creation and relationship creation into a single atomic operation
 * If relationship creation fails, the person creation is rolled back
 * @param {Object} api - The API client object
 * @param {Object} childData - The child person data
 * @param {number} parentId - The ID of the parent
 * @param {string} parentRole - 'mother' or 'father'
 * @returns {Promise<Object>} - Result object with success status, person, relationship, and error
 */
export async function addChildWithRelationship(api, childData, parentId, parentRole) {
  let createdChild = null

  try {
    // Step 1: Create the child person
    createdChild = await api.createPerson(childData)

    // Step 2: Create the parent-child relationship
    const relationship = await api.createRelationship({
      person1Id: parentId,
      person2Id: createdChild.id,
      type: parentRole,
      parentRole: parentRole
    })

    return {
      person: createdChild,
      relationship: relationship,
      success: true
    }
  } catch (error) {
    // If relationship creation fails, we should rollback person creation
    if (createdChild && createdChild.id) {
      try {
        await api.deletePerson(createdChild.id)
      } catch (rollbackError) {
        console.error('Failed to rollback person creation:', rollbackError)
      }
    }

    return {
      person: null,
      relationship: null,
      success: false,
      error: error.message
    }
  }
}
