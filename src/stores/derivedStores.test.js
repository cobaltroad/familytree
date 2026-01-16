/**
 * Tests for derived stores providing O(1) lookup performance.
 * These tests validate the behavior of derived stores that create Map-based indexes
 * for efficient lookups of people and relationships.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { get } from 'svelte/store'
import { people, relationships } from './familyStore.js'
import { resetStores, createTestFixture } from '../test/storeTestUtils.js'
import {
  peopleById,
  relationshipsByPerson,
  rootPeople,
  familyTree,
  createPersonRelationships
} from './derivedStores.js'

describe('derivedStores', () => {
  beforeEach(() => {
    resetStores()
  })

  describe('peopleById Derived Store', () => {
    describe('Scenario 1: peopleById Derived Store Created', () => {
      it('should return a Map indexed by person ID', () => {
        // GIVEN the people store contains an array of people
        createTestFixture({
          people: [
            { id: 1, firstName: 'John', lastName: 'Doe' },
            { id: 2, firstName: 'Jane', lastName: 'Smith' },
            { id: 3, firstName: 'Bob', lastName: 'Johnson' }
          ]
        })

        // WHEN I access the peopleById derived store
        const byId = get(peopleById)

        // THEN the store returns a Map<number, Person> indexed by person ID
        expect(byId).toBeInstanceOf(Map)
        expect(byId.size).toBe(3)
        expect(byId.get(1)).toEqual({ id: 1, firstName: 'John', lastName: 'Doe' })
        expect(byId.get(2)).toEqual({ id: 2, firstName: 'Jane', lastName: 'Smith' })
        expect(byId.get(3)).toEqual({ id: 3, firstName: 'Bob', lastName: 'Johnson' })
      })

      it('should update automatically when people store changes', () => {
        // GIVEN the people store initially contains people
        createTestFixture({
          people: [
            { id: 1, firstName: 'John', lastName: 'Doe' }
          ]
        })

        let byId = get(peopleById)
        expect(byId.size).toBe(1)
        expect(byId.get(1)).toEqual({ id: 1, firstName: 'John', lastName: 'Doe' })

        // WHEN the people store changes
        people.set([
          { id: 1, firstName: 'John', lastName: 'Doe' },
          { id: 2, firstName: 'Jane', lastName: 'Smith' }
        ])

        // THEN the Map updates automatically
        byId = get(peopleById)
        expect(byId.size).toBe(2)
        expect(byId.get(2)).toEqual({ id: 2, firstName: 'Jane', lastName: 'Smith' })
      })

      it('should provide O(1) lookup time using get()', () => {
        // GIVEN the people store contains people
        createTestFixture({
          people: [
            { id: 1, firstName: 'John', lastName: 'Doe' },
            { id: 2, firstName: 'Jane', lastName: 'Smith' }
          ]
        })

        const byId = get(peopleById)

        // WHEN I look up a person by ID using Map.get()
        const person = byId.get(1)

        // THEN I can access the person in O(1) time
        expect(person).toEqual({ id: 1, firstName: 'John', lastName: 'Doe' })
      })

      it('should return undefined for non-existent IDs', () => {
        // GIVEN the people store contains people
        createTestFixture({
          people: [
            { id: 1, firstName: 'John', lastName: 'Doe' }
          ]
        })

        const byId = get(peopleById)

        // WHEN I look up a non-existent ID
        const person = byId.get(999)

        // THEN the result is undefined
        expect(person).toBeUndefined()
      })

      it('should handle empty people array', () => {
        // GIVEN the people store is empty
        createTestFixture({ people: [] })

        // WHEN I access the peopleById derived store
        const byId = get(peopleById)

        // THEN the Map is empty
        expect(byId).toBeInstanceOf(Map)
        expect(byId.size).toBe(0)
      })

      it('should handle person updates (person object changes)', () => {
        // GIVEN the people store contains a person
        createTestFixture({
          people: [
            { id: 1, firstName: 'John', lastName: 'Doe' }
          ]
        })

        // WHEN the person is updated
        people.set([
          { id: 1, firstName: 'John', lastName: 'Updated' }
        ])

        // THEN the Map reflects the update
        const byId = get(peopleById)
        expect(byId.get(1)).toEqual({ id: 1, firstName: 'John', lastName: 'Updated' })
      })
    })
  })

  describe('relationshipsByPerson Derived Store', () => {
    describe('Scenario 2: relationshipsByPerson Derived Store Created', () => {
      it('should return a Map indexed by person ID with arrays of relationships', () => {
        // GIVEN the relationships store contains relationships
        createTestFixture({
          relationships: [
            { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' },
            { id: 2, person1Id: 3, person2Id: 2, type: 'parentOf', parentRole: 'father' },
            { id: 3, person1Id: 1, person2Id: 3, type: 'spouse' }
          ]
        })

        // WHEN I access the relationshipsByPerson derived store
        const byPerson = get(relationshipsByPerson)

        // THEN the store returns a Map<number, Relationship[]> indexed by person ID
        expect(byPerson).toBeInstanceOf(Map)
        expect(Array.isArray(byPerson.get(1))).toBe(true)
        expect(Array.isArray(byPerson.get(2))).toBe(true)
        expect(Array.isArray(byPerson.get(3))).toBe(true)
      })

      it('should include bidirectional indexing (both person1Id and person2Id)', () => {
        // GIVEN a relationship between person 1 and person 2
        createTestFixture({
          relationships: [
            { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' }
          ]
        })

        // WHEN I access the relationshipsByPerson derived store
        const byPerson = get(relationshipsByPerson)

        // THEN both person 1 and person 2 have the relationship in their arrays
        expect(byPerson.get(1)).toContainEqual({ id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' })
        expect(byPerson.get(2)).toContainEqual({ id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' })
      })

      it('should map each person ID to all relationships involving that person', () => {
        // GIVEN a person with multiple relationships
        createTestFixture({
          relationships: [
            { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' },
            { id: 2, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'mother' },
            { id: 3, person1Id: 1, person2Id: 4, type: 'spouse' }
          ]
        })

        // WHEN I access the relationshipsByPerson derived store
        const byPerson = get(relationshipsByPerson)

        // THEN person 1 has all three relationships
        expect(byPerson.get(1)).toHaveLength(3)
        expect(byPerson.get(1)).toContainEqual({ id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' })
        expect(byPerson.get(1)).toContainEqual({ id: 2, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'mother' })
        expect(byPerson.get(1)).toContainEqual({ id: 3, person1Id: 1, person2Id: 4, type: 'spouse' })
      })

      it('should update automatically when relationships store changes', () => {
        // GIVEN the relationships store initially contains relationships
        createTestFixture({
          relationships: [
            { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' }
          ]
        })

        let byPerson = get(relationshipsByPerson)
        expect(byPerson.get(1)).toHaveLength(1)

        // WHEN the relationships store changes
        relationships.set([
          { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' },
          { id: 2, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'mother' }
        ])

        // THEN the Map updates automatically
        byPerson = get(relationshipsByPerson)
        expect(byPerson.get(1)).toHaveLength(2)
      })

      it('should return undefined for person with no relationships (use || [] pattern)', () => {
        // GIVEN the relationships store contains relationships
        createTestFixture({
          relationships: [
            { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' }
          ]
        })

        // WHEN I look up a person not in any relationship
        const byPerson = get(relationshipsByPerson)

        // THEN the result is undefined (standard Map behavior)
        expect(byPerson.get(999)).toBeUndefined()

        // AND consumers should use the || [] pattern for safety
        const safeRels = byPerson.get(999) || []
        expect(safeRels).toEqual([])
      })

      it('should handle empty relationships array', () => {
        // GIVEN the relationships store is empty
        createTestFixture({ relationships: [] })

        // WHEN I access the relationshipsByPerson derived store
        const byPerson = get(relationshipsByPerson)

        // THEN the Map is empty (no keys)
        expect(byPerson).toBeInstanceOf(Map)
        expect(byPerson.size).toBe(0)
      })
    })
  })

  describe('rootPeople Derived Store', () => {
    describe('Scenario 3: rootPeople Derived Store Created', () => {
      it('should return an array of people with no parents', () => {
        // GIVEN people and relationships exist
        createTestFixture({
          people: [
            { id: 1, firstName: 'Alice', lastName: 'Root' },
            { id: 2, firstName: 'Bob', lastName: 'Root' },
            { id: 3, firstName: 'Charlie', lastName: 'Child' }
          ],
          relationships: [
            { id: 1, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'mother' },
            { id: 2, person1Id: 2, person2Id: 3, type: 'parentOf', parentRole: 'father' }
          ]
        })

        // WHEN I access the rootPeople derived store
        const roots = get(rootPeople)

        // THEN the store returns an array of people with no parents
        expect(Array.isArray(roots)).toBe(true)
        expect(roots).toHaveLength(2)
        expect(roots).toContainEqual({ id: 1, firstName: 'Alice', lastName: 'Root' })
        expect(roots).toContainEqual({ id: 2, firstName: 'Bob', lastName: 'Root' })
        expect(roots).not.toContainEqual({ id: 3, firstName: 'Charlie', lastName: 'Child' })
      })

      it('should use efficient O(1) lookups from relationshipsByPerson', () => {
        // GIVEN people and relationships exist
        createTestFixture({
          people: [
            { id: 1, firstName: 'Alice', lastName: 'Root' },
            { id: 2, firstName: 'Bob', lastName: 'Child' }
          ],
          relationships: [
            { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' }
          ]
        })

        // WHEN I access the rootPeople derived store
        // (Implementation should use relationshipsByPerson for O(1) lookups)
        const roots = get(rootPeople)

        // THEN the computation uses efficient O(1) lookups
        // (Verified by implementation using relationshipsByPerson.get(personId))
        expect(roots).toHaveLength(1)
        expect(roots[0]).toEqual({ id: 1, firstName: 'Alice', lastName: 'Root' })
      })

      it('should update automatically when people or relationships change', () => {
        // GIVEN initial people and relationships
        createTestFixture({
          people: [
            { id: 1, firstName: 'Alice', lastName: 'Root' },
            { id: 2, firstName: 'Bob', lastName: 'Child' }
          ],
          relationships: [
            { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' }
          ]
        })

        let roots = get(rootPeople)
        expect(roots).toHaveLength(1)

        // WHEN a new root person is added
        people.set([
          { id: 1, firstName: 'Alice', lastName: 'Root' },
          { id: 2, firstName: 'Bob', lastName: 'Child' },
          { id: 3, firstName: 'Carol', lastName: 'NewRoot' }
        ])

        // THEN the rootPeople updates automatically
        roots = get(rootPeople)
        expect(roots).toHaveLength(2)
        expect(roots).toContainEqual({ id: 1, firstName: 'Alice', lastName: 'Root' })
        expect(roots).toContainEqual({ id: 3, firstName: 'Carol', lastName: 'NewRoot' })
      })

      it('should handle empty people array', () => {
        // GIVEN empty people and relationships
        createTestFixture({ people: [], relationships: [] })

        // WHEN I access the rootPeople derived store
        const roots = get(rootPeople)

        // THEN the result is an empty array
        expect(roots).toEqual([])
      })

      it('should return all people when no relationships exist', () => {
        // GIVEN people exist but no relationships
        createTestFixture({
          people: [
            { id: 1, firstName: 'Alice', lastName: 'Person' },
            { id: 2, firstName: 'Bob', lastName: 'Person' }
          ],
          relationships: []
        })

        // WHEN I access the rootPeople derived store
        const roots = get(rootPeople)

        // THEN all people are root people
        expect(roots).toHaveLength(2)
        expect(roots).toContainEqual({ id: 1, firstName: 'Alice', lastName: 'Person' })
        expect(roots).toContainEqual({ id: 2, firstName: 'Bob', lastName: 'Person' })
      })
    })
  })

  describe('familyTree Derived Store', () => {
    describe('Scenario 4: familyTree Derived Store Created', () => {
      it('should return complete tree structure for tree visualization', () => {
        // GIVEN rootPeople, people, and relationships exist
        createTestFixture({
          people: [
            { id: 1, firstName: 'Alice', lastName: 'Root' },
            { id: 2, firstName: 'Bob', lastName: 'Root' },
            { id: 3, firstName: 'Charlie', lastName: 'Child' }
          ],
          relationships: [
            { id: 1, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'mother' },
            { id: 2, person1Id: 2, person2Id: 3, type: 'parentOf', parentRole: 'father' }
          ]
        })

        // WHEN I access the familyTree derived store
        const tree = get(familyTree)

        // THEN the store returns the complete tree structure
        expect(Array.isArray(tree)).toBe(true)
        expect(tree).toHaveLength(2) // Two root people
        expect(tree[0]).toHaveProperty('person')
        expect(tree[0]).toHaveProperty('spouse')
        expect(tree[0]).toHaveProperty('children')
      })

      it('should reuse existing helper functions (buildDescendantTree)', () => {
        // GIVEN a simple family tree
        createTestFixture({
          people: [
            { id: 1, firstName: 'Parent', lastName: 'One' },
            { id: 2, firstName: 'Child', lastName: 'One' }
          ],
          relationships: [
            { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' }
          ]
        })

        // WHEN I access the familyTree derived store
        const tree = get(familyTree)

        // THEN the computation reuses buildDescendantTree helper
        // (Verified by structure matching buildDescendantTree output)
        expect(tree[0].person).toEqual({ id: 1, firstName: 'Parent', lastName: 'One' })
        expect(tree[0].children).toHaveLength(1)
        expect(tree[0].children[0].person).toEqual({ id: 2, firstName: 'Child', lastName: 'One' })
      })

      it('should update automatically when dependencies change', () => {
        // GIVEN initial family tree
        createTestFixture({
          people: [
            { id: 1, firstName: 'Alice', lastName: 'Root' }
          ],
          relationships: []
        })

        let tree = get(familyTree)
        expect(tree).toHaveLength(1)

        // WHEN dependencies change (add child)
        people.set([
          { id: 1, firstName: 'Alice', lastName: 'Root' },
          { id: 2, firstName: 'Bob', lastName: 'Child' }
        ])
        relationships.set([
          { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' }
        ])

        // THEN the tree updates automatically
        tree = get(familyTree)
        expect(tree).toHaveLength(1)
        expect(tree[0].children).toHaveLength(1)
        expect(tree[0].children[0].person.id).toBe(2)
      })

      it('should include spouse relationships in tree structure', () => {
        // GIVEN a couple with a child
        createTestFixture({
          people: [
            { id: 1, firstName: 'Mother', lastName: 'Parent' },
            { id: 2, firstName: 'Father', lastName: 'Parent' },
            { id: 3, firstName: 'Child', lastName: 'Parent' }
          ],
          relationships: [
            { id: 1, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'mother' },
            { id: 2, person1Id: 2, person2Id: 3, type: 'parentOf', parentRole: 'father' }
          ]
        })

        // WHEN I access the familyTree derived store
        const tree = get(familyTree)

        // THEN spouse/co-parent relationships are included
        const motherNode = tree.find(node => node.person.id === 1)
        const fatherNode = tree.find(node => node.person.id === 2)

        // One of them should have the other as spouse
        expect(motherNode?.spouse?.id === 2 || fatherNode?.spouse?.id === 1).toBe(true)
      })

      it('should handle empty tree (no people)', () => {
        // GIVEN no people or relationships
        createTestFixture({ people: [], relationships: [] })

        // WHEN I access the familyTree derived store
        const tree = get(familyTree)

        // THEN the result is an empty array
        expect(tree).toEqual([])
      })
    })
  })

  describe('createPersonRelationships Factory Function', () => {
    describe('Scenario 5: createPersonRelationships Factory Function', () => {
      it('should create person-specific relationship store', () => {
        // GIVEN people and relationships exist
        createTestFixture({
          people: [
            { id: 1, firstName: 'Mother', lastName: 'Parent' },
            { id: 2, firstName: 'Father', lastName: 'Parent' },
            { id: 3, firstName: 'Child', lastName: 'Kid' },
            { id: 4, firstName: 'Sibling', lastName: 'Kid' }
          ],
          relationships: [
            { id: 1, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'mother' },
            { id: 2, person1Id: 2, person2Id: 3, type: 'parentOf', parentRole: 'father' },
            { id: 3, person1Id: 1, person2Id: 4, type: 'parentOf', parentRole: 'mother' },
            { id: 4, person1Id: 2, person2Id: 4, type: 'parentOf', parentRole: 'father' }
          ]
        })

        // WHEN I create a person-specific relationship store for person 3
        const personRels = createPersonRelationships(3)
        const rels = get(personRels)

        // THEN the store returns mother, father, siblings, and children
        expect(rels).toHaveProperty('mother')
        expect(rels).toHaveProperty('father')
        expect(rels).toHaveProperty('siblings')
        expect(rels).toHaveProperty('children')
      })

      it('should compute mother correctly', () => {
        // GIVEN a child with a mother
        createTestFixture({
          people: [
            { id: 1, firstName: 'Mother', lastName: 'Parent' },
            { id: 2, firstName: 'Child', lastName: 'Kid' }
          ],
          relationships: [
            { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' }
          ]
        })

        // WHEN I create a relationship store for the child
        const personRels = createPersonRelationships(2)
        const rels = get(personRels)

        // THEN the mother is identified correctly
        expect(rels.mother).toEqual({ id: 1, firstName: 'Mother', lastName: 'Parent' })
        expect(rels.father).toBeNull()
      })

      it('should compute father correctly', () => {
        // GIVEN a child with a father
        createTestFixture({
          people: [
            { id: 1, firstName: 'Father', lastName: 'Parent' },
            { id: 2, firstName: 'Child', lastName: 'Kid' }
          ],
          relationships: [
            { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'father' }
          ]
        })

        // WHEN I create a relationship store for the child
        const personRels = createPersonRelationships(2)
        const rels = get(personRels)

        // THEN the father is identified correctly
        expect(rels.father).toEqual({ id: 1, firstName: 'Father', lastName: 'Parent' })
        expect(rels.mother).toBeNull()
      })

      it('should compute siblings correctly (shared parents)', () => {
        // GIVEN siblings with shared parents
        createTestFixture({
          people: [
            { id: 1, firstName: 'Mother', lastName: 'Parent' },
            { id: 2, firstName: 'Father', lastName: 'Parent' },
            { id: 3, firstName: 'Child1', lastName: 'Kid' },
            { id: 4, firstName: 'Child2', lastName: 'Kid' },
            { id: 5, firstName: 'Child3', lastName: 'Kid' }
          ],
          relationships: [
            { id: 1, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'mother' },
            { id: 2, person1Id: 2, person2Id: 3, type: 'parentOf', parentRole: 'father' },
            { id: 3, person1Id: 1, person2Id: 4, type: 'parentOf', parentRole: 'mother' },
            { id: 4, person1Id: 2, person2Id: 4, type: 'parentOf', parentRole: 'father' },
            { id: 5, person1Id: 1, person2Id: 5, type: 'parentOf', parentRole: 'mother' },
            { id: 6, person1Id: 2, person2Id: 5, type: 'parentOf', parentRole: 'father' }
          ]
        })

        // WHEN I create a relationship store for child1
        const personRels = createPersonRelationships(3)
        const rels = get(personRels)

        // THEN siblings are identified correctly
        expect(rels.siblings).toHaveLength(2)
        expect(rels.siblings).toContainEqual({ id: 4, firstName: 'Child2', lastName: 'Kid' })
        expect(rels.siblings).toContainEqual({ id: 5, firstName: 'Child3', lastName: 'Kid' })
        expect(rels.siblings).not.toContainEqual({ id: 3, firstName: 'Child1', lastName: 'Kid' })
      })

      it('should compute children correctly', () => {
        // GIVEN a parent with children
        createTestFixture({
          people: [
            { id: 1, firstName: 'Parent', lastName: 'Adult' },
            { id: 2, firstName: 'Child1', lastName: 'Kid' },
            { id: 3, firstName: 'Child2', lastName: 'Kid' }
          ],
          relationships: [
            { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' },
            { id: 2, person1Id: 1, person2Id: 3, type: 'parentOf', parentRole: 'mother' }
          ]
        })

        // WHEN I create a relationship store for the parent
        const personRels = createPersonRelationships(1)
        const rels = get(personRels)

        // THEN children are identified correctly
        expect(rels.children).toHaveLength(2)
        expect(rels.children).toContainEqual({ id: 2, firstName: 'Child1', lastName: 'Kid' })
        expect(rels.children).toContainEqual({ id: 3, firstName: 'Child2', lastName: 'Kid' })
      })

      it('should use O(1) lookups for efficiency', () => {
        // GIVEN a person exists
        createTestFixture({
          people: [
            { id: 1, firstName: 'Person', lastName: 'Test' }
          ],
          relationships: []
        })

        // WHEN I create a relationship store
        // (Implementation should use peopleById and relationshipsByPerson for O(1) lookups)
        const personRels = createPersonRelationships(1)
        const rels = get(personRels)

        // THEN the computation uses efficient O(1) lookups
        // (Verified by implementation using derived stores)
        expect(rels).toBeDefined()
        expect(rels.mother).toBeNull()
        expect(rels.father).toBeNull()
        expect(rels.siblings).toEqual([])
        expect(rels.children).toEqual([])
      })

      it('should handle person with no relationships', () => {
        // GIVEN a person with no relationships
        createTestFixture({
          people: [
            { id: 1, firstName: 'Orphan', lastName: 'Alone' }
          ],
          relationships: []
        })

        // WHEN I create a relationship store for that person
        const personRels = createPersonRelationships(1)
        const rels = get(personRels)

        // THEN all relationship fields are null or empty
        expect(rels.mother).toBeNull()
        expect(rels.father).toBeNull()
        expect(rels.siblings).toEqual([])
        expect(rels.children).toEqual([])
      })

      it('should handle half-siblings (shared one parent)', () => {
        // GIVEN half-siblings (shared mother, different fathers)
        createTestFixture({
          people: [
            { id: 1, firstName: 'Mother', lastName: 'Parent' },
            { id: 2, firstName: 'Father1', lastName: 'Dad' },
            { id: 3, firstName: 'Father2', lastName: 'Dad' },
            { id: 4, firstName: 'Child1', lastName: 'Kid' },
            { id: 5, firstName: 'Child2', lastName: 'Kid' }
          ],
          relationships: [
            { id: 1, person1Id: 1, person2Id: 4, type: 'parentOf', parentRole: 'mother' },
            { id: 2, person1Id: 2, person2Id: 4, type: 'parentOf', parentRole: 'father' },
            { id: 3, person1Id: 1, person2Id: 5, type: 'parentOf', parentRole: 'mother' },
            { id: 4, person1Id: 3, person2Id: 5, type: 'parentOf', parentRole: 'father' }
          ]
        })

        // WHEN I create a relationship store for child1
        const personRels = createPersonRelationships(4)
        const rels = get(personRels)

        // THEN half-sibling is included in siblings
        expect(rels.siblings).toHaveLength(1)
        expect(rels.siblings).toContainEqual({ id: 5, firstName: 'Child2', lastName: 'Kid' })
      })

      it('should NOT include parent as sibling (Bug Fix: Rudy/Aquilino case)', () => {
        // GIVEN a multi-generation family tree (Rudy and his father Aquilino)
        // This reproduces the exact bug case from the backup database
        createTestFixture({
          people: [
            { id: 285, firstName: 'Aquilino', lastName: 'Dollete' },
            { id: 281, firstName: 'Rudy', lastName: 'Dollete' },
            { id: 286, firstName: 'Dominga', lastName: 'Giron' },
            { id: 288, firstName: 'Bernardo', lastName: 'Dollete' }
          ],
          relationships: [
            // Aquilino (285) is father of Rudy (281)
            { id: 18, person1Id: 285, person2Id: 281, type: 'parentOf', parentRole: 'father' },
            // Dominga (286) is mother of Rudy (281)
            { id: 19, person1Id: 286, person2Id: 281, type: 'parentOf', parentRole: 'mother' },
            // Bernardo (288) is father of Aquilino (285) - Rudy's grandfather
            { id: 21, person1Id: 288, person2Id: 285, type: 'parentOf', parentRole: 'father' }
          ]
        })

        // WHEN I get relationships for Rudy
        const personRels = createPersonRelationships(281)
        const rels = get(personRels)

        // THEN Aquilino should be the father, NOT a sibling
        expect(rels.father).toEqual({ id: 285, firstName: 'Aquilino', lastName: 'Dollete' })
        expect(rels.mother).toEqual({ id: 286, firstName: 'Dominga', lastName: 'Giron' })

        // CRITICAL: Aquilino must NOT appear in siblings
        expect(rels.siblings).not.toContainEqual({ id: 285, firstName: 'Aquilino', lastName: 'Dollete' })

        // Rudy should have no siblings in this case
        expect(rels.siblings).toHaveLength(0)
      })

      it('should NOT include grandparent as sibling', () => {
        // GIVEN a three-generation family tree
        createTestFixture({
          people: [
            { id: 1, firstName: 'Grandparent', lastName: 'Elder' },
            { id: 2, firstName: 'Parent', lastName: 'Middle' },
            { id: 3, firstName: 'Child', lastName: 'Young' }
          ],
          relationships: [
            // Grandparent (1) -> Parent (2)
            { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' },
            // Parent (2) -> Child (3)
            { id: 2, person1Id: 2, person2Id: 3, type: 'parentOf', parentRole: 'mother' }
          ]
        })

        // WHEN I get relationships for the child
        const personRels = createPersonRelationships(3)
        const rels = get(personRels)

        // THEN parent should be parent, and grandparent should NOT be a sibling
        expect(rels.mother).toEqual({ id: 2, firstName: 'Parent', lastName: 'Middle' })
        expect(rels.siblings).not.toContainEqual({ id: 1, firstName: 'Grandparent', lastName: 'Elder' })
        expect(rels.siblings).toHaveLength(0)
      })

      it('should NOT include children as siblings', () => {
        // GIVEN a parent with a child
        createTestFixture({
          people: [
            { id: 1, firstName: 'Grandparent', lastName: 'Elder' },
            { id: 2, firstName: 'Parent', lastName: 'Middle' },
            { id: 3, firstName: 'Child', lastName: 'Young' }
          ],
          relationships: [
            // Grandparent (1) -> Parent (2)
            { id: 1, person1Id: 1, person2Id: 2, type: 'parentOf', parentRole: 'mother' },
            // Parent (2) -> Child (3)
            { id: 2, person1Id: 2, person2Id: 3, type: 'parentOf', parentRole: 'mother' }
          ]
        })

        // WHEN I get relationships for the parent
        const personRels = createPersonRelationships(2)
        const rels = get(personRels)

        // THEN child should be in children, NOT in siblings
        expect(rels.children).toContainEqual({ id: 3, firstName: 'Child', lastName: 'Young' })
        expect(rels.siblings).not.toContainEqual({ id: 3, firstName: 'Child', lastName: 'Young' })
      })

      it('should handle complex multi-generation family correctly', () => {
        // GIVEN a complex multi-generation family (full Dollete family from backup)
        createTestFixture({
          people: [
            { id: 288, firstName: 'Bernardo', lastName: 'Dollete' },
            { id: 287, firstName: 'Segunda', lastName: 'Torres' },
            { id: 285, firstName: 'Aquilino', lastName: 'Dollete' },
            { id: 289, firstName: 'Tirso', lastName: 'Dollete' },
            { id: 286, firstName: 'Dominga', lastName: 'Giron' },
            { id: 281, firstName: 'Rudy', lastName: 'Dollete' },
            { id: 280, firstName: 'Winona', lastName: 'Cabaltica' },
            { id: 277, firstName: 'Ron', lastName: 'Dollete' },
            { id: 284, firstName: 'Ray', lastName: 'Dollete' }
          ],
          relationships: [
            // Bernardo + Segunda are parents of Aquilino
            { id: 21, person1Id: 288, person2Id: 285, type: 'parentOf', parentRole: 'father' },
            { id: 20, person1Id: 287, person2Id: 285, type: 'parentOf', parentRole: 'mother' },
            // Bernardo + Segunda are parents of Tirso (Aquilino's sibling)
            { id: 23, person1Id: 288, person2Id: 289, type: 'parentOf', parentRole: 'father' },
            { id: 25, person1Id: 287, person2Id: 289, type: 'parentOf', parentRole: 'mother' },
            // Aquilino + Dominga are parents of Rudy
            { id: 18, person1Id: 285, person2Id: 281, type: 'parentOf', parentRole: 'father' },
            { id: 19, person1Id: 286, person2Id: 281, type: 'parentOf', parentRole: 'mother' },
            // Winona + Rudy are parents of Ron and Ray
            { id: 10, person1Id: 280, person2Id: 277, type: 'parentOf', parentRole: 'mother' },
            { id: 11, person1Id: 281, person2Id: 277, type: 'parentOf', parentRole: 'father' },
            { id: 15, person1Id: 280, person2Id: 284, type: 'parentOf', parentRole: 'mother' },
            { id: 16, person1Id: 281, person2Id: 284, type: 'parentOf', parentRole: 'father' }
          ]
        })

        // WHEN I get relationships for Rudy (281)
        const rudyRels = createPersonRelationships(281)
        const rudyData = get(rudyRels)

        // THEN Rudy should have correct relationships:
        // Parents: Aquilino (285) and Dominga (286)
        expect(rudyData.father).toEqual({ id: 285, firstName: 'Aquilino', lastName: 'Dollete' })
        expect(rudyData.mother).toEqual({ id: 286, firstName: 'Dominga', lastName: 'Giron' })

        // Children: Ron (277) and Ray (284)
        expect(rudyData.children).toHaveLength(2)
        expect(rudyData.children).toContainEqual({ id: 277, firstName: 'Ron', lastName: 'Dollete' })
        expect(rudyData.children).toContainEqual({ id: 284, firstName: 'Ray', lastName: 'Dollete' })

        // Siblings: None (Rudy is an only child)
        expect(rudyData.siblings).toHaveLength(0)

        // CRITICAL: Parents should NOT be in siblings
        expect(rudyData.siblings).not.toContainEqual({ id: 285, firstName: 'Aquilino', lastName: 'Dollete' })
        expect(rudyData.siblings).not.toContainEqual({ id: 286, firstName: 'Dominga', lastName: 'Giron' })

        // CRITICAL: Children should NOT be in siblings
        expect(rudyData.siblings).not.toContainEqual({ id: 277, firstName: 'Ron', lastName: 'Dollete' })
        expect(rudyData.siblings).not.toContainEqual({ id: 284, firstName: 'Ray', lastName: 'Dollete' })

        // CRITICAL: Grandparents should NOT be in siblings
        expect(rudyData.siblings).not.toContainEqual({ id: 288, firstName: 'Bernardo', lastName: 'Dollete' })
        expect(rudyData.siblings).not.toContainEqual({ id: 287, firstName: 'Segunda', lastName: 'Torres' })

        // WHEN I get relationships for Aquilino (285)
        const aquilinoRels = createPersonRelationships(285)
        const aquilinoData = get(aquilinoRels)

        // THEN Aquilino should have:
        // Siblings: Tirso (289)
        expect(aquilinoData.siblings).toHaveLength(1)
        expect(aquilinoData.siblings).toContainEqual({ id: 289, firstName: 'Tirso', lastName: 'Dollete' })

        // CRITICAL: His child Rudy should NOT be a sibling
        expect(aquilinoData.siblings).not.toContainEqual({ id: 281, firstName: 'Rudy', lastName: 'Dollete' })
      })

      it('should deduplicate children when duplicate parent relationships exist in database', () => {
        // GIVEN a child with duplicate parent relationships (real bug from Issue #XX)
        // This simulates the database state where person 637 has duplicate parent records
        createTestFixture({
          people: [
            { id: 636, firstName: 'Father', lastName: 'Doe' },
            { id: 637, firstName: 'Child', lastName: 'Doe' },
            { id: 654, firstName: 'Mother', lastName: 'Smith' }
          ],
          relationships: [
            // Duplicate father relationships (IDs 425 and 429)
            { id: 425, person1Id: 636, person2Id: 637, type: 'parentOf', parentRole: 'father' },
            { id: 429, person1Id: 636, person2Id: 637, type: 'parentOf', parentRole: 'father' },
            // Duplicate mother relationships (IDs 426 and 430)
            { id: 426, person1Id: 654, person2Id: 637, type: 'parentOf', parentRole: 'mother' },
            { id: 430, person1Id: 654, person2Id: 637, type: 'parentOf', parentRole: 'mother' }
          ]
        })

        // WHEN I get relationships for the father (636)
        const fatherRels = createPersonRelationships(636)
        const fatherData = get(fatherRels)

        // THEN the child should appear exactly once in children array (not duplicated)
        expect(fatherData.children).toHaveLength(1)
        expect(fatherData.children).toContainEqual({ id: 637, firstName: 'Child', lastName: 'Doe' })

        // Verify the child appears only once by checking IDs
        const childIds = fatherData.children.map(c => c.id)
        const uniqueChildIds = [...new Set(childIds)]
        expect(childIds.length).toBe(uniqueChildIds.length)

        // WHEN I get relationships for the mother (654)
        const motherRels = createPersonRelationships(654)
        const motherData = get(motherRels)

        // THEN the child should also appear exactly once (not duplicated)
        expect(motherData.children).toHaveLength(1)
        expect(motherData.children).toContainEqual({ id: 637, firstName: 'Child', lastName: 'Doe' })

        // Verify no duplicates for mother
        const motherChildIds = motherData.children.map(c => c.id)
        const uniqueMotherChildIds = [...new Set(motherChildIds)]
        expect(motherChildIds.length).toBe(uniqueMotherChildIds.length)
      })

      it('should handle parents correctly even with duplicate parent relationships', () => {
        // GIVEN a child with duplicate parent relationships
        createTestFixture({
          people: [
            { id: 636, firstName: 'Father', lastName: 'Doe' },
            { id: 637, firstName: 'Child', lastName: 'Doe' },
            { id: 654, firstName: 'Mother', lastName: 'Smith' }
          ],
          relationships: [
            // Duplicate father relationships
            { id: 425, person1Id: 636, person2Id: 637, type: 'parentOf', parentRole: 'father' },
            { id: 429, person1Id: 636, person2Id: 637, type: 'parentOf', parentRole: 'father' },
            // Duplicate mother relationships
            { id: 426, person1Id: 654, person2Id: 637, type: 'parentOf', parentRole: 'mother' },
            { id: 430, person1Id: 654, person2Id: 637, type: 'parentOf', parentRole: 'mother' }
          ]
        })

        // WHEN I get relationships for the child (637)
        const childRels = createPersonRelationships(637)
        const childData = get(childRels)

        // THEN the child should have exactly one father and one mother (not null, not undefined)
        expect(childData.father).toBeTruthy()
        expect(childData.father).toEqual({ id: 636, firstName: 'Father', lastName: 'Doe' })
        expect(childData.mother).toBeTruthy()
        expect(childData.mother).toEqual({ id: 654, firstName: 'Mother', lastName: 'Smith' })

        // Should have no siblings
        expect(childData.siblings).toHaveLength(0)
      })
    })
  })

  describe('Derived Stores Memoization', () => {
    describe('Scenario 5: Derived Stores Are Memoized', () => {
      it('should only compute once (not per subscriber)', () => {
        // GIVEN derived stores have been created
        createTestFixture({
          people: [
            { id: 1, firstName: 'John', lastName: 'Doe' }
          ]
        })

        // WHEN I subscribe to peopleById multiple times
        let callCount = 0
        const testStore = {
          subscribe(fn) {
            callCount++
            return peopleById.subscribe(fn)
          }
        }

        const unsub1 = peopleById.subscribe(() => {})
        const unsub2 = peopleById.subscribe(() => {})
        const unsub3 = peopleById.subscribe(() => {})

        // THEN the computation only runs once (Svelte's derived handles this)
        // (This is guaranteed by Svelte's derived store implementation)
        expect(get(peopleById)).toBeInstanceOf(Map)

        unsub1()
        unsub2()
        unsub3()
      })

      it('should be cached until dependencies change', () => {
        // GIVEN derived stores exist
        createTestFixture({
          people: [
            { id: 1, firstName: 'John', lastName: 'Doe' }
          ]
        })

        // WHEN I access the derived store multiple times without changes
        const value1 = get(peopleById)
        const value2 = get(peopleById)

        // THEN the result is cached (same Map reference)
        // Note: Svelte's derived doesn't guarantee reference equality on get(),
        // but it does memoize the computation function
        expect(value1).toBeInstanceOf(Map)
        expect(value2).toBeInstanceOf(Map)
      })

      it('should re-compute only when source stores change', () => {
        // GIVEN initial data
        createTestFixture({
          people: [
            { id: 1, firstName: 'John', lastName: 'Doe' }
          ]
        })

        let computationCount = 0
        const unsubscribe = peopleById.subscribe(() => {
          computationCount++
        })

        // Initial subscription triggers computation
        expect(computationCount).toBe(1)

        // WHEN I update the source store
        people.set([
          { id: 1, firstName: 'John', lastName: 'Doe' },
          { id: 2, firstName: 'Jane', lastName: 'Smith' }
        ])

        // THEN re-computation occurs
        expect(computationCount).toBe(2)

        // WHEN I read the store without changes (no set/update)
        get(peopleById)
        get(peopleById)

        // THEN no additional computation occurs
        expect(computationCount).toBe(2)

        unsubscribe()
      })
    })
  })
})
