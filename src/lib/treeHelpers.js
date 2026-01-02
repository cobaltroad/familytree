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
function isParentChildRelationship(rel) {
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
 * Find parents of a person
 * @param {number} personId - ID of the person
 * @param {Array} relationships - Array of relationship objects
 * @param {Array} people - Array of person objects
 * @returns {Object} - Object with mother and father properties
 */
export function findParents(personId, relationships, people) {
  // API returns denormalized format: type="mother" or type="father"
  const motherRel = relationships.find(rel =>
    rel.person2Id === personId &&
    (rel.type === 'mother' || (rel.type === 'parentOf' && rel.parentRole === 'mother'))
  )

  const fatherRel = relationships.find(rel =>
    rel.person2Id === personId &&
    (rel.type === 'father' || (rel.type === 'parentOf' && rel.parentRole === 'father'))
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
    isParentChildRelationship(rel) && rel.person1Id === personId
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
        isParentChildRelationship(rel) && rel.person1Id === personId
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

/**
 * Compute sibling links for force-directed network visualization
 * Siblings are people who share at least one parent
 * Returns bidirectional links for network graph
 *
 * Bug fix: Excludes sibling links when a parent-child relationship exists
 * between the same two people (handles data integrity issues)
 *
 * @param {Array} people - Array of person objects
 * @param {Array} relationships - Array of relationship objects
 * @returns {Array} - Array of sibling link objects {source, target, type}
 */
export function computeSiblingLinks(people, relationships) {
  if (!people || people.length === 0 || !relationships || relationships.length === 0) {
    return []
  }

  const siblingLinks = []
  const processedPairs = new Set()

  // Build a Set of parent-child relationship pairs for O(1) lookup
  // Format: "parentId-childId"
  const parentChildPairs = new Set()
  relationships.forEach(rel => {
    if (isParentChildRelationship(rel)) {
      parentChildPairs.add(`${rel.person1Id}-${rel.person2Id}`)
    }
  })

  // Iterate through all people to find siblings
  for (const person of people) {
    const parents = findParents(person.id, relationships, people)

    // Find all other people who share at least one parent with this person
    for (const otherPerson of people) {
      if (person.id === otherPerson.id) continue

      // Skip if we already processed this pair
      const pairKey1 = `${person.id}-${otherPerson.id}`
      const pairKey2 = `${otherPerson.id}-${person.id}`
      if (processedPairs.has(pairKey1) || processedPairs.has(pairKey2)) continue

      const otherParents = findParents(otherPerson.id, relationships, people)

      // Check if they share at least one parent
      const sharesMother = parents.motherId && parents.motherId === otherParents.motherId
      const sharesFather = parents.fatherId && parents.fatherId === otherParents.fatherId

      if (sharesMother || sharesFather) {
        // Bug fix: Don't create sibling link if they already have a parent-child relationship
        // This handles data integrity issues where someone might be both parent and sibling
        // Check both directions (person1->person2 and person2->person1)
        if (parentChildPairs.has(pairKey1) || parentChildPairs.has(pairKey2)) {
          // Mark as processed so we don't check again
          processedPairs.add(pairKey1)
          processedPairs.add(pairKey2)
          continue
        }

        // Add bidirectional links
        siblingLinks.push({
          source: person.id,
          target: otherPerson.id,
          type: 'sibling'
        })
        siblingLinks.push({
          source: otherPerson.id,
          target: person.id,
          type: 'sibling'
        })

        // Mark this pair as processed
        processedPairs.add(pairKey1)
        processedPairs.add(pairKey2)
      }
    }
  }

  return siblingLinks
}
