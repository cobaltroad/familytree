/**
 * Merge Preview API Endpoint
 * Story #109: Merge Preview and Validation
 *
 * POST /api/people/merge/preview - Preview merging two people
 */

import { json } from '@sveltejs/kit'
import { eq, or } from 'drizzle-orm'
import { db } from '$lib/db/client.js'
import { people, relationships } from '$lib/db/schema.js'
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
export async function POST({ request, locals }) {
  try {
    // Parse request body
    const { sourceId, targetId } = await request.json()

    // Validate request
    if (!sourceId || !targetId) {
      return new Response('sourceId and targetId are required', { status: 400 })
    }

    // Use locals.db if provided (for testing), otherwise use singleton db
    const database = locals?.db || db

    // Fetch source person
    const sourceResults = await database
      .select()
      .from(people)
      .where(eq(people.id, sourceId))
      .limit(1)

    if (sourceResults.length === 0) {
      return new Response('Source person not found', { status: 404 })
    }

    const source = sourceResults[0]

    // Fetch target person
    const targetResults = await database
      .select()
      .from(people)
      .where(eq(people.id, targetId))
      .limit(1)

    if (targetResults.length === 0) {
      return new Response('Target person not found', { status: 404 })
    }

    const target = targetResults[0]

    // Fetch all relationships for source person
    const sourceRelationships = await database
      .select()
      .from(relationships)
      .where(
        or(
          eq(relationships.person1Id, sourceId),
          eq(relationships.person2Id, sourceId)
        )
      )

    // Fetch all relationships for target person
    const targetRelationships = await database
      .select()
      .from(relationships)
      .where(
        or(
          eq(relationships.person1Id, targetId),
          eq(relationships.person2Id, targetId)
        )
      )

    // Generate merge preview (pass null for currentUser since no auth)
    const preview = generateMergePreview(
      source,
      target,
      null, // No user context needed
      sourceRelationships,
      targetRelationships
    )

    return json(preview)
  } catch (error) {
    console.error('POST /api/people/merge/preview error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
