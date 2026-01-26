/**
 * GEDCOM Preview Person Detail API Endpoint
 * Story #94: Preview GEDCOM Data Before Import
 *
 * GET /api/gedcom/preview/:uploadId/person/:gedcomId
 *
 * Returns detailed information about a specific person including relationships
 */

import { json } from '@sveltejs/kit'
import { getPreviewPerson } from '$lib/server/gedcomPreview.js'

/**
 * GET /api/gedcom/preview/:uploadId/person/:gedcomId
 * Get person details with relationships from preview data
 *
 * @param {Object} params - Route parameters (uploadId, gedcomId)
 * @returns {Response} JSON with person details and relationships or error
 */
export async function GET({ params }) {
  try {
    const { uploadId, gedcomId } = params

    // Get person details
    const result = await getPreviewPerson(uploadId, gedcomId)

    if (!result) {
      return new Response('Person not found', { status: 404 })
    }

    return json(result)
  } catch (error) {
    console.error('Error retrieving preview person:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
