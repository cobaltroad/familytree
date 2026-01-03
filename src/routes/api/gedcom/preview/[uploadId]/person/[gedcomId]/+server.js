/**
 * GEDCOM Preview Person Detail API Endpoint
 * Story #94: Preview GEDCOM Data Before Import
 *
 * GET /api/gedcom/preview/:uploadId/person/:gedcomId
 *
 * Returns detailed information about a specific person including relationships
 */

import { json } from '@sveltejs/kit'
import { requireAuth } from '$lib/server/session.js'
import { getPreviewPerson } from '$lib/server/gedcomPreview.js'

/**
 * GET /api/gedcom/preview/:uploadId/person/:gedcomId
 * Get person details with relationships from preview data
 *
 * Authentication: Required
 *
 * @param {Request} request - HTTP request
 * @param {Object} locals - SvelteKit locals (contains session)
 * @param {Object} params - Route parameters (uploadId, gedcomId)
 * @returns {Response} JSON with person details and relationships or error
 */
export async function GET({ request, locals, params, ...event }) {
  try {
    // Require authentication
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id

    const { uploadId, gedcomId } = params

    // Get person details
    const result = await getPreviewPerson(uploadId, userId, gedcomId)

    if (!result) {
      return new Response('Person not found', { status: 404 })
    }

    return json(result)
  } catch (error) {
    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }

    console.error('Error retrieving preview person:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
