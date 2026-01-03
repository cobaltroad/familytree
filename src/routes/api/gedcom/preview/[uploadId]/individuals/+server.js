/**
 * GEDCOM Preview Individuals API Endpoint
 * Story #94: Preview GEDCOM Data Before Import
 *
 * GET /api/gedcom/preview/:uploadId/individuals
 *
 * Returns paginated, sorted, and filtered individuals from preview data
 */

import { json } from '@sveltejs/kit'
import { requireAuth } from '$lib/server/session.js'
import { getPreviewIndividuals } from '$lib/server/gedcomPreview.js'

/**
 * GET /api/gedcom/preview/:uploadId/individuals
 * Get paginated individuals from preview data
 *
 * Authentication: Required
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 * - sortBy: Sort field (name, birthDate, deathDate)
 * - sortOrder: Sort direction (asc, desc)
 * - search: Filter by name (case-insensitive)
 *
 * @param {Request} request - HTTP request
 * @param {Object} locals - SvelteKit locals (contains session)
 * @param {Object} params - Route parameters (uploadId)
 * @param {URL} url - Request URL with query parameters
 * @returns {Response} JSON with paginated individuals or error
 */
export async function GET({ request, locals, params, url, ...event }) {
  try {
    // Require authentication
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id

    const { uploadId } = params

    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const sortBy = url.searchParams.get('sortBy') || 'name'
    const sortOrder = url.searchParams.get('sortOrder') || 'asc'
    const search = url.searchParams.get('search') || ''

    // Get preview individuals
    const result = await getPreviewIndividuals(uploadId, userId, {
      page,
      limit,
      sortBy,
      sortOrder,
      search
    })

    if (!result) {
      return new Response('Preview data not found', { status: 404 })
    }

    return json(result)
  } catch (error) {
    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }

    console.error('Error retrieving preview individuals:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
