/**
 * GEDCOM Preview Tree API Endpoint
 * Story #94: Preview GEDCOM Data Before Import
 *
 * GET /api/gedcom/preview/:uploadId/tree
 *
 * Returns tree structure with individuals and relationships from GEDCOM data
 */

import { json } from '@sveltejs/kit'
import { requireAuth } from '$lib/server/session.js'
import { getPreviewTree } from '$lib/server/gedcomPreview.js'

/**
 * GET /api/gedcom/preview/:uploadId/tree
 * Get tree structure from preview data
 *
 * Authentication: Required
 *
 * @param {Request} request - HTTP request
 * @param {Object} locals - SvelteKit locals (contains session)
 * @param {Object} params - Route parameters (uploadId)
 * @returns {Response} JSON with tree structure or error
 */
export async function GET({ request, locals, params, ...event }) {
  try {
    // Require authentication
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id

    const { uploadId } = params

    // Get tree structure
    const result = await getPreviewTree(uploadId, userId)

    if (!result) {
      return new Response('Preview data not found', { status: 404 })
    }

    return json(result)
  } catch (error) {
    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }

    console.error('Error retrieving preview tree:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
