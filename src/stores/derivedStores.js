/**
 * Derived stores for O(1) lookup performance.
 * These stores create Map-based indexes that update automatically when source data changes,
 * eliminating redundant O(n) array searches and providing efficient lookups.
 *
 * @module derivedStores
 */

import { derived } from 'svelte/store'
import { people, relationships } from './familyStore.js'
import { buildDescendantTree } from '../lib/treeHelpers.js'

/**
 * @typedef {Object} Person
 * @property {number} id - Unique identifier for the person
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {string|null} birthDate - Birth date in YYYY-MM-DD format
 * @property {string|null} deathDate - Death date in YYYY-MM-DD format
 * @property {string|null} gender - Gender (female, male, other, or null for unspecified)
 */

/**
 * @typedef {Object} Relationship
 * @property {number} id - Unique identifier for the relationship
 * @property {number} person1Id - ID of the first person in the relationship
 * @property {number} person2Id - ID of the second person in the relationship
 * @property {string} type - Type of relationship (parentOf, spouse)
 * @property {string|null} parentRole - Role in parent relationship (mother, father)
 */

/**
 * @typedef {Object} PersonRelationships
 * @property {Person|null} mother - Mother of the person (null if not found)
 * @property {Person|null} father - Father of the person (null if not found)
 * @property {Person[]} siblings - Array of siblings (people who share at least one parent)
 * @property {Person[]} children - Array of children
 * @property {Person[]} spouses - Array of spouses
 */

/**
 * Derived store providing O(1) person lookups by ID.
 * Creates a Map indexed by person ID for efficient lookups.
 *
 * @type {import('svelte/store').Readable<Map<number, Person>>}
 *
 * @example
 * import { peopleById } from './stores/derivedStores.js'
 *
 * const byId = $peopleById
 * const person = byId.get(42) // O(1) lookup
 */
export const peopleById = derived(people, ($people) => {
  const map = new Map()
  $people.forEach(person => {
    map.set(person.id, person)
  })
  return map
})

/**
 * Derived store providing O(1) relationship lookups by person ID.
 * Creates a Map where each person ID maps to all relationships involving that person.
 * Includes bidirectional indexing (both person1Id and person2Id).
 *
 * @type {import('svelte/store').Readable<Map<number, Relationship[]>>}
 *
 * @example
 * import { relationshipsByPerson } from './stores/derivedStores.js'
 *
 * const byPerson = $relationshipsByPerson
 * const personRels = byPerson.get(42) // O(1) lookup - returns array of relationships
 */
export const relationshipsByPerson = derived(relationships, ($relationships) => {
  const map = new Map()

  $relationships.forEach(rel => {
    // Add relationship to person1's array
    if (!map.has(rel.person1Id)) {
      map.set(rel.person1Id, [])
    }
    map.get(rel.person1Id).push(rel)

    // Add relationship to person2's array (bidirectional indexing)
    if (!map.has(rel.person2Id)) {
      map.set(rel.person2Id, [])
    }
    map.get(rel.person2Id).push(rel)
  })

  return map
})

/**
 * Derived store that returns people with no parents (root people).
 * Uses efficient O(1) lookups from relationshipsByPerson.
 *
 * @type {import('svelte/store').Readable<Person[]>}
 *
 * @example
 * import { rootPeople } from './stores/derivedStores.js'
 *
 * const roots = $rootPeople // Array of people with no parents
 */
export const rootPeople = derived(
  [people, relationshipsByPerson],
  ([$people, $relationshipsByPerson]) => {
    return $people.filter(person => {
      const rels = $relationshipsByPerson.get(person.id) || []
      // Check if any relationship shows this person as a child (person2Id with parent type)
      // Note: API returns denormalized format with type="mother" or type="father"
      const hasParent = rels.some(rel => {
        const isParentRelationship = rel.type === 'mother' || rel.type === 'father' || rel.type === 'parentOf'
        return isParentRelationship && rel.person2Id === person.id
      })
      return !hasParent
    })
  }
)

/**
 * Derived store that returns the complete family tree structure.
 * Builds tree structure for all root people using buildDescendantTree helper.
 *
 * @type {import('svelte/store').Readable<Array<{person: Person, spouse: Person|null, children: Array}>>}
 *
 * @example
 * import { familyTree } from './stores/derivedStores.js'
 *
 * const tree = $familyTree // Array of tree nodes for each root person
 */
export const familyTree = derived(
  [rootPeople, people, relationships],
  ([$rootPeople, $people, $relationships]) => {
    return $rootPeople.map(rootPerson =>
      buildDescendantTree(rootPerson, $people, $relationships)
    )
  }
)

/**
 * Factory function that creates a derived store for a specific person's relationships.
 * Returns a store that provides mother, father, siblings, children, and spouses for the given person.
 * Uses O(1) lookups from peopleById and relationshipsByPerson for efficiency.
 *
 * @param {number} personId - ID of the person to get relationships for
 * @returns {import('svelte/store').Readable<PersonRelationships>} Store containing person's relationships
 *
 * @example
 * import { createPersonRelationships } from './stores/derivedStores.js'
 *
 * const personRels = createPersonRelationships(42)
 * const { mother, father, siblings, children, spouses } = $personRels
 */
