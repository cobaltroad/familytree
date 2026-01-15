/**
 * POST /api/people/merge - Execute Person Merge
 * Story #110: Execute Person Merge with Relationship Transfer
 *
 * Merges two people records with atomic relationship transfer
 */

import { json } from '@sveltejs/kit'
import { executeMerge } from '$lib/server/personMerge.js'

/**
 * POST /api/people/merge
 *
 * Request body:
 * {
 *   sourceId: number,  // Person to merge (will be deleted)
 *   targetId: number   // Person to merge into (will receive data)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   targetId: number,
 *   sourceId: number,
 *   relationshipsTransferred: number,
 *   mergedData: { ... }
 * }
 *
 * Error responses:
 * - 401: Not authenticated
 * - 400: Invalid request (missing fields, same ID)
 * - 403: Forbidden (trying to merge default person)
 * - 404: Person not found
 * - 500: Server error
 */
export async function POST({ request, locals }) {
  try {
    // Check authentication
    const session = await locals.getSession()
    if (!session?.user) {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Parse request body
    const body = await request.json()
    const { sourceId, targetId } = body

    // Validate request
    if (!sourceId) {
      return json({ error: 'sourceId is required' }, { status: 400 })
    }

    if (!targetId) {
      return json({ error: 'targetId is required' }, { status: 400 })
    }

    if (sourceId === targetId) {
      return json({ error: 'Cannot merge person into themselves' }, { status: 400 })
    }

    // Execute merge
    const result = await executeMerge(sourceId, targetId, userId, locals.db)

    return json(result, { status: 200 })
  } catch (error) {
    console.error('Error merging people:', error)

    // Map error messages to appropriate status codes
    const errorMessage = error.message

    if (errorMessage.includes('not found')) {
      return json({ error: errorMessage }, { status: 404 })
    }

    if (errorMessage.includes('does not belong to') ||
        errorMessage.includes('Cannot merge')) {
      return json({ error: errorMessage }, { status: 403 })
    }

    // Generic server error
    return json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}
