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
 * @param {Object} spouse - Optional spouse object to add as second parent
 * @param {boolean} includeSpouse - Whether to include the spouse as the other parent
 * @returns {Promise<Object>} - Result object with success status, person, relationships, and error
 */
export async function addChildWithRelationship(api, childData, parentId, parentRole, spouse = null, includeSpouse = false) {
  let createdChild = null
  let firstRelationship = null
  const relationships = []

  try {
    // Step 1: Create the child person
    createdChild = await api.createPerson(childData)

    // Step 2: Create the primary parent-child relationship
    firstRelationship = await api.createRelationship({
      person1Id: parentId,
      person2Id: createdChild.id,
      type: parentRole,
      parentRole: parentRole
    })
    relationships.push(firstRelationship)

    // Step 3: Create the spouse parent-child relationship if spouse is included
    if (includeSpouse && spouse && spouse.id) {
      const spouseParentRole = determineParentRole(spouse.gender)

      // Only create second relationship if we can determine spouse's parent role
      if (spouseParentRole) {
        try {
          const secondRelationship = await api.createRelationship({
            person1Id: spouse.id,
            person2Id: createdChild.id,
            type: spouseParentRole,
            parentRole: spouseParentRole
          })
          relationships.push(secondRelationship)
        } catch (secondError) {
          // If second relationship creation fails, rollback everything
          throw secondError
        }
      }
    }

    return {
      person: createdChild,
      relationship: firstRelationship, // For backwards compatibility
      relationships: relationships,
      success: true
    }
  } catch (error) {
    // Rollback all created resources
    if (createdChild && createdChild.id) {
      try {
        await api.deletePerson(createdChild.id)
      } catch (rollbackError) {
        console.error('Failed to rollback person creation:', rollbackError)
      }
    }

    // Rollback any created relationships
    if (firstRelationship && firstRelationship.id) {
      try {
        await api.deleteRelationship(firstRelationship.id)
      } catch (rollbackError) {
        console.error('Failed to rollback first relationship:', rollbackError)
      }
    }

    return {
      person: null,
      relationship: null,
      relationships: [],
      success: false,
      error: error.message
    }
  }
}
