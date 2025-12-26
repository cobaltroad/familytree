/**
 * Server-side helper functions for Person API routes
 * Provides reusable utilities for data transformation and validation
 */

/**
 * Transforms a person database record to API response format
 * Converts snake_case column names to camelCase for consistency with frontend
 *
 * @param {Object} person - Person record from database
 * @returns {Object} Transformed person object
 */
export function transformPersonToAPI(person) {
  return {
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    birthDate: person.birthDate,
    deathDate: person.deathDate,
    gender: person.gender,
    createdAt: person.createdAt
  }
}

/**
 * Transforms an array of person database records to API response format
 *
 * @param {Array} people - Array of person records from database
 * @returns {Array} Array of transformed person objects
 */
export function transformPeopleToAPI(people) {
  return people.map(transformPersonToAPI)
}

/**
 * Validates and parses an ID parameter from URL
 *
 * @param {string} id - The ID parameter from URL
 * @returns {number|null} Parsed ID or null if invalid
 */
export function parseId(id) {
  const parsed = parseInt(id, 10)
  if (isNaN(parsed) || parsed < 1) {
    return null
  }
  return parsed
}

/**
 * Validates person data for create/update operations
 *
 * @param {Object} data - Person data from request body
 * @returns {Object} Validation result { valid: boolean, error: string|null }
 */
export function validatePersonData(data) {
  if (!data.firstName || typeof data.firstName !== 'string') {
    return { valid: false, error: 'firstName is required and must be a string' }
  }

  if (!data.lastName || typeof data.lastName !== 'string') {
    return { valid: false, error: 'lastName is required and must be a string' }
  }

  return { valid: true, error: null }
}
