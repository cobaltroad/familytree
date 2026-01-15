/**
 * Person Merge Execution Module
 * Story #110: Execute Person Merge with Relationship Transfer
 *
 * Provides atomic transaction logic for merging two people with relationship transfer
 */

import { people, relationships, users } from '../db/schema.js'
import { eq, or, and } from 'drizzle-orm'
import { selectBestValue } from './mergePreview.js'

/**
 * Executes a merge operation within an atomic transaction
 *
 * Transaction steps:
 * 1. Validate ownership and permissions
 * 2. Load both people with relationships
 * 3. Validate no default person conflicts
 * 4. Update target person fields (merged values)
 * 5. Transfer relationships (deduplicate)
 * 6. Delete source person (CASCADE removes old relationships)
 * 7. Return merge summary
 *
 * @param {number} sourceId - ID of source person (will be deleted)
 * @param {number} targetId - ID of target person (will receive merged data)
 * @param {number} userId - Current user ID
 * @param {Object} db - Drizzle database instance
 * @returns {Promise<Object>} Merge result with success status and details
 * @throws {Error} If validation fails or transaction fails
 *
 * @example
 * const result = await executeMerge(15, 27, userId, db)
 * // Returns: { success: true, targetId: 27, sourceId: 15, relationshipsTransferred: 3, mergedData: {...} }
 */
export async function executeMerge(sourceId, targetId, userId, db) {
  // Execute everything within a transaction for atomicity
  return db.transaction((tx) => {
    // Step 1: Load both people
    const source = tx.select()
      .from(people)
      .where(eq(people.id, sourceId))
      .get()

    const target = tx.select()
      .from(people)
      .where(eq(people.id, targetId))
      .get()

    // Validate existence
    if (!source) {
      throw new Error('Source person not found')
    }

    if (!target) {
      throw new Error('Target person not found')
    }

    // Step 2: Validate ownership
    if (source.userId !== userId) {
      throw new Error('Source person does not belong to current user')
    }

    if (target.userId !== userId) {
      throw new Error('Target person does not belong to current user')
    }

    // Step 3: Validate default person restrictions
    const user = tx.select()
      .from(users)
      .where(eq(users.id, userId))
      .get()

    if (user.defaultPersonId === targetId) {
      throw new Error('Cannot merge into your profile person')
    }

    if (user.defaultPersonId === sourceId) {
      throw new Error('Cannot merge your profile person into another person')
    }

    // Step 4: Load relationships for both people
    const sourceRelationships = tx.select()
      .from(relationships)
      .where(or(
        eq(relationships.person1Id, sourceId),
        eq(relationships.person2Id, sourceId)
      ))
      .all()

    const targetRelationships = tx.select()
      .from(relationships)
      .where(or(
        eq(relationships.person1Id, targetId),
        eq(relationships.person2Id, targetId)
      ))
      .all()

    // Step 5: Generate merged data using selectBestValue
    const mergedData = {
      firstName: selectBestValue(source.firstName, target.firstName),
      lastName: selectBestValue(source.lastName, target.lastName),
      birthDate: selectBestValue(source.birthDate, target.birthDate),
      deathDate: selectBestValue(source.deathDate, target.deathDate),
      gender: selectBestValue(source.gender, target.gender),
      photoUrl: selectBestValue(source.photoUrl, target.photoUrl),
      birthSurname: selectBestValue(source.birthSurname, target.birthSurname),
      nickname: selectBestValue(source.nickname, target.nickname)
    }

    // Step 6: Update target person with merged data
    tx.update(people)
      .set(mergedData)
      .where(eq(people.id, targetId))
      .run()

    // Step 7: Handle relationship conflicts - delete conflicting target relationships
    // When both source and target have DIFFERENT parents (mother/father), prefer source
    const sourceMother = sourceRelationships.find(
      rel => rel.person2Id === sourceId && rel.type === 'parentOf' && rel.parentRole === 'mother'
    )
    const sourceFather = sourceRelationships.find(
      rel => rel.person2Id === sourceId && rel.type === 'parentOf' && rel.parentRole === 'father'
    )

    const targetMother = targetRelationships.find(
      rel => rel.person2Id === targetId && rel.type === 'parentOf' && rel.parentRole === 'mother'
    )
    const targetFather = targetRelationships.find(
      rel => rel.person2Id === targetId && rel.type === 'parentOf' && rel.parentRole === 'father'
    )

    // Delete conflicting target mother if source has DIFFERENT mother
    if (sourceMother && targetMother && sourceMother.person1Id !== targetMother.person1Id) {
      tx.delete(relationships)
        .where(
          and(
            eq(relationships.person2Id, targetId),
            eq(relationships.type, 'parentOf'),
            eq(relationships.parentRole, 'mother')
          )
        )
        .run()
    }

    // Delete conflicting target father if source has DIFFERENT father
    if (sourceFather && targetFather && sourceFather.person1Id !== targetFather.person1Id) {
      tx.delete(relationships)
        .where(
          and(
            eq(relationships.person2Id, targetId),
            eq(relationships.type, 'parentOf'),
            eq(relationships.parentRole, 'father')
          )
        )
        .run()
    }

    // Step 8: Transfer relationships from source to target (with deduplication)
    let relationshipsTransferred = 0

    for (const rel of sourceRelationships) {
      // Determine new person1Id and person2Id
      const newPerson1Id = rel.person1Id === sourceId ? targetId : rel.person1Id
      const newPerson2Id = rel.person2Id === sourceId ? targetId : rel.person2Id

      // Check if this relationship already exists for target (deduplication)
      const isDuplicate = targetRelationships.some(targetRel => {
        // Check if relationship matches (considering both directions for some types)
        if (targetRel.type === rel.type) {
          // For parent-child relationships, check exact match
          if (rel.type === 'parentOf') {
            return targetRel.person1Id === newPerson1Id &&
                   targetRel.person2Id === newPerson2Id &&
                   targetRel.parentRole === rel.parentRole
          }
          // For spouse relationships, check both directions
          if (rel.type === 'spouse') {
            return (
              (targetRel.person1Id === newPerson1Id && targetRel.person2Id === newPerson2Id) ||
              (targetRel.person1Id === newPerson2Id && targetRel.person2Id === newPerson1Id)
            )
          }
          // Generic check for other types
          return targetRel.person1Id === newPerson1Id && targetRel.person2Id === newPerson2Id
        }
        return false
      })

      // Only transfer if not duplicate
      if (!isDuplicate) {
        tx.insert(relationships).values({
          person1Id: newPerson1Id,
          person2Id: newPerson2Id,
          type: rel.type,
          parentRole: rel.parentRole,
          userId: rel.userId
        }).run()
        relationshipsTransferred++
      }
    }

    // Step 9: Delete source person (CASCADE will delete old source relationships)
    tx.delete(people)
      .where(eq(people.id, sourceId))
      .run()

    // Step 10: Return merge summary
    return {
      success: true,
      targetId,
      sourceId,
      relationshipsTransferred,
      mergedData: {
        id: targetId,
        ...mergedData,
        userId: target.userId
      }
    }
  })
}