export function createPersonRelationships(personId) {
  return derived(
    [peopleById, relationshipsByPerson],
    ([$peopleById, $relationshipsByPerson]) => {
      const rels = $relationshipsByPerson.get(personId) || []

      // Find mother and father
      // Note: API returns denormalized relationships with type="mother" or type="father"
      // (not type="parentOf"), so we need to check for both formats
      let mother = null
      let father = null

      rels.forEach(rel => {
        // Check if this person is the child (person2Id)
        if (rel.person2Id === personId) {
          // API returns denormalized format: type="mother" or type="father"
          if (rel.type === 'mother' || (rel.type === 'parentOf' && rel.parentRole === 'mother')) {
            mother = $peopleById.get(rel.person1Id) || null
          } else if (rel.type === 'father' || (rel.type === 'parentOf' && rel.parentRole === 'father')) {
            father = $peopleById.get(rel.person1Id) || null
          }
        }
      })

      // Find siblings (people who share at least one parent)
      //
      // Definition: A sibling is someone who shares at least one parent with personId
      //
      // CRITICAL BUG FIX: We must ONLY look at relationships where the parent is in the
      // person1Id position (parent role), NOT where they are in person2Id position (child role).
      //
      // Why this matters:
      // - relationshipsByPerson returns ALL relationships involving a person (bidirectional index)
      // - If we naively look for any rel where person2Id !== personId, we would incorrectly include:
      //   1. The parent's own parents (grandparents) as siblings
      //   2. The parent's own children (the person's siblings) - this would be correct but duplicated
      //
      // Example bug case (Rudy/Aquilino from backup data):
      // - Rudy (281) has father Aquilino (285)
      // - Aquilino (285) has father Bernardo (288)
      // - When finding Rudy's siblings, we get fatherRels (all relationships involving Aquilino)
      // - fatherRels includes: rel(285→281, Aquilino→Rudy) AND rel(288→285, Bernardo→Aquilino)
      // - Without the fix, we'd see rel(288→285) where person2Id=285 (Aquilino) !== 281 (Rudy)
      //   and incorrectly add Aquilino as Rudy's sibling!
      //
      // The fix: Only consider relationships where parent is person1Id (parent role)
      const siblings = []
      const siblingIds = new Set()

      const motherId = mother?.id
      const fatherId = father?.id

      if (motherId || fatherId) {
        // Get all relationships involving the parents (bidirectional index)
        const motherRels = motherId ? ($relationshipsByPerson.get(motherId) || []) : []
        const fatherRels = fatherId ? ($relationshipsByPerson.get(fatherId) || []) : []

        // Combine parent relationships
        const parentRels = [...motherRels, ...fatherRels]

        // Find all children of these parents (these are the person's siblings)
        // Note: API returns denormalized format with type="mother" or type="father"
        parentRels.forEach(rel => {
          const isParentRelationship = rel.type === 'mother' || rel.type === 'father' || rel.type === 'parentOf'

          // CRITICAL: Ensure the parent is in the person1Id position (parent role)
          // This prevents grandparents from being incorrectly identified as siblings
          const isParentInParentRole = rel.person1Id === motherId || rel.person1Id === fatherId

          if (isParentRelationship && isParentInParentRole && rel.person2Id !== personId) {
            // This is a sibling (another child of the same parent)
            if (!siblingIds.has(rel.person2Id)) {
              siblingIds.add(rel.person2Id)
              const sibling = $peopleById.get(rel.person2Id)
              if (sibling) {
                siblings.push(sibling)
              }
            }
          }
        })
      }

      // Find children
      // Note: API returns denormalized format with type="mother" or type="father"
      // CRITICAL: Deduplicate children in case duplicate parent relationships exist in database
      const children = []
      const childIds = new Set()
      rels.forEach(rel => {
        // Check if this person is the parent (person1Id)
        if (rel.person1Id === personId) {
          // Accept both denormalized (type="mother"/"father") and normalized (type="parentOf") formats
          const isParentRelationship = rel.type === 'mother' || rel.type === 'father' || rel.type === 'parentOf'
          if (isParentRelationship) {
            // Only add each child once (deduplication)
            if (!childIds.has(rel.person2Id)) {
              childIds.add(rel.person2Id)
              const child = $peopleById.get(rel.person2Id)
              if (child) {
                children.push(child)
              }
            }
          }
        }
      })

      // Find spouses
      // Note: Spouse relationships are bidirectional, so we need to deduplicate
      const spouseIds = new Set()
      const spouses = []
      rels.forEach(rel => {
        if (rel.type === 'spouse') {
          // Determine which person is the spouse (the one that's not personId)
          const spouseId = rel.person1Id === personId ? rel.person2Id : rel.person1Id
          // Only add each spouse once (deduplication)
          if (!spouseIds.has(spouseId)) {
            spouseIds.add(spouseId)
            const spouse = $peopleById.get(spouseId)
            if (spouse) {
              spouses.push(spouse)
            }
          }
        }
      })

      return {
        mother,
        father,
        siblings,
        children,
        spouses
      }
    }
  )
}
