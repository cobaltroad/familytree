import { json } from '@sveltejs/kit'
import { db } from '$lib/db/client.js'
import { relationships, people } from '$lib/db/schema.js'
import { eq, and, or, ne } from 'drizzle-orm'
import {
  transformRelationshipToAPI,
  validateRelationshipData,
  normalizeRelationship,
  parseId
} from '$lib/server/relationshipHelpers.js'
import { requireAuth } from '$lib/server/session.js'

/**
 * GET /api/relationships/[id]
 * Returns a single relationship by ID (must belong to authenticated user)
 *
 * Authentication: Required
 * Ownership: User must own the relationship (403 if not)
 *
 * @param {Object} params - URL parameters containing id
 * @returns {Response} JSON of relationship or 404/403 if not found/forbidden
 */
export async function GET({ params, locals, ...event }) {
  try {
    // Require authentication (Issue #72)
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id

    // Use locals.db if provided (for testing), otherwise use singleton db
    const database = locals?.db || db

    // Validate and parse ID
    const id = parseId(params.id)
    if (id === null) {
      return new Response('Invalid ID', { status: 400 })
    }

    // Query relationship by ID and user_id (Issue #72: Ownership Verification)
    const result = await database
      .select()
      .from(relationships)
      .where(and(eq(relationships.id, id), eq(relationships.userId, userId)))

    if (result.length === 0) {
      // Check if relationship exists at all (to differentiate 404 vs 403)
      const anyRelationship = await database
        .select()
        .from(relationships)
        .where(eq(relationships.id, id))

      if (anyRelationship.length > 0) {
        // Relationship exists but doesn't belong to user
        return new Response('Forbidden: You do not have access to this relationship', {
          status: 403
        })
      } else {
        // Relationship doesn't exist at all
        return new Response('Relationship not found', { status: 404 })
      }
    }

    // Transform to API format (denormalize)
    const transformedRelationship = transformRelationshipToAPI(result[0])

    return json(transformedRelationship)
  } catch (error) {
    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }

    console.error('Error fetching relationship:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

/**
 * PUT /api/relationships/[id]
 * Updates a relationship with business logic validation
 *
 * Authentication: Required
 * Ownership: User must own the relationship and both people (403 if not)
 *
 * Business logic:
 * - Normalizes "mother"/"father" to "parentOf" with parent_role
 * - Validates each person can have at most one mother and one father
 * - Prevents duplicate relationships (excluding self)
 * - Only accepts valid types: "mother", "father", "spouse"
 *
 * @param {Object} params - URL parameters containing id
 * @param {Request} request - HTTP request with relationship data in body
 * @returns {Response} JSON of updated relationship or error
 */
export async function PUT({ params, request, locals, ...event }) {
  try {
    // Require authentication (Issue #72)
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id

    // Use locals.db if provided (for testing), otherwise use singleton db
    const database = locals?.db || db

    // Validate and parse ID
    const id = parseId(params.id)
    if (id === null) {
      return new Response('Invalid ID', { status: 400 })
    }

    // Parse request body
    let data
    try {
      data = await request.json()
    } catch (jsonError) {
      return new Response('Invalid JSON', { status: 400 })
    }

    // Validate required fields
    const validation = validateRelationshipData(data)
    if (!validation.valid) {
      return new Response(validation.error, { status: 400 })
    }

    // Check if relationship exists and belongs to user (Issue #72: Ownership Verification)
    const existing = await database
      .select()
      .from(relationships)
      .where(and(eq(relationships.id, id), eq(relationships.userId, userId)))

    if (existing.length === 0) {
      // Check if relationship exists at all (to differentiate 404 vs 403)
      const anyRelationship = await database
        .select()
        .from(relationships)
        .where(eq(relationships.id, id))

      if (anyRelationship.length > 0) {
        // Relationship exists but doesn't belong to user
        return new Response('Forbidden: You do not have access to this relationship', {
          status: 403
        })
      } else {
        // Relationship doesn't exist at all
        return new Response('Relationship not found', { status: 404 })
      }
    }

    // Normalize relationship (convert mother/father to parentOf)
    const normalized = normalizeRelationship(data.person1Id, data.person2Id, data.type)

    // Verify both people belong to the user (Issue #72: Ownership Verification)
    const personsOwnedByUser = await checkPersonsOwnedByUser(
      database,
      userId,
      normalized.person1Id,
      normalized.person2Id
    )
    if (!personsOwnedByUser) {
      return json({ error: 'One or both persons do not exist or do not belong to you' }, {
        status: 403
      })
    }

    // For parent relationships, validate child doesn't already have this parent role
    // (excluding the current relationship being updated)
    if (normalized.type === 'parentOf' && normalized.parentRole) {
      const hasParent = await hasParentOfRole(
        database,
        normalized.person2Id,
        normalized.parentRole,
        id // Exclude current relationship from check
      )
      if (hasParent) {
        return new Response(`Person already has a ${normalized.parentRole}`, { status: 400 })
      }
    }

    // Check for duplicate relationships (excluding self)
    const exists = await relationshipExists(
      database,
      normalized.person1Id,
      normalized.person2Id,
      normalized.type,
      id // Exclude current relationship from check
    )
    if (exists) {
      return new Response('This relationship already exists', { status: 400 })
    }

    // Update relationship in database
    const result = await database
      .update(relationships)
      .set({
        person1Id: normalized.person1Id,
        person2Id: normalized.person2Id,
        type: normalized.type,
        parentRole: normalized.parentRole
      })
      .where(and(eq(relationships.id, id), eq(relationships.userId, userId)))
      .returning()

    const updatedRelationship = result[0]

    // Transform to API format (denormalize)
    const transformedRelationship = transformRelationshipToAPI(updatedRelationship)

    return json(transformedRelationship)
  } catch (error) {
    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }

    console.error('Error updating relationship:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

/**
 * DELETE /api/relationships/[id]
 * Deletes a relationship by ID (must belong to authenticated user)
 *
 * Authentication: Required
 * Ownership: User must own the relationship (403 if not)
 *
 * @param {Object} params - URL parameters containing id
 * @returns {Response} 204 No Content on success or error
 */
export async function DELETE({ params, locals, ...event }) {
  try {
    // Require authentication (Issue #72)
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id

    // Use locals.db if provided (for testing), otherwise use singleton db
    const database = locals?.db || db

    // Validate and parse ID
    const id = parseId(params.id)
    if (id === null) {
      return new Response('Invalid ID', { status: 400 })
    }

    // Check if relationship exists and belongs to user (Issue #72: Ownership Verification)
    const existing = await database
      .select()
      .from(relationships)
      .where(and(eq(relationships.id, id), eq(relationships.userId, userId)))

    if (existing.length === 0) {
      // Check if relationship exists at all (to differentiate 404 vs 403)
      const anyRelationship = await database
        .select()
        .from(relationships)
        .where(eq(relationships.id, id))

      if (anyRelationship.length > 0) {
        // Relationship exists but doesn't belong to user
        return new Response('Forbidden: You do not have access to this relationship', {
          status: 403
        })
      } else {
        // Relationship doesn't exist at all
        return new Response('Relationship not found', { status: 404 })
      }
    }

    // Delete relationship
    await database
      .delete(relationships)
      .where(and(eq(relationships.id, id), eq(relationships.userId, userId)))

    return new Response(null, { status: 204 })
  } catch (error) {
    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }

    console.error('Error deleting relationship:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

/**
 * Check if a person already has a parent of the specified role
 *
 * @param {Database} database - Drizzle database instance
 * @param {number} childId - ID of the child person
 * @param {string} role - Parent role ("mother" or "father")
 * @param {number} excludeId - Relationship ID to exclude from check (for updates)
 * @returns {Promise<boolean>} True if parent exists
 */
async function hasParentOfRole(database, childId, role, excludeId = null) {
  let query = database
    .select()
    .from(relationships)
    .where(
      and(
        eq(relationships.person2Id, childId),
        eq(relationships.type, 'parentOf'),
        eq(relationships.parentRole, role)
      )
    )

  // Exclude current relationship if updating
  if (excludeId !== null) {
    query = database
      .select()
      .from(relationships)
      .where(
        and(
          eq(relationships.person2Id, childId),
          eq(relationships.type, 'parentOf'),
          eq(relationships.parentRole, role),
          ne(relationships.id, excludeId)
        )
      )
  }

  const result = await query

  return result.length > 0
}

/**
 * Check if both persons exist and belong to the specified user
 *
 * @param {Database} database - Drizzle database instance
 * @param {number} userId - User ID
 * @param {number} person1Id - First person ID
 * @param {number} person2Id - Second person ID
 * @returns {Promise<boolean>} True if both persons exist and belong to user
 */
async function checkPersonsOwnedByUser(database, userId, person1Id, person2Id) {
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
 * Check if a relationship already exists (including inverse for bidirectional types)
 *
 * @param {Database} database - Drizzle database instance
 * @param {number} person1Id - First person ID
 * @param {number} person2Id - Second person ID
 * @param {string} type - Relationship type
 * @param {number} excludeId - Relationship ID to exclude from check (for updates)
 * @returns {Promise<boolean>} True if relationship exists
 */
async function relationshipExists(database, person1Id, person2Id, type, excludeId = null) {
  if (type === 'parentOf') {
    // For parent relationships, check both directions
    let query = database
      .select()
      .from(relationships)
      .where(
        or(
          and(
            eq(relationships.person1Id, person1Id),
            eq(relationships.person2Id, person2Id),
            eq(relationships.type, 'parentOf')
          ),
          and(
            eq(relationships.person1Id, person2Id),
            eq(relationships.person2Id, person1Id),
            eq(relationships.type, 'parentOf')
          )
        )
      )

    // Exclude current relationship if updating
    if (excludeId !== null) {
      const allResults = await query
      const filtered = allResults.filter((r) => r.id !== excludeId)
      return filtered.length > 0
    }

    const result = await query
    return result.length > 0
  }

  // For spouse relationships, check both directions
  let query = database
    .select()
    .from(relationships)
    .where(
      and(
        eq(relationships.type, type),
        or(
          and(eq(relationships.person1Id, person1Id), eq(relationships.person2Id, person2Id)),
          and(eq(relationships.person1Id, person2Id), eq(relationships.person2Id, person1Id))
        )
      )
    )

  // Exclude current relationship if updating
  if (excludeId !== null) {
    const allResults = await query
    const filtered = allResults.filter((r) => r.id !== excludeId)
    return filtered.length > 0
  }

  const result = await query
  return result.length > 0
}
