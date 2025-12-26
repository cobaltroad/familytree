import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { db } from './client.js'
import { people, relationships } from './schema.js'
import { eq } from 'drizzle-orm'

describe('Database Client', () => {
  test('should have db client defined', () => {
    expect(db).toBeDefined()
    expect(typeof db).toBe('object')
  })

  test('should have select method', () => {
    expect(db.select).toBeDefined()
    expect(typeof db.select).toBe('function')
  })

  test('should have insert method', () => {
    expect(db.insert).toBeDefined()
    expect(typeof db.insert).toBe('function')
  })

  test('should have update method', () => {
    expect(db.update).toBeDefined()
    expect(typeof db.update).toBe('function')
  })

  test('should have delete method', () => {
    expect(db.delete).toBeDefined()
    expect(typeof db.delete).toBe('function')
  })

  describe('Connection to existing database', () => {
    test('should connect to existing database and read people', async () => {
      // This test verifies we can read from the existing database
      const result = await db.select().from(people).limit(1)

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)

      // If there is data, verify the structure
      if (result.length > 0) {
        const person = result[0]
        expect(person).toHaveProperty('id')
        expect(person).toHaveProperty('firstName')
        expect(person).toHaveProperty('lastName')
        expect(typeof person.id).toBe('number')
        expect(typeof person.firstName).toBe('string')
        expect(typeof person.lastName).toBe('string')
      }
    })

    test('should connect to existing database and read relationships', async () => {
      // This test verifies we can read from the existing database
      const result = await db.select().from(relationships).limit(1)

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)

      // If there is data, verify the structure
      if (result.length > 0) {
        const relationship = result[0]
        expect(relationship).toHaveProperty('id')
        expect(relationship).toHaveProperty('person1Id')
        expect(relationship).toHaveProperty('person2Id')
        expect(relationship).toHaveProperty('type')
        expect(typeof relationship.id).toBe('number')
        expect(typeof relationship.person1Id).toBe('number')
        expect(typeof relationship.person2Id).toBe('number')
        expect(typeof relationship.type).toBe('string')
      }
    })

    test('should read people with specific columns', async () => {
      const result = await db
        .select({
          id: people.id,
          firstName: people.firstName,
          lastName: people.lastName
        })
        .from(people)
        .limit(1)

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)

      if (result.length > 0) {
        const person = result[0]
        expect(person).toHaveProperty('id')
        expect(person).toHaveProperty('firstName')
        expect(person).toHaveProperty('lastName')
        // Should not have other fields
        expect(person).not.toHaveProperty('birthDate')
        expect(person).not.toHaveProperty('gender')
      }
    })

    test('should filter people by id', async () => {
      // First, get a person from the database
      const allPeople = await db.select().from(people).limit(1)

      if (allPeople.length > 0) {
        const testPerson = allPeople[0]

        // Now query for that specific person
        const result = await db
          .select()
          .from(people)
          .where(eq(people.id, testPerson.id))

        expect(result).toBeDefined()
        expect(result.length).toBe(1)
        expect(result[0].id).toBe(testPerson.id)
        expect(result[0].firstName).toBe(testPerson.firstName)
        expect(result[0].lastName).toBe(testPerson.lastName)
      }
    })

    test('should filter relationships by type', async () => {
      const result = await db
        .select()
        .from(relationships)
        .where(eq(relationships.type, 'parentOf'))
        .limit(1)

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)

      if (result.length > 0) {
        expect(result[0].type).toBe('parentOf')
      }
    })
  })
})
