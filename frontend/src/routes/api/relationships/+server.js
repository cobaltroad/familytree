import { json } from '@sveltejs/kit'
import { db } from '$lib/db/client.js'
import { relationships } from '$lib/db/schema.js'
import { eq, and, or } from 'drizzle-orm'
import {
  transformRelationshipsToAPI,
  transformRelationshipToAPI,
  validateRelationshipData,
  normalizeRelationship
} from '$lib/server/relationshipHelpers.js'

/**
 * GET /api/relationships
 * Returns all relationships from the database with denormalized types
 *
 * @returns {Response} JSON array of all relationships
 */
export async function GET({ locals }) {
  try {
    // Use locals.db if provided (for testing), otherwise use singleton db
    const database = locals?.db || db

    // Query all relationships from database
    const allRelationships = await database.select().from(relationships)

    // Transform to API format (denormalize parent types)
    const transformedRelationships = transformRelationshipsToAPI(allRelationships)

    return json(transformedRelationships)
  } catch (error) {
    console.error('Error fetching relationships:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

/**
 * POST /api/relationships
 * Creates a new relationship in the database with business logic validation
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
export async function POST({ request, locals }) {
  try {
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
      return new Response(validation.error, { status: 400 })
    }

    // Normalize relationship (convert mother/father to parentOf)
    const normalized = normalizeRelationship(data.person1Id, data.person2Id, data.type)

    // For parent relationships, validate child doesn't already have this parent role
    if (normalized.type === 'parentOf' && normalized.parentRole) {
      const hasParent = await hasParentOfRole(
        database,
        normalized.person2Id,
        normalized.parentRole
      )
      if (hasParent) {
        return new Response(`Person already has a ${normalized.parentRole}`, { status: 400 })
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
      return new Response('This relationship already exists', { status: 400 })
    }

    // Insert relationship into database
    const result = await database
      .insert(relationships)
      .values({
        person1Id: normalized.person1Id,
        person2Id: normalized.person2Id,
        type: normalized.type,
        parentRole: normalized.parentRole
      })
      .returning()

    const newRelationship = result[0]

    // Transform to API format (denormalize)
    const transformedRelationship = transformRelationshipToAPI(newRelationship)

    return json(transformedRelationship, { status: 201 })
  } catch (error) {
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
