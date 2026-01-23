/**
 * Tree Helper Functions
 * Shared utilities for building and manipulating family tree data structures
 */

/**
 * Helper function to check if a relationship is a parent-child relationship
 * Handles both denormalized (type="mother"/"father") and normalized (type="parentOf") formats
 * The API returns denormalized relationships, but we support both for compatibility
 * @param {Object} rel - Relationship object
 * @returns {boolean} - True if relationship is a parent-child relationship
 */
export function isParentChildRelationship(rel) {
  return rel.type === 'mother' || rel.type === 'father' || rel.type === 'parentOf'
}

/**
 * Get color based on person's gender
 * @param {Object} person - Person object with gender property
 * @returns {string} - Hex color code
 */
export function getNodeColor(person) {
  if (!person) return '#E0E0E0'

  const gender = (person.gender || '').toLowerCase()
  if (gender === 'male') return '#AED6F1'      // Light blue
  if (gender === 'female') return '#F8BBD0'    // Light pink
  return '#E0E0E0'                              // Gray for unknown/other
}

/**
 * Find all people without parents (roots of the family tree)
 * @param {Array} people - Array of person objects
 * @param {Array} relationships - Array of relationship objects
 * @returns {Array} - Array of root people
 */
export function findRootPeople(people, relationships) {
  return people.filter(person => {
    const hasParent = relationships.some(rel =>
      isParentChildRelationship(rel) && rel.person2Id === person.id
    )
    return !hasParent
  })
}


/**
 * Build descendant tree structure (for TreeView)
 * @param {Object} person - Root person object
 * @param {Array} people - Array of all person objects
 * @param {Array} relationships - Array of relationship objects
 * @returns {Object} - Tree node with person, spouse, and children
 */
export function buildDescendantTree(person, people, relationships) {
  // Get children
  const childRels = relationships.filter(rel =>
    isParentChildRelationship(rel) && rel.person1Id === person.id
  )

  const children = childRels.map(rel => {
    const child = people.find(p => p.id === rel.person2Id)
    return child ? buildDescendantTree(child, people, relationships) : null
  }).filter(Boolean)

  // Find co-parent (spouse or partner who shares children)
  let coParent = null

  if (childRels.length > 0) {
    // Get the first child to check their other parent
    const firstChildId = childRels[0].person2Id

    // Find the other parent of this child
    const otherParentRel = relationships.find(rel =>
      isParentChildRelationship(rel) &&
      rel.person2Id === firstChildId &&
      rel.person1Id !== person.id
    )

    if (otherParentRel) {
      const coParentId = otherParentRel.person1Id

      // Verify this person is co-parent of ALL children
      const isCoParentOfAll = childRels.every(childRel => {
        return relationships.some(rel =>
          isParentChildRelationship(rel) &&
          rel.person1Id === coParentId &&
          rel.person2Id === childRel.person2Id
        )
      })

      if (isCoParentOfAll) {
        coParent = people.find(p => p.id === coParentId)
      }
    }
  }

  // If no co-parent found from children, fall back to spouse relationship
  if (!coParent) {
    const spouseRel = relationships.find(rel =>
      rel.type === 'spouse' && (rel.person1Id === person.id || rel.person2Id === person.id)
    )
    if (spouseRel) {
      const spouseId = spouseRel.person1Id === person.id ? spouseRel.person2Id : spouseRel.person1Id
      coParent = people.find(p => p.id === spouseId)
    }
  }

  return {
    person,
    spouse: coParent,
    children
  }
}

