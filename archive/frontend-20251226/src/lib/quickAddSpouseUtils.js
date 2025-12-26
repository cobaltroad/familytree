/**
 * Utility functions for Quick Add Spouse functionality
 */

/**
 * Prepares initial form data for adding a spouse
 * Pre-fills the last name from the person
 * NOTE: Gender is NOT pre-populated (spouse can be any gender, supporting same-sex partnerships)
 * @param {Object} person - The person object
 * @returns {Object} - Initial form data for the spouse
 */
export function prepareSpouseFormData(person) {
  return {
    firstName: '',
    lastName: person?.lastName || '',
    birthDate: '',
    deathDate: '',
    gender: '' // NOT pre-populated - spouse can be any gender
  }
}

/**
 * Creates bidirectional spouse relationship payloads
 * Spouse relationships are symmetric (both directions must exist)
 * @param {number} person1Id - The ID of the first person
 * @param {number} person2Id - The ID of the second person (spouse)
 * @returns {Array<Object>} - Array of two relationship payloads (bidirectional)
 */
export function createSpouseRelationship(person1Id, person2Id) {
  return [
    {
      person1Id: person1Id,
      person2Id: person2Id,
      type: 'spouse',
      parentRole: null
    },
    {
      person1Id: person2Id,
      person2Id: person1Id,
      type: 'spouse',
      parentRole: null
    }
  ]
}

/**
 * Combines spouse creation and bidirectional relationship creation into a single atomic operation
 * If any relationship creation fails, the spouse creation is rolled back
 * @param {Object} api - The API client object
 * @param {Object} spouseData - The spouse person data
 * @param {number} personId - The ID of the person
 * @returns {Promise<Object>} - Result object with success status, person, relationships, and error
 */
export async function addSpouseWithRelationship(api, spouseData, personId) {
  let createdSpouse = null
  let createdRelationships = []

  try {
    // Step 1: Create the spouse person
    createdSpouse = await api.createPerson(spouseData)

    // Step 2: Create the first spouse relationship (person -> spouse)
    const relationship1 = await api.createRelationship({
      person1Id: personId,
      person2Id: createdSpouse.id,
      type: 'spouse',
      parentRole: null
    })
    createdRelationships.push(relationship1)

    // Step 3: Create the second spouse relationship (spouse -> person)
    const relationship2 = await api.createRelationship({
      person1Id: createdSpouse.id,
      person2Id: personId,
      type: 'spouse',
      parentRole: null
    })
    createdRelationships.push(relationship2)

    return {
      person: createdSpouse,
      relationships: createdRelationships,
      success: true
    }
  } catch (error) {
    // If any step fails, we should rollback person creation
    // NOTE: Backend should handle relationship cleanup via foreign key cascade
    if (createdSpouse && createdSpouse.id) {
      try {
        await api.deletePerson(createdSpouse.id)
      } catch (rollbackError) {
        console.error('Failed to rollback person creation:', rollbackError)
      }
    }

    return {
      person: null,
      relationships: null,
      success: false,
      error: error.message
    }
  }
}
