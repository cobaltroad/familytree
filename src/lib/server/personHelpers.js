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
 * Always includes all fields (including null values) for consistent API interface
 *
 * Issue #72: Now includes userId for multi-user support
 * Story #77: Now includes photoUrl for photo storage
 * Issue #121: Now includes birthSurname and nickname
 *
 * @param {Object} person - Person record from database
 * @returns {Object} Transformed person object
 */
export function transformPersonToAPI(person) {
  return {
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    birthDate: person.birthDate !== undefined ? person.birthDate : null,
    deathDate: person.deathDate !== undefined ? person.deathDate : null,
    gender: person.gender !== undefined && person.gender !== '' ? person.gender : null,
    photoUrl: person.photoUrl !== undefined ? person.photoUrl : null,
    birthSurname: person.birthSurname !== undefined ? person.birthSurname : null,
    nickname: person.nickname !== undefined ? person.nickname : null,
    createdAt: toRFC3339(person.createdAt),
    userId: person.userId
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
 * Validates a date string in YYYY-MM-DD format
 *
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid YYYY-MM-DD format and valid calendar date
 */
function isValidDate(dateString) {
  if (!dateString) return true // Optional dates are allowed

  // Check format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateString)) {
    return false
  }

  // Validate it's a real calendar date
  const date = new Date(dateString + 'T00:00:00Z') // Add time to avoid timezone issues
  const [year, month, day] = dateString.split('-').map(Number)

  // Check if the date is valid (handles Feb 30, month 13, day 32, etc.)
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 && // getUTCMonth() is 0-indexed
    date.getUTCDate() === day
  )
}

/**
 * Validates a name field (birthSurname or nickname) for allowed characters and length
 * Issue #121: AC7 validation requirements
 *
 * @param {string} value - The name field value
 * @param {string} fieldName - The field name for error messages
 * @returns {Object} Validation result { valid: boolean, error: string|null }
 */
function validateNameField(value, fieldName) {
  // Allow null, undefined, or empty string (optional fields)
  if (value === null || value === undefined || value === '') {
    return { valid: true, error: null }
  }

  // Must be a string
  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` }
  }

  // Check maximum length (255 characters)
  if (value.length > 255) {
    return { valid: false, error: `${fieldName} must not exceed 255 characters` }
  }

  // Check for valid characters: letters, hyphens, apostrophes, spaces, and dots (for nicknames like J.J.)
  // This regex allows: letters (any language), spaces, hyphens, apostrophes, and dots
  const validCharPattern = /^[a-zA-ZÀ-ÿ\s\-'.]+$/
  if (!validCharPattern.test(value)) {
    return { valid: false, error: `${fieldName} can only contain letters, hyphens, apostrophes, spaces, and dots` }
  }

  return { valid: true, error: null }
}

/**
 * Validates person data for create/update operations
 *
 * Story #77: Added photoUrl validation
 * Issue #121: Added birthSurname and nickname validation with AC7 requirements
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

  // Validate birthDate format if provided
  if (data.birthDate && !isValidDate(data.birthDate)) {
    return { valid: false, error: 'birthDate must be in YYYY-MM-DD format and a valid calendar date' }
  }

  // Validate deathDate format if provided
  if (data.deathDate && !isValidDate(data.deathDate)) {
    return { valid: false, error: 'deathDate must be in YYYY-MM-DD format and a valid calendar date' }
  }

  // Validate deathDate is not before birthDate
  if (data.birthDate && data.deathDate) {
    const birth = new Date(data.birthDate + 'T00:00:00Z')
    const death = new Date(data.deathDate + 'T00:00:00Z')
    if (death < birth) {
      return { valid: false, error: 'deathDate cannot be before birthDate' }
    }
  }

  // Validate gender if provided (must be lowercase)
  if (data.gender !== undefined && data.gender !== null && data.gender !== '') {
    const validGenders = ['male', 'female', 'other', 'unspecified']
    if (typeof data.gender !== 'string') {
      return { valid: false, error: 'gender must be a string' }
    }
    if (!validGenders.includes(data.gender)) {
      return { valid: false, error: 'gender must be one of: male, female, other, unspecified (lowercase)' }
    }
  }

  // Validate photoUrl if provided (Story #77)
  if (data.photoUrl !== undefined && data.photoUrl !== null) {
    if (typeof data.photoUrl !== 'string') {
      return { valid: false, error: 'photoUrl must be a string' }
    }
  }

  // Validate birthSurname if provided (Issue #121: AC7)
  if (data.birthSurname !== undefined && data.birthSurname !== null && data.birthSurname !== '') {
    const birthSurnameValidation = validateNameField(data.birthSurname, 'birthSurname')
    if (!birthSurnameValidation.valid) {
      return birthSurnameValidation
    }
  }

  // Validate nickname if provided (Issue #121: AC7)
  if (data.nickname !== undefined && data.nickname !== null && data.nickname !== '') {
    const nicknameValidation = validateNameField(data.nickname, 'nickname')
    if (!nicknameValidation.valid) {
      return nicknameValidation
    }
  }

  return { valid: true, error: null }
}
