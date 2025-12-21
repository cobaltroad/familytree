/**
 * Utility functions for Quick Add Parent functionality
 */

/**
 * Determines the gender to pre-fill based on parent type
 * @param {string} parentType - The type of parent being added ('mother' or 'father')
 * @returns {string|null} - 'female' for mother, 'male' for father, null for invalid type
 */
export function determineChildGender(parentType) {
  if (parentType === 'mother') return 'female'
  if (parentType === 'father') return 'male'
  return null
}

/**
 * Prepares initial form data for adding a parent
 * Pre-fills the last name from the child
 * @param {Object} child - The child person object
 * @returns {Object} - Initial form data for the parent
 */
export function prepareParentFormData(child) {
  return {
    firstName: '',
    lastName: child?.lastName || '',
    birthDate: '',
    deathDate: '',
    gender: ''
  }
}

/**
 * Creates relationship payload for child-parent relationship
 * @param {number} parentId - The ID of the parent
 * @param {number} childId - The ID of the child
 * @param {string} parentType - 'mother' or 'father'
 * @returns {Object} - Relationship payload ready for API
 * @throws {Error} - If parentType is not specified or invalid
 */
export function createChildParentRelationship(parentId, childId, parentType) {
  if (!parentType) {
    throw new Error('Parent type must be specified')
  }

  if (parentType !== 'mother' && parentType !== 'father') {
    throw new Error('Parent type must be "mother" or "father"')
  }

  return {
    person1Id: parentId,
    person2Id: childId,
    type: parentType, // 'mother' or 'father' - backend normalizes to 'parentOf'
    parentRole: parentType
  }
}

/**
 * Combines parent creation and relationship creation into a single atomic operation
 * If relationship creation fails, the parent creation is rolled back
 * @param {Object} api - The API client object
 * @param {Object} parentData - The parent person data
 * @param {number} childId - The ID of the child
 * @param {string} parentType - 'mother' or 'father'
 * @returns {Promise<Object>} - Result object with success status, person, relationship, and error
 */
export async function addParentWithRelationship(api, parentData, childId, parentType) {
  let createdParent = null

  try {
    // Step 1: Create the parent person
    createdParent = await api.createPerson(parentData)

    // Step 2: Create the child-parent relationship
    const relationship = await api.createRelationship({
      person1Id: createdParent.id,
      person2Id: childId,
      type: parentType,
      parentRole: parentType
    })

    return {
      person: createdParent,
      relationship: relationship,
      success: true
    }
  } catch (error) {
    // If relationship creation fails, we should rollback parent creation
    if (createdParent && createdParent.id) {
      try {
        await api.deletePerson(createdParent.id)
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
