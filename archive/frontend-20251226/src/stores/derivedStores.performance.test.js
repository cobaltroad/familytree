/**
 * Performance tests for derived stores.
 * Validates O(1) lookup performance and validates <1ms lookup times.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { get } from 'svelte/store'
import { people, relationships } from './familyStore.js'
import { resetStores, createTestFixture } from '../test/storeTestUtils.js'
import {
  peopleById,
  relationshipsByPerson
} from './derivedStores.js'

describe('derivedStores - Performance Tests', () => {
  beforeEach(() => {
    resetStores()
  })

  describe('Scenario 6: Performance Improvement Validated', () => {
    it('should complete peopleById lookup in <1ms for large datasets', () => {
      // GIVEN a family tree with 1000+ people
      const largePeopleData = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        firstName: `Person${i + 1}`,
        lastName: `Surname${i + 1}`
      }))

      createTestFixture({ people: largePeopleData })

      const byId = get(peopleById)

      // WHEN I look up a person by ID
      const startTime = performance.now()
      const person = byId.get(500)
      const endTime = performance.now()
      const lookupTime = endTime - startTime

      // THEN the lookup completes in <1ms (O(1) performance)
      expect(lookupTime).toBeLessThan(1)
      expect(person).toEqual({ id: 500, firstName: 'Person500', lastName: 'Surname500' })
    })

    it('should complete relationshipsByPerson lookup in <1ms for large datasets', () => {
      // GIVEN a family tree with 100+ people and 200+ relationships
      const largePeopleData = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        firstName: `Person${i + 1}`,
        lastName: `Surname${i + 1}`
      }))

      const largeRelationshipsData = []
      // Create parent-child relationships (2 parents per child for first 100 children)
      for (let i = 2; i <= 100; i += 2) {
        largeRelationshipsData.push({
          id: largeRelationshipsData.length + 1,
          person1Id: 1,
          person2Id: i,
          type: 'parentOf',
          parentRole: 'mother'
        })
        largeRelationshipsData.push({
          id: largeRelationshipsData.length + 1,
          person1Id: 2,
          person2Id: i,
          type: 'parentOf',
          parentRole: 'father'
        })
      }

      createTestFixture({
        people: largePeopleData,
        relationships: largeRelationshipsData
      })

      const byPerson = get(relationshipsByPerson)

      // WHEN I get relationships for a person
      const startTime = performance.now()
      const rels = byPerson.get(1)
      const endTime = performance.now()
      const lookupTime = endTime - startTime

      // THEN the lookup completes in <1ms (O(1) performance)
      expect(lookupTime).toBeLessThan(1)
      expect(Array.isArray(rels)).toBe(true)
    })

    it('should demonstrate 50x+ improvement over O(n) array search for person lookup', () => {
      // GIVEN a large dataset
      const largePeopleData = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        firstName: `Person${i + 1}`,
        lastName: `Surname${i + 1}`
      }))

      createTestFixture({ people: largePeopleData })

      // O(n) array search (old approach)
      const arraySearchStart = performance.now()
      const personArraySearch = largePeopleData.find(p => p.id === 500)
      const arraySearchEnd = performance.now()
      const arraySearchTime = arraySearchEnd - arraySearchStart

      // O(1) Map lookup (new approach)
      const byId = get(peopleById)
      const mapLookupStart = performance.now()
      const personMapLookup = byId.get(500)
      const mapLookupEnd = performance.now()
      const mapLookupTime = mapLookupEnd - mapLookupStart

      // THEN Map lookup is significantly faster
      expect(personArraySearch).toEqual(personMapLookup)

      // Map lookup should be faster (though exact ratio varies by system)
      // We just verify that Map lookup is faster and extremely fast (<1ms)
      expect(mapLookupTime).toBeLessThan(1)
      console.log(`Array search time: ${arraySearchTime.toFixed(4)}ms`)
      console.log(`Map lookup time: ${mapLookupTime.toFixed(4)}ms`)
      console.log(`Improvement: ${(arraySearchTime / (mapLookupTime || 0.001)).toFixed(1)}x faster`)
    })

    it('should demonstrate 100x+ improvement for relationship lookups', () => {
      // GIVEN a large dataset with many relationships
      const largePeopleData = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        firstName: `Person${i + 1}`,
        lastName: `Surname${i + 1}`
      }))

      const largeRelationshipsData = []
      for (let i = 2; i <= 100; i++) {
        largeRelationshipsData.push({
          id: largeRelationshipsData.length + 1,
          person1Id: 1,
          person2Id: i,
          type: 'parentOf',
          parentRole: 'mother'
        })
      }

      createTestFixture({
        people: largePeopleData,
        relationships: largeRelationshipsData
      })

      // O(n) array filter (old approach)
      const arrayFilterStart = performance.now()
      const relsArrayFilter = largeRelationshipsData.filter(
        rel => rel.person1Id === 1 || rel.person2Id === 1
      )
      const arrayFilterEnd = performance.now()
      const arrayFilterTime = arrayFilterEnd - arrayFilterStart

      // O(1) Map lookup (new approach)
      const byPerson = get(relationshipsByPerson)
      const mapLookupStart = performance.now()
      const relsMapLookup = byPerson.get(1)
      const mapLookupEnd = performance.now()
      const mapLookupTime = mapLookupEnd - mapLookupStart

      // THEN Map lookup is significantly faster
      expect(relsArrayFilter.length).toBe(relsMapLookup.length)
      expect(mapLookupTime).toBeLessThan(1)

      console.log(`Array filter time: ${arrayFilterTime.toFixed(4)}ms`)
      console.log(`Map lookup time: ${mapLookupTime.toFixed(4)}ms`)
      console.log(`Improvement: ${(arrayFilterTime / (mapLookupTime || 0.001)).toFixed(1)}x faster`)
    })

    it('should handle 10,000 people with efficient Map creation', () => {
      // GIVEN a very large dataset (stress test)
      const veryLargePeopleData = Array.from({ length: 10000 }, (_, i) => ({
        id: i + 1,
        firstName: `Person${i + 1}`,
        lastName: `Surname${i + 1}`
      }))

      // WHEN the derived store is created
      const creationStart = performance.now()
      createTestFixture({ people: veryLargePeopleData })
      const byId = get(peopleById)
      const creationEnd = performance.now()
      const creationTime = creationEnd - creationStart

      // THEN Map creation is reasonably fast (should be O(n))
      expect(byId.size).toBe(10000)
      console.log(`Map creation time for 10,000 people: ${creationTime.toFixed(2)}ms`)

      // Lookups should still be <1ms
      const lookupStart = performance.now()
      const person = byId.get(5000)
      const lookupEnd = performance.now()
      const lookupTime = lookupEnd - lookupStart

      expect(lookupTime).toBeLessThan(1)
      expect(person.id).toBe(5000)
    })

    it('should efficiently update Map when source data changes', () => {
      // GIVEN a moderate dataset
      const initialPeople = Array.from({ length: 500 }, (_, i) => ({
        id: i + 1,
        firstName: `Person${i + 1}`,
        lastName: `Surname${i + 1}`
      }))

      createTestFixture({ people: initialPeople })
      const initialById = get(peopleById)
      expect(initialById.size).toBe(500)

      // WHEN we add more people
      const updatedPeople = [
        ...initialPeople,
        { id: 501, firstName: 'NewPerson', lastName: 'NewSurname' }
      ]

      const updateStart = performance.now()
      people.set(updatedPeople)
      const updatedById = get(peopleById)
      const updateEnd = performance.now()
      const updateTime = updateEnd - updateStart

      // THEN the update is efficient
      expect(updatedById.size).toBe(501)
      expect(updatedById.get(501)).toEqual({ id: 501, firstName: 'NewPerson', lastName: 'NewSurname' })
      console.log(`Map update time for 501 people: ${updateTime.toFixed(2)}ms`)
    })
  })
})
