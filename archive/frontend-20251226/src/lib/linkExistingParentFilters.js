/**
 * Smart filtering logic for linking existing people as parents.
 *
 * Implements validation rules to prevent:
 * - Circular relationships (person as their own parent)
 * - Descendant relationships (child/grandchild as parent)
 * - Ancestor relationships (grandparent/great-grandparent as direct parent)
 * - Chronologically invalid relationships (parent too young)
 *
 * @module linkExistingParentFilters
 */

/**
 * Minimum age difference between parent and child in years.
 * Based on biological constraints (youngest verified parent was 13).
 */
const MIN_PARENT_AGE_DIFFERENCE = 13

/**
 * Validates if a person is old enough to be a parent of another person.
 * Returns true if:
 * - Parent is at least 13 years older than child
 * - Either person has no birth date (can't validate, so allow)
 *
 * @param {Object} parent - Potential parent person
 * @param {Object} child - Child person
 * @returns {boolean} True if age difference is valid or indeterminate
 */
export function isValidParentByAge(parent, child) {
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
 * Creates a filter function for mother candidates.
 *
 * Excludes:
 * - The child themselves
 * - Descendants of the child
 * - Ancestors of the child (grandmothers, great-grandmothers)
 * - People too young to be the parent (< 13 years older)
 * - Current mother (if exists)
 *
 * @param {Object} child - Child person object
 * @param {Object[]} childRelationships - Relationships involving the child
 * @param {Object[]} allPeople - All people in the system
 * @param {Object[]} allRelationships - All relationships in the system
 * @returns {Function} Filter function that takes a person and returns boolean
 */
export function createMotherFilter(child, childRelationships, allPeople, allRelationships) {
  // Find current mother if exists
  const currentMother = childRelationships.find(rel =>
    rel.type === 'parentOf' &&
    rel.person2Id === child.id &&
    rel.parentRole === 'mother'
  )
  const currentMotherId = currentMother?.person1Id

  // Find all descendants of child (children, grandchildren, etc.)
  const descendants = findDescendants(child.id, allPeople, allRelationships)

  // Find all ancestors of child (parents, grandparents, etc.)
  const ancestors = findAncestors(child.id, allPeople, allRelationships)

  return function(person) {
    // Exclude the child themselves
    if (person.id === child.id) {
      return false
    }

    // Exclude current mother
    if (currentMotherId && person.id === currentMotherId) {
      return false
    }

    // Exclude descendants
    if (descendants.has(person.id)) {
      return false
    }

    // Exclude ancestors (grandmothers can't be direct mothers)
    if (ancestors.has(person.id)) {
      return false
    }

    // Validate age difference
    if (!isValidParentByAge(person, child)) {
      return false
    }

    return true
  }
}

/**
 * Creates a filter function for father candidates.
 *
 * Excludes:
 * - The child themselves
 * - Descendants of the child
 * - Ancestors of the child (grandfathers, great-grandfathers)
 * - People too young to be the parent (< 13 years older)
 * - Current father (if exists)
 *
 * @param {Object} child - Child person object
 * @param {Object[]} childRelationships - Relationships involving the child
 * @param {Object[]} allPeople - All people in the system
 * @param {Object[]} allRelationships - All relationships in the system
 * @returns {Function} Filter function that takes a person and returns boolean
 */
export function createFatherFilter(child, childRelationships, allPeople, allRelationships) {
  // Find current father if exists
  const currentFather = childRelationships.find(rel =>
    rel.type === 'parentOf' &&
    rel.person2Id === child.id &&
    rel.parentRole === 'father'
  )
  const currentFatherId = currentFather?.person1Id

  // Find all descendants of child (children, grandchildren, etc.)
  const descendants = findDescendants(child.id, allPeople, allRelationships)

  // Find all ancestors of child (parents, grandparents, etc.)
  const ancestors = findAncestors(child.id, allPeople, allRelationships)

  return function(person) {
    // Exclude the child themselves
    if (person.id === child.id) {
      return false
    }

    // Exclude current father
    if (currentFatherId && person.id === currentFatherId) {
      return false
    }

    // Exclude descendants
    if (descendants.has(person.id)) {
      return false
    }

    // Exclude ancestors (grandfathers can't be direct fathers)
    if (ancestors.has(person.id)) {
      return false
    }

    // Validate age difference
    if (!isValidParentByAge(person, child)) {
      return false
    }

    return true
  }
}
