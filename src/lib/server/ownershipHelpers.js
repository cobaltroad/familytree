/**
 * Ownership Helper Utilities (Issue #72)
 *
 * Provides reusable functions for verifying data ownership in multi-user contexts.
 * These helpers ensure users can only access and modify their own data.
 */

import { eq, and } from 'drizzle-orm'
import { people } from '$lib/db/schema.js'

/**
 * Checks if both people exist and belong to the specified user
 * Used to verify ownership before creating or updating relationships
 *
 * @param {DrizzleDatabase} database - Drizzle database instance
 * @param {number} userId - User ID to verify ownership
 * @param {number} person1Id - First person ID
 * @param {number} person2Id - Second person ID
 * @returns {Promise<boolean>} True if both people exist and belong to user
 *
 * @example
 * const canCreateRelationship = await checkPersonsOwnedByUser(db, userId, 1, 2)
 * if (!canCreateRelationship) {
 *   return json({ error: 'Persons do not belong to you' }, { status: 403 })
 * }
 */
export async function checkPersonsOwnedByUser(database, userId, person1Id, person2Id) {
  const person1 = await database
    .select()
    .from(people)
    .where(and(eq(people.id, person1Id), eq(people.userId, userId)))

  const person2 = await database
    .select()
    .from(people)
    .where(and(eq(people.id, person2Id), eq(people.userId, userId)))

  return person1.length > 0 && person2.length > 0
}

/**
 * Verifies that a resource belongs to the current user
 * Returns appropriate 403/404 responses if not
 *
 * @param {DrizzleDatabase} database - Drizzle database instance
 * @param {Object} table - Drizzle table schema
 * @param {number} resourceId - Resource ID to check
 * @param {number} userId - User ID to verify ownership
 * @param {string} resourceName - Name of resource for error messages (e.g., "person", "relationship")
 * @returns {Promise<Object>} { owned: boolean, resource: Object|null, error: Response|null }
 *
 * @example
 * const { owned, resource, error } = await verifyResourceOwnership(
 *   db, people, personId, userId, 'person'
 * )
 * if (!owned) return error
 * // Use resource...
 */
export async function verifyResourceOwnership(
  database,
  table,
  resourceId,
  userId,
  resourceName = 'resource'
) {
  // Query resource by ID and user_id
  const result = await database
    .select()
    .from(table)
    .where(and(eq(table.id, resourceId), eq(table.userId, userId)))
    .limit(1)

  if (result.length > 0) {
    // User owns the resource
    return {
      owned: true,
      resource: result[0],
      error: null
    }
  }

  // Check if resource exists at all (to differentiate 404 vs 403)
  const anyResource = await database.select().from(table).where(eq(table.id, resourceId)).limit(1)

  if (anyResource.length > 0) {
    // Resource exists but doesn't belong to user
    return {
      owned: false,
      resource: null,
      error: new Response(`Forbidden: You do not have access to this ${resourceName}`, {
        status: 403
      })
    }
  } else {
    // Resource doesn't exist at all
    return {
      owned: false,
      resource: null,
      error: new Response(`${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)} not found`, {
        status: 404
      })
    }
  }
}
