import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { people } from './schema.js'
import { eq } from 'drizzle-orm'
import { setupTestDatabase } from '$lib/server/testHelpers.js'

describe('People Schema - Birth Surname and Nickname Integration Tests (AC1)', () => {
  let sqlite
  let db
  let userId

  beforeEach(async () => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)
    userId = await setupTestDatabase(sqlite, db)
  })

  afterEach(() => {
    sqlite.close()
  })

  describe('Birth Surname Field - CRUD Operations', () => {
    it('should CREATE person with birth_surname', async () => {
      const [person] = await db.insert(people).values({
        firstName: 'Jane',
        lastName: 'Smith',
        birthSurname: 'Jones',
        userId
      }).returning()

      expect(person).toBeDefined()
      expect(person.birthSurname).toBe('Jones')
      expect(person.firstName).toBe('Jane')
      expect(person.lastName).toBe('Smith')
    })

    it('should CREATE person with NULL birth_surname', async () => {
      const [person] = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Doe',
        birthSurname: null,
        userId
      }).returning()

      expect(person).toBeDefined()
      expect(person.birthSurname).toBeNull()
    })

    it('should CREATE person without specifying birth_surname (defaults to NULL)', async () => {
      const [person] = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Doe',
        userId
      }).returning()

      expect(person).toBeDefined()
      // Drizzle returns null for unspecified nullable fields
      expect(person.birthSurname).toBeNull()
    })

    it('should READ person with birth_surname', async () => {
      await db.insert(people).values({
        firstName: 'Jane',
        lastName: 'Smith',
        birthSurname: 'Jones',
        userId
      })

      const [retrieved] = await db.select().from(people).where(eq(people.lastName, 'Smith'))

      expect(retrieved.birthSurname).toBe('Jones')
    })

    it('should UPDATE person to add birth_surname', async () => {
      const [person] = await db.insert(people).values({
        firstName: 'Jane',
        lastName: 'Smith',
        userId
      }).returning()

      const [updated] = await db.update(people)
        .set({ birthSurname: 'Jones' })
        .where(eq(people.id, person.id))
        .returning()

      expect(updated.birthSurname).toBe('Jones')
    })

    it('should UPDATE person to change birth_surname', async () => {
      const [person] = await db.insert(people).values({
        firstName: 'Jane',
        lastName: 'Smith',
        birthSurname: 'Jones',
        userId
      }).returning()

      const [updated] = await db.update(people)
        .set({ birthSurname: 'Williams' })
        .where(eq(people.id, person.id))
        .returning()

      expect(updated.birthSurname).toBe('Williams')
    })

    it('should UPDATE person to remove birth_surname (set to NULL)', async () => {
      const [person] = await db.insert(people).values({
        firstName: 'Jane',
        lastName: 'Smith',
        birthSurname: 'Jones',
        userId
      }).returning()

      const [updated] = await db.update(people)
        .set({ birthSurname: null })
        .where(eq(people.id, person.id))
        .returning()

      expect(updated.birthSurname).toBeNull()
    })
  })

  describe('Nickname Field - CRUD Operations', () => {
    it('should CREATE person with nickname', async () => {
      const [person] = await db.insert(people).values({
        firstName: 'Robert',
        lastName: 'Johnson',
        nickname: 'Bob',
        userId
      }).returning()

      expect(person).toBeDefined()
      expect(person.nickname).toBe('Bob')
      expect(person.firstName).toBe('Robert')
    })

    it('should CREATE person with NULL nickname', async () => {
      const [person] = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Doe',
        nickname: null,
        userId
      }).returning()

      expect(person).toBeDefined()
      expect(person.nickname).toBeNull()
    })

    it('should CREATE person without specifying nickname (defaults to NULL)', async () => {
      const [person] = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Doe',
        userId
      }).returning()

      expect(person).toBeDefined()
      // Drizzle returns null for unspecified nullable fields
      expect(person.nickname).toBeNull()
    })

    it('should READ person with nickname', async () => {
      await db.insert(people).values({
        firstName: 'Robert',
        lastName: 'Johnson',
        nickname: 'Bob',
        userId
      })

      const [retrieved] = await db.select().from(people).where(eq(people.lastName, 'Johnson'))

      expect(retrieved.nickname).toBe('Bob')
    })

    it('should UPDATE person to add nickname', async () => {
      const [person] = await db.insert(people).values({
        firstName: 'Robert',
        lastName: 'Johnson',
        userId
      }).returning()

      const [updated] = await db.update(people)
        .set({ nickname: 'Bob' })
        .where(eq(people.id, person.id))
        .returning()

      expect(updated.nickname).toBe('Bob')
    })

    it('should UPDATE person to change nickname', async () => {
      const [person] = await db.insert(people).values({
        firstName: 'Robert',
        lastName: 'Johnson',
        nickname: 'Bob',
        userId
      }).returning()

      const [updated] = await db.update(people)
        .set({ nickname: 'Bobby' })
        .where(eq(people.id, person.id))
        .returning()

      expect(updated.nickname).toBe('Bobby')
    })

    it('should UPDATE person to remove nickname (set to NULL)', async () => {
      const [person] = await db.insert(people).values({
        firstName: 'Robert',
        lastName: 'Johnson',
        nickname: 'Bob',
        userId
      }).returning()

      const [updated] = await db.update(people)
        .set({ nickname: null })
        .where(eq(people.id, person.id))
        .returning()

      expect(updated.nickname).toBeNull()
    })
  })

  describe('Both Fields Together', () => {
    it('should CREATE person with both birth_surname and nickname', async () => {
      const [person] = await db.insert(people).values({
        firstName: 'Jane',
        lastName: 'Smith',
        birthSurname: 'Jones',
        nickname: 'JJ',
        userId
      }).returning()

      expect(person.firstName).toBe('Jane')
      expect(person.lastName).toBe('Smith')
      expect(person.birthSurname).toBe('Jones')
      expect(person.nickname).toBe('JJ')
    })

    it('should UPDATE person to add both birth_surname and nickname', async () => {
      const [person] = await db.insert(people).values({
        firstName: 'Jane',
        lastName: 'Smith',
        userId
      }).returning()

      const [updated] = await db.update(people)
        .set({ birthSurname: 'Jones', nickname: 'JJ' })
        .where(eq(people.id, person.id))
        .returning()

      expect(updated.birthSurname).toBe('Jones')
      expect(updated.nickname).toBe('JJ')
    })

    it('should handle special characters in birth_surname (hyphen, apostrophe)', async () => {
      const [person] = await db.insert(people).values({
        firstName: 'Jane',
        lastName: 'Smith',
        birthSurname: "O'Brien-Jones",
        userId
      }).returning()

      expect(person.birthSurname).toBe("O'Brien-Jones")
    })

    it('should handle special characters in nickname (dots, spaces)', async () => {
      const [person] = await db.insert(people).values({
        firstName: 'Robert',
        lastName: 'Johnson',
        nickname: 'J.J.',
        userId
      }).returning()

      expect(person.nickname).toBe('J.J.')
    })
  })

  describe('Backward Compatibility', () => {
    it('should not affect existing person records without these fields', async () => {
      const [existingPerson] = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Doe',
        birthDate: '1980-01-01',
        gender: 'male',
        userId
      }).returning()

      expect(existingPerson.firstName).toBe('John')
      expect(existingPerson.lastName).toBe('Doe')
      expect(existingPerson.birthDate).toBe('1980-01-01')
      expect(existingPerson.gender).toBe('male')
      // Drizzle returns null for unspecified nullable fields
      expect(existingPerson.birthSurname).toBeNull()
      expect(existingPerson.nickname).toBeNull()
    })

    it('should allow querying for people without birth_surname or nickname', async () => {
      await db.insert(people).values({
        firstName: 'John',
        lastName: 'Doe',
        userId
      })

      const results = await db.select().from(people).where(eq(people.firstName, 'John'))

      expect(results).toHaveLength(1)
      expect(results[0].firstName).toBe('John')
    })
  })
})
