import { json } from '@sveltejs/kit'
import { db } from '$lib/db/client.js'
import { relationships, people, users } from '$lib/db/schema.js'
import { eq, and, or } from 'drizzle-orm'
import {
  transformRelationshipsToAPI,
  transformRelationshipToAPI,
  validateRelationshipData,
  normalizeRelationship
} from '$lib/server/relationshipHelpers.js'
import { requireAuth } from '$lib/server/session.js'

/**
 * GET /api/relationships
 * Returns relationships from the database for the authenticated user
 *
 * Authentication: Required
 * Data Isolation: Behavior depends on view_all_records flag:
 *   - When false (default): Only returns relationships belonging to current user
 *   - When true: Returns ALL relationships from all users (for debugging/admin)
 *
 * @returns {Response} JSON array of relationships
 */
export async function GET({ locals, ...event }) {
  try {
    // Require authentication (Issue #72)
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id

    // Use locals.db if provided (for testing), otherwise use singleton db
    const database = locals?.db || db

    // Check user's view_all_records flag (with fallback for tests without users table)
    let viewAllRecords = false
    try {
      const currentUserResult = await database
        .select()
        .from(users)
        .where(eq(users.id, userId))

      if (currentUserResult.length > 0) {
        viewAllRecords = currentUserResult[0].viewAllRecords || false
      }
    } catch (error) {
      // If users table doesn't exist (e.g., in some tests), default to false
      viewAllRecords = false
    }

    // Query based on flag
    let userRelationships
    if (viewAllRecords) {
      // View ALL records from all users (bypassing data isolation)
      userRelationships = await database
        .select()
        .from(relationships)
    } else {
      // View only own records (default behavior - data isolation)
      userRelationships = await database
        .select()
        .from(relationships)
        .where(eq(relationships.userId, userId))
    }

    // Transform to API format (denormalize parent types)
    const transformedRelationships = transformRelationshipsToAPI(userRelationships)

    return json(transformedRelationships)
  } catch (error) {
    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }

    console.error('Error fetching relationships:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

/**
 * POST /api/relationships
 * Creates a new relationship in the database with business logic validation
 *
 * Authentication: Required
 * Ownership: Both people must belong to the current user
 *
 * Business logic:
 * - Normalizes "mother"/"father" to "parentOf" with parent_role
 * - Validates each person can have at most one mother and one father
 * - Prevents duplicate relationships
 * - Only accepts valid types: "mother", "father", "spouse"
 *
 * @param {Request} request - HTTP request with relationship data in body
 * @returns {Response} JSON of created relationship with 201 status
 */
export async function POST({ request, locals, ...event }) {
  try {
    // Require authentication (Issue #72)
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id

    // Use locals.db if provided (for testing), otherwise use singleton db
    const database = locals?.db || db

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
      return json({ error: validation.error }, { status: 400 })
    }

    // Normalize relationship (convert mother/father to parentOf)
    const normalized = normalizeRelationship(data.person1Id, data.person2Id, data.type, data.parentRole)

    // Check if both people exist and belong to the current user (Issue #72: Ownership Verification)
    const personsOwnedByUser = await checkPersonsOwnedByUser(
      database,
      userId,
      normalized.person1Id,
      normalized.person2Id
    )
    if (!personsOwnedByUser) {
      return json({ error: 'One or both persons do not exist or do not belong to you' }, { status: 403 })
    }

    // For parent relationships, validate child doesn't already have this parent role
    if (normalized.type === 'parentOf' && normalized.parentRole) {
      const hasParent = await hasParentOfRole(
        database,
        normalized.person2Id,
        normalized.parentRole
      )
      if (hasParent) {
        return json({ error: `Person already has a ${normalized.parentRole}` }, { status: 400 })
      }
    }

    // Check for duplicate relationships
    const exists = await relationshipExists(
      database,
      normalized.person1Id,
      normalized.person2Id,
      normalized.type
    )
    if (exists) {
      return json({ error: 'This relationship already exists' }, { status: 400 })
    }

    // Insert relationship into database with user_id (Issue #72: Data Association)
    const result = await database
      .insert(relationships)
      .values({
        person1Id: normalized.person1Id,
        person2Id: normalized.person2Id,
        type: normalized.type,
        parentRole: normalized.parentRole,
        userId: userId
      })
      .returning()

    const newRelationship = result[0]

    // Transform to API format (denormalize)
    const transformedRelationship = transformRelationshipToAPI(newRelationship)

    return json(transformedRelationship, { status: 201 })
  } catch (error) {
    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }

    console.error('Error creating relationship:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

/**
 * Check if a person already has a parent of the specified role
 *
 * @param {Database} database - Drizzle database instance
 * @param {number} childId - ID of the child person
 * @param {string} role - Parent role ("mother" or "father")
 * @returns {Promise<boolean>} True if parent exists
 */
async function hasParentOfRole(database, childId, role) {
  const result = await database
    .select()
    .from(relationships)
    .where(
      and(
        eq(relationships.person2Id, childId),
        eq(relationships.type, 'parentOf'),
        eq(relationships.parentRole, role)
      )
    )

  return result.length > 0
}

/**
 * Check if a relationship already exists (including inverse for bidirectional types)
 *
 * @param {Database} database - Drizzle database instance
 * @param {number} person1Id - First person ID
 * @param {number} person2Id - Second person ID
 * @param {string} type - Relationship type
 * @returns {Promise<boolean>} True if relationship exists
 */
async function relationshipExists(database, person1Id, person2Id, type) {
  if (type === 'parentOf') {
    // For parent relationships, check both directions
    const result = await database
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

    return result.length > 0
  }

  // For spouse relationships, check both directions
  const result = await database
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
