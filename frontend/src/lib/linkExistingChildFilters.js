/**
 * Smart filtering logic for linking existing people as children.
 *
 * Implements validation rules to prevent:
 * - Circular relationships (parent as their own child)
 * - Ancestor relationships (parent/grandparent as child)
 * - Descendant relationships (grandchild as direct child - prevents loops)
 * - Duplicate child relationships (same person linked twice)
 * - Chronologically invalid relationships (child too old, parent too young)
 *
 * Supports multiple children per parent (same parent role).
 *
 * @module linkExistingChildFilters
 */

/**
 * Minimum age difference between parent and child in years.
 * Based on biological constraints (youngest verified parent was 13).
 */
const MIN_PARENT_AGE_DIFFERENCE = 13

/**
 * Validates if a parent is old enough to have a child.
 * Returns true if:
 * - Parent is at least 13 years older than child
 * - Either person has no birth date (can't validate, so allow)
 *
 * @param {Object} parent - Parent person
 * @param {Object} child - Potential child person
 * @returns {boolean} True if age difference is valid or indeterminate
 */
export function isValidChildByAge(parent, child) {
  // If either person has no birth date, we can't validate age
  if (!parent.birthDate || !child.birthDate) {
    return true
  }

  const parentBirthYear = new Date(parent.birthDate).getFullYear()
  const childBirthYear = new Date(child.birthDate).getFullYear()

  const ageDifference = childBirthYear - parentBirthYear

  return ageDifference >= MIN_PARENT_AGE_DIFFERENCE
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
 * Creates a filter function for child candidates.
 *
 * Excludes:
 * - The parent themselves
 * - Existing children of the parent
 * - Ancestors of the parent (parents, grandparents, etc.)
 * - Descendants of the parent (grandchildren, great-grandchildren, etc.)
 * - People chronologically too old to be children (< 13 years younger than parent)
 *
 * Allows:
 * - Multiple children per parent (same parent role)
 * - Unrelated people with valid age difference
 * - People without birth dates (cannot validate chronologically)
 *
 * @param {Object} parent - Parent person object
 * @param {Object[]} parentRelationships - Relationships involving the parent
 * @param {Object[]} allPeople - All people in the system
 * @param {Object[]} allRelationships - All relationships in the system
 * @returns {Function} Filter function that takes a person and returns boolean
 */
export function createChildFilter(parent, parentRelationships, allPeople, allRelationships) {
  // Find all existing children
  const existingChildren = new Set()
  parentRelationships
    .filter(rel => rel.type === 'parentOf' && rel.person1Id === parent.id)
    .forEach(rel => {
      existingChildren.add(rel.person2Id)
    })

  // Find all descendants of parent (children, grandchildren, etc.)
  const descendants = findDescendants(parent.id, allPeople, allRelationships)

  // Find all ancestors of parent (parents, grandparents, etc.)
  const ancestors = findAncestors(parent.id, allPeople, allRelationships)

  return function(candidate) {
    // Exclude the parent themselves
    if (candidate.id === parent.id) {
      return false
    }

    // Exclude existing children
    if (existingChildren.has(candidate.id)) {
      return false
    }

    // Exclude descendants (grandchildren can't be direct children - prevents loops)
    if (descendants.has(candidate.id)) {
      return false
    }

    // Exclude ancestors (grandparents can't be children)
    if (ancestors.has(candidate.id)) {
      return false
    }

    // Validate age difference
    if (!isValidChildByAge(parent, candidate)) {
      return false
    }

    return true
  }
}
