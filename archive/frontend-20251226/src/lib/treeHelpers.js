/**
 * Tree Helper Functions
 * Shared utilities for building and manipulating family tree data structures
 */

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
      rel.type === 'parentOf' && rel.person2Id === person.id
    )
    return !hasParent
  })
}

/**
 * Find parents of a person
 * @param {number} personId - ID of the person
 * @param {Array} relationships - Array of relationship objects
 * @param {Array} people - Array of person objects
 * @returns {Object} - Object with mother and father properties
 */
export function findParents(personId, relationships, people) {
  const motherRel = relationships.find(rel =>
    rel.type === 'parentOf' &&
    rel.person2Id === personId &&
    rel.parentRole === 'mother'
  )

  const fatherRel = relationships.find(rel =>
    rel.type === 'parentOf' &&
    rel.person2Id === personId &&
    rel.parentRole === 'father'
  )

  return {
    mother: motherRel ? people.find(p => p.id === motherRel.person1Id) : null,
    father: fatherRel ? people.find(p => p.id === fatherRel.person1Id) : null,
    motherId: motherRel?.person1Id,
    fatherId: fatherRel?.person1Id
  }
}

/**
 * Find children of a person
 * @param {number} personId - ID of the person
 * @param {Array} relationships - Array of relationship objects
 * @param {Array} people - Array of person objects
 * @returns {Array} - Array of child person objects
 */
export function findChildren(personId, relationships, people) {
  const childRels = relationships.filter(rel =>
    rel.type === 'parentOf' && rel.person1Id === personId
  )

  return childRels
    .map(rel => people.find(p => p.id === rel.person2Id))
    .filter(Boolean)
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
    rel.type === 'parentOf' && rel.person1Id === person.id
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
      rel.type === 'parentOf' &&
      rel.person2Id === firstChildId &&
      rel.person1Id !== person.id
    )

    if (otherParentRel) {
      const coParentId = otherParentRel.person1Id

      // Verify this person is co-parent of ALL children
      const isCoParentOfAll = childRels.every(childRel => {
        return relationships.some(rel =>
          rel.type === 'parentOf' &&
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

/**
 * Build ancestor tree structure (for RadialView and PedigreeView)
 * @param {Object} person - Focus person object
 * @param {Array} people - Array of all person objects
 * @param {Array} relationships - Array of relationship objects
 * @param {number} maxDepth - Maximum depth to traverse (default 5)
 * @returns {Object} - Tree node with person and ancestors as children
 */
export function buildAncestorTree(person, people, relationships, maxDepth = 5) {
  if (!person || maxDepth === 0) {
    return person ? { person, children: [] } : null
  }

  const parents = findParents(person.id, relationships, people)
  const ancestors = []

  if (parents.mother) {
    const motherTree = buildAncestorTree(parents.mother, people, relationships, maxDepth - 1)
    if (motherTree) ancestors.push(motherTree)
  }

  if (parents.father) {
    const fatherTree = buildAncestorTree(parents.father, people, relationships, maxDepth - 1)
    if (fatherTree) ancestors.push(fatherTree)
  }

  return {
    person,
    children: ancestors
  }
}

/**
 * Assign generation numbers to all people in the tree
 * @param {Array} people - Array of person objects
 * @param {Array} relationships - Array of relationship objects
 * @returns {Array} - Array of people with generation property added
 */
export function assignGenerations(people, relationships) {
  const generations = new Map()
  const roots = findRootPeople(people, relationships)

  function traverse(personId, generation) {
    if (!generations.has(personId) || generations.get(personId) > generation) {
      generations.set(personId, generation)

      const childRels = relationships.filter(rel =>
        rel.type === 'parentOf' && rel.person1Id === personId
      )

      childRels.forEach(rel => traverse(rel.person2Id, generation + 1))
    }
  }

  // Start from each root at generation 0
  roots.forEach(root => traverse(root.id, 0))

  // Add generation property to each person
  return people.map(person => ({
    ...person,
    generation: generations.get(person.id) ?? -1
  }))
}

/**
 * Format lifespan as "YYYY-YYYY" or "YYYY-present"
 * @param {string} birthDate - ISO date string
 * @param {string} deathDate - ISO date string or null
 * @returns {string} - Formatted lifespan string
 */
export function formatLifespan(birthDate, deathDate) {
  const birth = birthDate ? new Date(birthDate).getFullYear() : '?'
  const death = deathDate ? new Date(deathDate).getFullYear() : 'present'
  return `${birth}–${death}`
}

/**
 * Calculate age from birth and death dates
 * @param {string} birthDate - ISO date string
 * @param {string} deathDate - ISO date string or null (uses current date if null)
 * @returns {number|null} - Age in years or null if no birth date
 */
export function calculateAge(birthDate, deathDate) {
  if (!birthDate) return null

  const birth = new Date(birthDate)
  const end = deathDate ? new Date(deathDate) : new Date()

  return Math.floor((end - birth) / (365.25 * 24 * 60 * 60 * 1000))
}

/**
 * Find spouse of a person
 * @param {number} personId - ID of the person
 * @param {Array} relationships - Array of relationship objects
 * @param {Array} people - Array of person objects
 * @returns {Object|null} - Spouse person object or null
 */
export function findSpouse(personId, relationships, people) {
  const spouseRel = relationships.find(rel =>
    rel.type === 'spouse' && (rel.person1Id === personId || rel.person2Id === personId)
  )

  if (!spouseRel) return null

  const spouseId = spouseRel.person1Id === personId ? spouseRel.person2Id : spouseRel.person1Id
  return people.find(p => p.id === spouseId) || null
}
