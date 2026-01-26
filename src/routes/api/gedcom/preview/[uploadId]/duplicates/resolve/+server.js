/**
 * GEDCOM Preview Duplicate Resolution API Endpoint
 * Story #94: Preview GEDCOM Data Before Import
 *
 * POST /api/gedcom/preview/:uploadId/duplicates/resolve
 *
 * Saves resolution decisions for duplicate individuals
 */

import { json } from '@sveltejs/kit'
import { saveResolutionDecisions } from '$lib/server/gedcomPreview.js'

/**
 * POST /api/gedcom/preview/:uploadId/duplicates/resolve
 * Save resolution decisions for duplicates
 *
 * Request Body:
 * {
 *   decisions: [
 *     { gedcomId: string, resolution: 'merge' | 'import_as_new' | 'skip' }
 *   ]
 * }
 *
 * @param {Request} request - HTTP request
 * @param {Object} params - Route parameters (uploadId)
 * @returns {Response} JSON with success status or error
 */
export async function POST({ request, params }) {
  try {
    const { uploadId } = params

    // Parse request body
    const body = await request.json()
    const { decisions } = body

    // Validate request
    if (!decisions || !Array.isArray(decisions)) {
      return new Response('Missing or invalid decisions array', { status: 400 })
    }

    // Save resolution decisions
    const result = await saveResolutionDecisions(uploadId, decisions)

    return json(result)
  } catch (error) {
    // Handle validation errors
    if (error.message.includes('Invalid resolution') || error.message.includes('not found')) {
      return new Response(error.message, { status: error.message.includes('not found') ? 404 : 400 })
    }

    console.error('Error saving resolution decisions:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
