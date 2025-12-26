/**
 * Smart filtering logic for linking existing people as spouses.
 *
 * Implements validation rules to prevent:
 * - Circular relationships (person as their own spouse)
 * - Descendant relationships (child/grandchild as spouse)
 * - Ancestor relationships (parent/grandparent as spouse)
 * - Duplicate spouse relationships (same person linked twice)
 * - Chronologically invalid relationships (age difference > 50 years)
 *
 * Supports multiple spouses (sequential marriages).
 *
 * @module linkExistingSpouseFilters
 */

/**
 * Maximum reasonable age difference between spouses in years.
 * Based on societal norms and biological plausibility.
 */
const MAX_SPOUSE_AGE_DIFFERENCE = 50

/**
 * Validates if two people have a reasonable age difference for marriage.
 * Returns true if:
 * - Age difference is 50 years or less
 * - Either person has no birth date (can't validate, so allow)
 *
 * @param {Object} person1 - First person
 * @param {Object} person2 - Second person
 * @returns {boolean} True if age difference is valid or indeterminate
 */
export function isValidSpouseByAge(person1, person2) {
  // If either person has no birth date, we can't validate age
  if (!person1.birthDate || !person2.birthDate) {
    return true
  }

  const person1BirthYear = new Date(person1.birthDate).getFullYear()
  const person2BirthYear = new Date(person2.birthDate).getFullYear()

  const ageDifference = Math.abs(person2BirthYear - person1BirthYear)

  return ageDifference <= MAX_SPOUSE_AGE_DIFFERENCE
}

/**
 * Finds all descendants of a person recursively.
 *
 * @param {number} personId - ID of person to find descendants for
 * @param {Object[]} allPeople - All people in the system
 * @param {Object[]} allRelationships - All relationships in the system
 * @returns {Set<number>} Set of descendant person IDs
 */
function findDescendants(personId, allPeople, allRelationships) {
  const descendants = new Set()

  function traverse(currentPersonId) {
    // Find all children of current person
    const childRelationships = allRelationships.filter(rel =>
      rel.type === 'parentOf' && rel.person1Id === currentPersonId
    )

    childRelationships.forEach(rel => {
      const childId = rel.person2Id
      if (!descendants.has(childId)) {
        descendants.add(childId)
        traverse(childId) // Recursively find grandchildren, etc.
      }
    })
  }

  traverse(personId)
  return descendants
}

/**
 * Finds all ancestors of a person recursively.
 *
 * @param {number} personId - ID of person to find ancestors for
 * @param {Object[]} allPeople - All people in the system
 * @param {Object[]} allRelationships - All relationships in the system
 * @returns {Set<number>} Set of ancestor person IDs
 */
function findAncestors(personId, allPeople, allRelationships) {
  const ancestors = new Set()

  function traverse(currentPersonId) {
    // Find all parents of current person
    const parentRelationships = allRelationships.filter(rel =>
      rel.type === 'parentOf' && rel.person2Id === currentPersonId
    )

    parentRelationships.forEach(rel => {
      const parentId = rel.person1Id
      if (!ancestors.has(parentId)) {
        ancestors.add(parentId)
        traverse(parentId) // Recursively find grandparents, etc.
      }
    })
  }

  traverse(personId)
  return ancestors
}

/**
 * Creates a filter function for spouse candidates.
 *
 * Excludes:
 * - The person themselves
 * - Existing spouses
 * - Descendants of the person (children, grandchildren, etc.)
 * - Ancestors of the person (parents, grandparents, etc.)
 * - People with age difference > 50 years
 *
 * Allows:
 * - Multiple spouses (sequential marriages)
 * - Unrelated people with reasonable age difference
 *
 * @param {Object} person - Person object
 * @param {Object[]} personRelationships - Relationships involving the person
 * @param {Object[]} allPeople - All people in the system
 * @param {Object[]} allRelationships - All relationships in the system
 * @returns {Function} Filter function that takes a person and returns boolean
 */
export function createSpouseFilter(person, personRelationships, allPeople, allRelationships) {
  // Find all existing spouses
  const existingSpouses = new Set()
  personRelationships
    .filter(rel => rel.type === 'spouse')
    .forEach(rel => {
      const spouseId = rel.person1Id === person.id ? rel.person2Id : rel.person1Id
      existingSpouses.add(spouseId)
    })

  // Find all descendants of person (children, grandchildren, etc.)
  const descendants = findDescendants(person.id, allPeople, allRelationships)

  // Find all ancestors of person (parents, grandparents, etc.)
  const ancestors = findAncestors(person.id, allPeople, allRelationships)

  return function(candidate) {
    // Exclude the person themselves
    if (candidate.id === person.id) {
      return false
    }

    // Exclude existing spouses
    if (existingSpouses.has(candidate.id)) {
      return false
    }

    // Exclude descendants
    if (descendants.has(candidate.id)) {
      return false
    }

    // Exclude ancestors
    if (ancestors.has(candidate.id)) {
      return false
    }

    // Validate age difference
    if (!isValidSpouseByAge(person, candidate)) {
      return false
    }

    return true
  }
}
