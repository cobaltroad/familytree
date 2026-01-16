/**
 * GEDCOM Import Duplicate Family Records Test
 * Tests handling of duplicate family records in GEDCOM files
 *
 * Issue: GEDCOM files can contain duplicate family records (F3 and F4 both
 * defining the same husband/wife/children). The import should handle these
 * gracefully without throwing constraint violations.
 *
 * RED Phase: This test should fail initially, demonstrating the bug.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '$lib/db/client.js'
import { people, relationships, users } from '$lib/db/schema.js'
import { eq } from 'drizzle-orm'
import {
  buildRelationshipsFromFamilies
} from '$lib/server/gedcomImporter.js'

describe('GEDCOM Import - Duplicate Family Records', () => {
  let userId

  beforeEach(async () => {
    // Create a test user in the database
    const testEmail = `test-${Date.now()}@example.com`
    const [user] = await db
      .insert(users)
      .values({
        email: testEmail,
        name: 'Test User',
        provider: 'test',
        providerUserId: `test-${Date.now()}`
      })
      .returning()

    userId = user.id
  })

  afterEach(async () => {
    // Clean up test user (cascade will delete people and relationships)
    if (userId) {
      await db.delete(users).where(eq(users.id, userId))
    }
  })

  describe('Duplicate Family Records in GEDCOM', () => {
    it('should handle duplicate family records without constraint violation', async () => {
      // Arrange: Insert test persons
      const [husband] = await db.insert(people).values({
        firstName: 'John',
        lastName: 'Doe',
        gender: 'male',
        userId
      }).returning()

      const [wife] = await db.insert(people).values({
        firstName: 'Jane',
        lastName: 'Doe',
        gender: 'female',
        userId
      }).returning()

      const [child1] = await db.insert(people).values({
        firstName: 'Child1',
        lastName: 'Doe',
        gender: 'male',
        userId
      }).returning()

      const [child2] = await db.insert(people).values({
        firstName: 'Child2',
        lastName: 'Doe',
        gender: 'female',
        userId
      }).returning()

      // GEDCOM ID to Person ID mapping
      const gedcomIdToPersonId = {
        '@I9@': husband.id,
        '@I10@': wife.id,
        '@I8@': child1.id,
        '@I1@': child2.id
      }

      // Duplicate family records (F3 and F4 both define the same family)
      // This is what appears in backups/familytree_20260110.ged
      const duplicateFamilies = [
        {
          id: '@F3@',
          husband: '@I9@',
          wife: '@I10@',
          children: ['@I8@', '@I1@']
        },
        {
          id: '@F4@',
          husband: '@I9@',
          wife: '@I10@',
          children: ['@I8@', '@I1@']
        }
      ]

      // Build relationships from duplicate families
      const relationshipsToInsert = buildRelationshipsFromFamilies(
        duplicateFamilies,
        gedcomIdToPersonId,
        userId
      )

      // Act & Assert: Insert relationships in a transaction
      // This should NOT throw a constraint violation
      const transactionResult = db.transaction(() => {
        let insertedCount = 0

        for (const relationship of relationshipsToInsert) {
          const result = db
            .insert(relationships)
            .values(relationship)
            .onConflictDoNothing()
            .run()

          if (result.changes > 0) {
            insertedCount++
          }
        }

        return insertedCount
      })

      // Verify: Should have inserted relationships only once (not duplicated)
      // Expected relationships:
      // - 2 bidirectional spouse relationships (husband→wife, wife→husband)
      // - 4 parent-child relationships (husband→child1, husband→child2, wife→child1, wife→child2)
      // Total: 6 unique relationships
      expect(transactionResult).toBe(6)

      // Verify database state
      const allRelationships = await db
        .select()
        .from(relationships)
        .where(eq(relationships.userId, userId))

      expect(allRelationships).toHaveLength(6)

      // Verify spouse relationships exist (bidirectional)
      const spouseRelationships = allRelationships.filter(r => r.type === 'spouse')
      expect(spouseRelationships).toHaveLength(2)

      // Verify parent-child relationships
      const parentChildRelationships = allRelationships.filter(r => r.type === 'parentOf')
      expect(parentChildRelationships).toHaveLength(4)

      // Verify father relationships
      const fatherRelationships = parentChildRelationships.filter(r => r.parentRole === 'father')
      expect(fatherRelationships).toHaveLength(2)

      // Verify mother relationships
      const motherRelationships = parentChildRelationships.filter(r => r.parentRole === 'mother')
      expect(motherRelationships).toHaveLength(2)
    })

    it('should handle multiple duplicate family records (stress test)', async () => {
      // Arrange: Create a family
      const [husband] = await db.insert(people).values({
        firstName: 'Rodolfo',
        lastName: 'Dollete',
        gender: 'male',
        userId
      }).returning()

      const [wife] = await db.insert(people).values({
        firstName: 'Winona',
        lastName: 'Dollete',
        gender: 'female',
        userId
      }).returning()

      const [child1] = await db.insert(people).values({
        firstName: 'Raymund',
        lastName: 'Dollete',
        gender: 'male',
        userId
      }).returning()

      const [child2] = await db.insert(people).values({
        firstName: 'Ron',
        lastName: 'Dollete',
        gender: 'male',
        userId
      }).returning()

      const gedcomIdToPersonId = {
        '@I9@': husband.id,
        '@I10@': wife.id,
        '@I8@': child1.id,
        '@I1@': child2.id
      }

      // Test with 10 duplicate family records (extreme case)
      const duplicateFamilies = Array.from({ length: 10 }, (_, i) => ({
        id: `@F${i + 1}@`,
        husband: '@I9@',
        wife: '@I10@',
        children: ['@I8@', '@I1@']
      }))

      // Build relationships
      const relationshipsToInsert = buildRelationshipsFromFamilies(
        duplicateFamilies,
        gedcomIdToPersonId,
        userId
      )

      // Act: Insert all relationships
      const transactionResult = db.transaction(() => {
        let insertedCount = 0

        for (const relationship of relationshipsToInsert) {
          const result = db
            .insert(relationships)
            .values(relationship)
            .onConflictDoNothing()
            .run()

          if (result.changes > 0) {
            insertedCount++
          }
        }

        return insertedCount
      })

      // Assert: Only 6 unique relationships should be inserted
      expect(transactionResult).toBe(6)

      // Verify database state
      const allRelationships = await db
        .select()
        .from(relationships)
        .where(eq(relationships.userId, userId))

      expect(allRelationships).toHaveLength(6)
    })

    it('should handle duplicate spouse-only families (no children)', async () => {
      // Arrange: Create couple with no children
      const [husband] = await db.insert(people).values({
        firstName: 'Aleksei',
        lastName: 'Quejada',
        gender: 'male',
        userId
      }).returning()

      const [wife] = await db.insert(people).values({
        firstName: 'Hillary',
        lastName: 'Quejada',
        gender: 'female',
        userId
      }).returning()

      const gedcomIdToPersonId = {
        '@I18@': husband.id,
        '@I17@': wife.id
      }

      // Duplicate family records with no children (F7 and F8 from the GEDCOM)
      const duplicateFamilies = [
        {
          id: '@F7@',
          husband: '@I18@',
          wife: '@I17@',
          children: []
        },
        {
          id: '@F8@',
          husband: '@I18@',
          wife: '@I17@',
          children: []
        }
      ]

      // Build relationships
      const relationshipsToInsert = buildRelationshipsFromFamilies(
        duplicateFamilies,
        gedcomIdToPersonId,
        userId
      )

      // Act: Insert relationships
      const transactionResult = db.transaction(() => {
        let insertedCount = 0

        for (const relationship of relationshipsToInsert) {
          const result = db
            .insert(relationships)
            .values(relationship)
            .onConflictDoNothing()
            .run()

          if (result.changes > 0) {
            insertedCount++
          }
        }

        return insertedCount
      })

      // Assert: Only 2 spouse relationships should be inserted (bidirectional)
      expect(transactionResult).toBe(2)

      // Verify database state
      const allRelationships = await db
        .select()
        .from(relationships)
        .where(eq(relationships.userId, userId))

      expect(allRelationships).toHaveLength(2)
      expect(allRelationships.every(r => r.type === 'spouse')).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle families with duplicate children in array', async () => {
      // Arrange: Family where a child appears multiple times in children array
      const [husband] = await db.insert(people).values({
        firstName: 'Father',
        lastName: 'Test',
        gender: 'male',
        userId
      }).returning()

      const [wife] = await db.insert(people).values({
        firstName: 'Mother',
        lastName: 'Test',
        gender: 'female',
        userId
      }).returning()

      const [child] = await db.insert(people).values({
        firstName: 'Child',
        lastName: 'Test',
        gender: 'male',
        userId
      }).returning()

      const gedcomIdToPersonId = {
        '@I1@': husband.id,
        '@I2@': wife.id,
        '@I3@': child.id
      }

      // Family with duplicate child ID in array (malformed GEDCOM)
      const families = [
        {
          id: '@F1@',
          husband: '@I1@',
          wife: '@I2@',
          children: ['@I3@', '@I3@', '@I3@'] // Child appears 3 times
        }
      ]

      // Build relationships
      const relationshipsToInsert = buildRelationshipsFromFamilies(
        families,
        gedcomIdToPersonId,
        userId
      )

      // Act: Insert relationships
      const transactionResult = db.transaction(() => {
        let insertedCount = 0

        for (const relationship of relationshipsToInsert) {
          const result = db
            .insert(relationships)
            .values(relationship)
            .onConflictDoNothing()
            .run()

          if (result.changes > 0) {
            insertedCount++
          }
        }

        return insertedCount
      })

      // Assert: Should insert only unique relationships
      // 2 spouse + 2 parent-child (father→child, mother→child) = 4
      expect(transactionResult).toBe(4)

      const allRelationships = await db
        .select()
        .from(relationships)
        .where(eq(relationships.userId, userId))

      expect(allRelationships).toHaveLength(4)
    })

    it('should handle mixed duplicate and unique families', async () => {
      // Arrange: Multiple families where some are duplicates
      const [husband1] = await db.insert(people).values({
        firstName: 'Husband1',
        lastName: 'Family',
        gender: 'male',
        userId
      }).returning()

      const [wife1] = await db.insert(people).values({
        firstName: 'Wife1',
        lastName: 'Family',
        gender: 'female',
        userId
      }).returning()

      const [husband2] = await db.insert(people).values({
        firstName: 'Husband2',
        lastName: 'Family',
        gender: 'male',
        userId
      }).returning()

      const [wife2] = await db.insert(people).values({
        firstName: 'Wife2',
        lastName: 'Family',
        gender: 'female',
        userId
      }).returning()

      const gedcomIdToPersonId = {
        '@I1@': husband1.id,
        '@I2@': wife1.id,
        '@I3@': husband2.id,
        '@I4@': wife2.id
      }

      // Mix of duplicate and unique families
      const families = [
        { id: '@F1@', husband: '@I1@', wife: '@I2@', children: [] },
        { id: '@F2@', husband: '@I1@', wife: '@I2@', children: [] }, // Duplicate of F1
        { id: '@F3@', husband: '@I3@', wife: '@I4@', children: [] }, // Unique
        { id: '@F4@', husband: '@I1@', wife: '@I2@', children: [] }, // Duplicate of F1
        { id: '@F5@', husband: '@I3@', wife: '@I4@', children: [] }  // Duplicate of F3
      ]

      // Build relationships
      const relationshipsToInsert = buildRelationshipsFromFamilies(
        families,
        gedcomIdToPersonId,
        userId
      )

      // Act: Insert relationships
      const transactionResult = db.transaction(() => {
        let insertedCount = 0

        for (const relationship of relationshipsToInsert) {
          const result = db
            .insert(relationships)
            .values(relationship)
            .onConflictDoNothing()
            .run()

          if (result.changes > 0) {
            insertedCount++
          }
        }

        return insertedCount
      })

      // Assert: Should have 2 unique spouse pairs
      // Family 1: 2 spouse relationships
      // Family 2: 2 spouse relationships
      // Total: 4 unique relationships
      expect(transactionResult).toBe(4)

      const allRelationships = await db
        .select()
        .from(relationships)
        .where(eq(relationships.userId, userId))

      expect(allRelationships).toHaveLength(4)
    })
  })
})
