/**
 * GEDCOM Parse Status API Endpoint
 * Story #103: GEDCOM Parsing Results Display
 *
 * GET /api/gedcom/parse/:uploadId/status
 *
 * Returns the current parsing status for a GEDCOM file upload.
 * Used for polling progress during large file parsing.
 *
 * Note: This is a simplified implementation that returns 'complete' status
 * immediately since parsing happens synchronously. In a production system
 * with async parsing, this would return actual progress information.
 */

import { json } from '@sveltejs/kit'
import { requireAuth } from '$lib/server/session.js'
import { getTempFileInfo } from '$lib/server/gedcomStorage.js'

/**
 * GET /api/gedcom/parse/:uploadId/status
 * Get parsing status for an uploaded GEDCOM file
 *
 * Authentication: Required
 *
 * @param {Request} request - HTTP request
 * @param {Object} locals - SvelteKit locals (contains session)
 * @param {Object} params - Route parameters (uploadId)
 * @returns {Response} JSON with status information
 */
export async function GET({ request, locals, params, ...event }) {
  try {
    // Require authentication
    await requireAuth({ locals, ...event })

    const { uploadId } = params

    // Check if upload exists
    const fileInfo = await getTempFileInfo(uploadId)

    if (!fileInfo.exists) {
      return new Response('Upload not found', { status: 404 })
    }

    // Return complete status
    // Note: In a real async parsing system, this would return:
    // { status: 'parsing', progress: 45 } or { status: 'complete' }
    return json({
      status: 'complete',
      uploadId
    })
  } catch (error) {
    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }

    console.error('Error getting parse status:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
