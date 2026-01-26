/**
 * GEDCOM Preview Tree API Endpoint
 * Story #94: Preview GEDCOM Data Before Import
 *
 * GET /api/gedcom/preview/:uploadId/tree
 *
 * Returns tree structure with individuals and relationships from GEDCOM data
 */

import { json } from '@sveltejs/kit'
import { getPreviewTree } from '$lib/server/gedcomPreview.js'

/**
 * GET /api/gedcom/preview/:uploadId/tree
 * Get tree structure from preview data
 *
 * @param {Object} params - Route parameters (uploadId)
 * @returns {Response} JSON with tree structure or error
 */
export async function GET({ params }) {
  try {
    const { uploadId } = params

    // Get tree structure
    const result = await getPreviewTree(uploadId)

    if (!result) {
      return new Response('Preview data not found', { status: 404 })
    }

    return json(result)
  } catch (error) {
    console.error('Error retrieving preview tree:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
