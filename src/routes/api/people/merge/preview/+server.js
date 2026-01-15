/**
 * Merge Preview API Endpoint
 * Story #109: Merge Preview and Validation
 *
 * POST /api/people/merge/preview - Preview merging two people
 */

import { json } from '@sveltejs/kit'
import { eq, or, and } from 'drizzle-orm'
import { requireAuth } from '$lib/server/session.js'
import { people, relationships, users } from '$lib/db/schema.js'
import { generateMergePreview } from '$lib/server/mergePreview.js'

/**
 * POST /api/people/merge/preview
 *
 * Generates a preview of what will happen when merging two people.
 * Returns validation errors, warnings, merged data, and relationship information.
 *
 * Request body:
 * {
 *   sourceId: number,  // Person to merge (will be deleted)
 *   targetId: number   // Person to keep (will receive merged data)
 * }
 *
 * Response:
 * {
 *   canMerge: boolean,
 *   validation: {
 *     errors: string[],
 *     warnings: string[],
 *     conflictFields: string[]
 *   },
 *   source: { id, firstName, lastName, ... },
 *   target: { id, firstName, lastName, ... },
 *   merged: { id, firstName, lastName, ... },
 *   comparison: { firstName: { source, target, merged }, ... },
 *   relationshipsToTransfer: Relationship[],
 *   existingRelationships: Relationship[]
 * }
 */
export async function POST({ request, locals, ...event }) {
  try {
    // Require authentication
    const { user } = await requireAuth({ locals, ...event })

    // Parse request body
    const { sourceId, targetId } = await request.json()

    // Validate request
    if (!sourceId || !targetId) {
      return new Response('sourceId and targetId are required', { status: 400 })
    }

    const db = locals.db

    // Fetch source person (with userId validation)
    const sourceResults = await db
      .select()
      .from(people)
      .where(and(eq(people.id, sourceId), eq(people.userId, user.id)))
      .limit(1)

    if (sourceResults.length === 0) {
      return new Response('Source person not found', { status: 404 })
    }

    const source = sourceResults[0]

    // Fetch target person (with userId validation)
    const targetResults = await db
      .select()
      .from(people)
      .where(and(eq(people.id, targetId), eq(people.userId, user.id)))
      .limit(1)

    if (targetResults.length === 0) {
      return new Response('Target person not found', { status: 404 })
    }

    const target = targetResults[0]

    // Fetch current user's full data (for defaultPersonId)
    const userResults = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    const currentUser = userResults[0]

    // Fetch all relationships for source person (with userId validation)
    const sourceRelationships = await db
      .select()
      .from(relationships)
      .where(
        and(
          or(
            eq(relationships.person1Id, sourceId),
            eq(relationships.person2Id, sourceId)
          ),
          eq(relationships.userId, user.id)
        )
      )

    // Fetch all relationships for target person (with userId validation)
    const targetRelationships = await db
      .select()
      .from(relationships)
      .where(
        and(
          or(
            eq(relationships.person1Id, targetId),
            eq(relationships.person2Id, targetId)
          ),
          eq(relationships.userId, user.id)
        )
      )

    // Generate merge preview
    const preview = generateMergePreview(
      source,
      target,
      currentUser,
      sourceRelationships,
      targetRelationships
    )

    return json(preview)
  } catch (error) {
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }
    console.error('POST /api/people/merge/preview error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
