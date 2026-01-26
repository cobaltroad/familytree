/**
 * Unit Tests for Person Merge Execution
 * Story #110: Execute Person Merge with Relationship Transfer
 *
 * Tests the executeMerge function and relationship transfer logic
 */

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { setupTestDatabase } from './testHelpers.js'
import { executeMerge } from './personMerge.js'
import { people, relationships } from '../db/schema.js'
import { eq, or, and } from 'drizzle-orm'

describe('executeMerge', () => {
  let sqlite
  let db

  beforeEach(async () => {
    sqlite = new Database(':memory:')
    db = drizzle(sqlite)
    await setupTestDatabase(sqlite, db)
  })

  describe('validation', () => {
    it('should throw error when source person does not exist', async () => {
      const target = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Doe'
      }).returning().get()

      await expect(executeMerge(999, target.id, db)).rejects.toThrow('Source person not found')
    })

    it('should throw error when target person does not exist', async () => {
      const source = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Doe'
      }).returning().get()

      await expect(executeMerge(source.id, 999, db)).rejects.toThrow('Target person not found')
    })
  })

  describe('successful merge', () => {
    it('should merge two people with no relationships', async () => {
      const source = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Smith',
        birthDate: '1950'
      }).returning().get()

      const target = await db.insert(people).values({
        firstName: 'John',
        lastName: 'A. Smith',
        birthDate: '1950-03-15'
      }).returning().get()

      const result = await executeMerge(source.id, target.id, db)

      expect(result.success).toBe(true)
      expect(result.targetId).toBe(target.id)
      expect(result.mergedData.firstName).toBe('John')
      expect(result.mergedData.lastName).toBe('A. Smith')
      expect(result.mergedData.birthDate).toBe('1950-03-15')
      expect(result.relationshipsTransferred).toBe(0)

      // Verify source is deleted
      const sourceExists = await db.select().from(people).where(eq(people.id, source.id)).get()
      expect(sourceExists).toBeUndefined()

      // Verify target is updated
      const updatedTarget = await db.select().from(people).where(eq(people.id, target.id)).get()
      expect(updatedTarget.lastName).toBe('A. Smith')
      expect(updatedTarget.birthDate).toBe('1950-03-15')
    })

    it('should transfer relationships from source to target', async () => {
      const source = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Smith'
      }).returning().get()

      const target = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Smith'
      }).returning().get()

      const mother = await db.insert(people).values({
        firstName: 'Mary',
        lastName: 'Smith',
        gender: 'female'
      }).returning().get()

      const child = await db.insert(people).values({
        firstName: 'Jane',
        lastName: 'Smith'
      }).returning().get()

      // Create relationships for source
      await db.insert(relationships).values([
        { person1Id: mother.id, person2Id: source.id, type: 'parentOf', parentRole: 'mother' },
        { person1Id: source.id, person2Id: child.id, type: 'parentOf', parentRole: 'father' }
      ])

      const result = await executeMerge(source.id, target.id, db)

      expect(result.success).toBe(true)
      expect(result.relationshipsTransferred).toBe(2)

      // Verify relationships are transferred
      const targetRelationships = await db.select()
        .from(relationships)
        .where(or(
          eq(relationships.person1Id, target.id),
          eq(relationships.person2Id, target.id)
        ))
        .all()

      expect(targetRelationships).toHaveLength(2)

      // Verify mother relationship
      const motherRel = targetRelationships.find(r => r.person1Id === mother.id)
      expect(motherRel).toBeDefined()
      expect(motherRel.person2Id).toBe(target.id)
      expect(motherRel.type).toBe('parentOf')
      expect(motherRel.parentRole).toBe('mother')

      // Verify child relationship
      const childRel = targetRelationships.find(r => r.person2Id === child.id)
      expect(childRel).toBeDefined()
      expect(childRel.person1Id).toBe(target.id)
      expect(childRel.type).toBe('parentOf')
      expect(childRel.parentRole).toBe('father')
    })

    it('should deduplicate relationships during transfer', async () => {
      const source = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Smith'
      }).returning().get()

      const target = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Smith'
      }).returning().get()

      const mother = await db.insert(people).values({
        firstName: 'Mary',
        lastName: 'Smith',
        gender: 'female'
      }).returning().get()

      const father = await db.insert(people).values({
        firstName: 'Bob',
        lastName: 'Smith',
        gender: 'male'
      }).returning().get()

      // Both source and target have same mother (should deduplicate)
      await db.insert(relationships).values([
        { person1Id: mother.id, person2Id: source.id, type: 'parentOf', parentRole: 'mother' },
        { person1Id: mother.id, person2Id: target.id, type: 'parentOf', parentRole: 'mother' },
        // Source has father, target doesn't (should transfer)
        { person1Id: father.id, person2Id: source.id, type: 'parentOf', parentRole: 'father' }
      ])

      const result = await executeMerge(source.id, target.id, db)

      expect(result.success).toBe(true)
      expect(result.relationshipsTransferred).toBe(1) // Only father transferred, mother deduplicated

      // Verify relationships
      const targetRelationships = await db.select()
        .from(relationships)
        .where(or(
          eq(relationships.person1Id, target.id),
          eq(relationships.person2Id, target.id)
        ))
        .all()

      expect(targetRelationships).toHaveLength(2)

      // Verify only one mother relationship exists
      const motherRels = targetRelationships.filter(r => r.person1Id === mother.id && r.parentRole === 'mother')
      expect(motherRels).toHaveLength(1)
    })

    it('should handle bidirectional spouse relationships', async () => {
      const source = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Smith'
      }).returning().get()

      const target = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Smith'
      }).returning().get()

      const spouse = await db.insert(people).values({
        firstName: 'Jane',
        lastName: 'Doe'
      }).returning().get()

      // Create bidirectional spouse relationship
      await db.insert(relationships).values([
        { person1Id: source.id, person2Id: spouse.id, type: 'spouse' },
        { person1Id: spouse.id, person2Id: source.id, type: 'spouse' }
      ])

      const result = await executeMerge(source.id, target.id, db)

      expect(result.success).toBe(true)
      expect(result.relationshipsTransferred).toBe(2)

      // Verify both directions are transferred
      const spouseRels = await db.select()
        .from(relationships)
        .where(
          or(
            and(eq(relationships.person1Id, target.id), eq(relationships.person2Id, spouse.id)),
            and(eq(relationships.person1Id, spouse.id), eq(relationships.person2Id, target.id))
          )
        )
        .all()

      expect(spouseRels).toHaveLength(2)
      expect(spouseRels.every(r => r.type === 'spouse')).toBe(true)
    })

    it('should handle relationship conflict by preferring source parent', async () => {
      const source = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Smith'
      }).returning().get()

      const target = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Smith'
      }).returning().get()

      const sourceMother = await db.insert(people).values({
        firstName: 'Mary',
        lastName: 'Smith',
        gender: 'female'
      }).returning().get()

      const targetMother = await db.insert(people).values({
        firstName: 'Jane',
        lastName: 'Doe',
        gender: 'female'
      }).returning().get()

      // Both have different mothers
      await db.insert(relationships).values([
        { person1Id: sourceMother.id, person2Id: source.id, type: 'parentOf', parentRole: 'mother' },
        { person1Id: targetMother.id, person2Id: target.id, type: 'parentOf', parentRole: 'mother' }
      ])

      const result = await executeMerge(source.id, target.id, db)

      expect(result.success).toBe(true)

      // Verify source mother replaces target mother
      const motherRels = await db.select()
        .from(relationships)
        .where(
          and(
            eq(relationships.person2Id, target.id),
            eq(relationships.type, 'parentOf'),
            eq(relationships.parentRole, 'mother')
          )
        )
        .all()

      expect(motherRels).toHaveLength(1)
      expect(motherRels[0].person1Id).toBe(sourceMother.id)
    })

    it('should update target with best field values', async () => {
      const source = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Smith',
        birthDate: '1950',
        deathDate: null,
        gender: 'male',
        photoUrl: 'http://example.com/photo.jpg',
        birthSurname: 'Johnson',
        nickname: 'Johnny'
      }).returning().get()

      const target = await db.insert(people).values({
        firstName: 'John',
        lastName: 'A. Smith',
        birthDate: '1950-03-15',
        deathDate: '2020-01-01',
        gender: 'male',
        photoUrl: null,
        birthSurname: null,
        nickname: null
      }).returning().get()

      const result = await executeMerge(source.id, target.id, db)

      expect(result.success).toBe(true)

      const updatedTarget = await db.select().from(people).where(eq(people.id, target.id)).get()

      // More specific values should win
      expect(updatedTarget.lastName).toBe('A. Smith') // Longer
      expect(updatedTarget.birthDate).toBe('1950-03-15') // More specific date
      expect(updatedTarget.deathDate).toBe('2020-01-01') // Non-null wins
      expect(updatedTarget.photoUrl).toBe('http://example.com/photo.jpg') // Non-null wins
      expect(updatedTarget.birthSurname).toBe('Johnson') // Non-null wins
      expect(updatedTarget.nickname).toBe('Johnny') // Non-null wins
    })

    it('should return merge summary', async () => {
      const source = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Smith'
      }).returning().get()

      const target = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Smith'
      }).returning().get()

      const mother = await db.insert(people).values({
        firstName: 'Mary',
        lastName: 'Smith'
      }).returning().get()

      await db.insert(relationships).values({
        person1Id: mother.id,
        person2Id: source.id,
        type: 'parentOf',
        parentRole: 'mother'
      })

      const result = await executeMerge(source.id, target.id, db)

      expect(result).toMatchObject({
        success: true,
        targetId: target.id,
        sourceId: source.id,
        relationshipsTransferred: 1,
        mergedData: expect.objectContaining({
          firstName: 'John',
          lastName: 'Smith'
        })
      })
    })
  })

  describe('atomicity', () => {
    it('should rollback entire transaction on error', async () => {
      const source = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Smith'
      }).returning().get()

      const target = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Smith'
      }).returning().get()

      const countBefore = await db.select().from(people).all()
      const relCountBefore = await db.select().from(relationships).all()

      try {
        // Attempt to merge non-existent source to trigger error
        await executeMerge(999, target.id, db)
      } catch (err) {
        // Expected to fail
      }

      // Verify no changes were made
      const countAfter = await db.select().from(people).all()
      const relCountAfter = await db.select().from(relationships).all()

      expect(countAfter.length).toBe(countBefore.length)
      expect(relCountAfter.length).toBe(relCountBefore.length)
    })
  })
})
