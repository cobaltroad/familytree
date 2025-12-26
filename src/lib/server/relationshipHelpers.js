/**
 * Server-side helper functions for Relationship API routes
 * Provides reusable utilities for data transformation, validation, and business logic
 */

/**
 * Normalizes relationship type and direction for database storage
 * Converts "mother"/"father" to "parentOf" with parent_role
 *
 * Business logic:
 * - type: "mother" → type: "parentOf", parent_role: "mother"
 * - type: "father" → type: "parentOf", parent_role: "father"
 * - type: "parentOf" with parentRole → keep as-is (already normalized)
 * - type: "spouse" → type: "spouse", parent_role: null
 *
 * @param {number} person1Id - First person ID
 * @param {number} person2Id - Second person ID (child for parent relationships)
 * @param {string} type - Relationship type ("mother", "father", "spouse", "parentOf")
 * @param {string} parentRole - Parent role (for "parentOf" type)
 * @returns {Object} Normalized relationship { person1Id, person2Id, type, parentRole }
 */
export function normalizeRelationship(person1Id, person2Id, type, parentRole) {
  if (type === 'mother' || type === 'father') {
    // Person1 is mother/father of Person2
    return {
      person1Id,
      person2Id,
      type: 'parentOf',
      parentRole: type
    }
  }

  if (type === 'parentOf') {
    // Already normalized, just pass through
    return {
      person1Id,
      person2Id,
      type: 'parentOf',
      parentRole: parentRole
    }
  }

  // Spouse relationships stored as-is
  return {
    person1Id,
    person2Id,
    type,
    parentRole: null
  }
}

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
 * Transforms relationship from database format to API format
 * Denormalizes parentOf relationships back to mother/father for API responses
 * Always includes parentRole field (null for non-parent relationships)
 *
 * @param {Object} relationship - Relationship from database
 * @returns {Object} Transformed relationship for API response
 */
export function denormalizeRelationship(relationship) {
  // If it's a parentOf relationship with a parentRole, denormalize the type
  let type = relationship.type
  let parentRole = relationship.parentRole || null

  if (relationship.type === 'parentOf' && relationship.parentRole) {
    // Denormalize: parentOf + parentRole="mother" → type="mother", parentRole="mother"
    type = relationship.parentRole
  }

  // Always return all fields including parentRole (even if null)
  return {
    id: relationship.id,
    person1Id: relationship.person1Id,
    person2Id: relationship.person2Id,
    type: type,
    parentRole: parentRole,
    createdAt: toRFC3339(relationship.createdAt)
  }
}

/**
 * Transforms a relationship database record to API response format
 * Converts snake_case to camelCase and denormalizes parent types
 *
 * @param {Object} relationship - Relationship record from database
 * @returns {Object} Transformed relationship object
 */
export function transformRelationshipToAPI(relationship) {
  return denormalizeRelationship(relationship)
}

/**
 * Transforms an array of relationship database records to API response format
 *
 * @param {Array} relationships - Array of relationship records from database
 * @returns {Array} Array of transformed relationship objects
 */
export function transformRelationshipsToAPI(relationships) {
  return relationships.map(transformRelationshipToAPI)
}

/**
 * Validates relationship type
 * Only "mother", "father", "spouse", and "parentOf" are valid
 * "parentOf" requires a parentRole parameter ("mother" or "father")
 *
 * @param {string} type - Relationship type
 * @param {string} parentRole - Parent role (only for parentOf type)
 * @returns {Object} Validation result { valid: boolean, error: string|null }
 */
export function validateRelationshipType(type, parentRole) {
  const validTypes = ['mother', 'father', 'spouse', 'parentOf']

  if (!type || typeof type !== 'string') {
    return { valid: false, error: 'type is required and must be a string' }
  }

  if (!validTypes.includes(type)) {
    return {
      valid: false,
      error: 'Invalid relationship type. Must be: mother, father, spouse, or parentOf'
    }
  }

  // If type is parentOf, validate parentRole
  if (type === 'parentOf') {
    if (!parentRole || typeof parentRole !== 'string') {
      return { valid: false, error: 'parentOf type requires a parentRole parameter' }
    }
    if (parentRole !== 'mother' && parentRole !== 'father') {
      return { valid: false, error: 'parentRole must be "mother" or "father"' }
    }
  }

  return { valid: true, error: null }
}

/**
 * Validates relationship data for create/update operations
 *
 * @param {Object} data - Relationship data from request body
 * @returns {Object} Validation result { valid: boolean, error: string|null }
 */
export function validateRelationshipData(data) {
  if (!data.person1Id || typeof data.person1Id !== 'number') {
    return { valid: false, error: 'person1Id is required and must be a number' }
  }

  if (!data.person2Id || typeof data.person2Id !== 'number') {
    return { valid: false, error: 'person2Id is required and must be a number' }
  }

  // Prevent self-referential relationships
  if (data.person1Id === data.person2Id) {
    return { valid: false, error: 'A person cannot be related to themselves' }
  }

  // Validate type (pass parentRole if provided)
  const typeValidation = validateRelationshipType(data.type, data.parentRole)
  if (!typeValidation.valid) {
    return typeValidation
  }

  return { valid: true, error: null }
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
