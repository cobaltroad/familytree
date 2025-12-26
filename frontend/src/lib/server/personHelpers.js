/**
 * Server-side helper functions for Person API routes
 * Provides reusable utilities for data transformation and validation
 */

/**
 * Converts SQLite datetime string to RFC3339 format (ISO 8601 with timezone)
 * SQLite CURRENT_TIMESTAMP: "YYYY-MM-DD HH:MM:SS"
 * RFC3339: "YYYY-MM-DDTHH:MM:SSZ"
 *
 * @param {string} sqliteDateTime - SQLite datetime string
 * @returns {string} RFC3339 formatted datetime string
 */
function toRFC3339(sqliteDateTime) {
  if (!sqliteDateTime) return sqliteDateTime
  // Replace space with 'T' and append 'Z' for UTC timezone
  return sqliteDateTime.replace(' ', 'T') + 'Z'
}

/**
 * Transforms a person database record to API response format
 * Converts snake_case column names to camelCase for consistency with frontend
 * Omits null/empty fields to match Go backend behavior (omitempty JSON tag)
 *
 * @param {Object} person - Person record from database
 * @returns {Object} Transformed person object
 */
export function transformPersonToAPI(person) {
  const result = {
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName
  }

  // Only include birthDate if not null
  if (person.birthDate !== null) {
    result.birthDate = person.birthDate
  }

  // Only include deathDate if not null
  if (person.deathDate !== null) {
    result.deathDate = person.deathDate
  }

  // Only include gender if not null and not empty string
  if (person.gender !== null && person.gender !== '') {
    result.gender = person.gender
  }

  // Always include createdAt in RFC3339 format
  result.createdAt = toRFC3339(person.createdAt)

  return result
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
  if (!data.firstName || typeof data.firstName !== 'string' || data.firstName.trim() === '') {
    return { valid: false, error: 'firstName is required and must be a non-empty string' }
  }

  if (!data.lastName || typeof data.lastName !== 'string' || data.lastName.trim() === '') {
    return { valid: false, error: 'lastName is required and must be a non-empty string' }
  }

  return { valid: true, error: null }
}
