/**
 * GEDCOM Preview Individuals API Endpoint
 * Story #94: Preview GEDCOM Data Before Import
 *
 * GET /api/gedcom/preview/:uploadId/individuals
 *
 * Returns paginated, sorted, and filtered individuals from preview data
 */

import { json } from '@sveltejs/kit'
import { getPreviewIndividuals } from '$lib/server/gedcomPreview.js'

/**
 * GET /api/gedcom/preview/:uploadId/individuals
 * Get paginated individuals from preview data
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 * - sortBy: Sort field (name, birthDate, deathDate)
 * - sortOrder: Sort direction (asc, desc)
 * - search: Filter by name (case-insensitive)
 *
 * @param {Object} params - Route parameters (uploadId)
 * @param {URL} url - Request URL with query parameters
 * @returns {Response} JSON with paginated individuals or error
 */
export async function GET({ params, url }) {
  try {
    const { uploadId } = params

    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const sortBy = url.searchParams.get('sortBy') || 'name'
    const sortOrder = url.searchParams.get('sortOrder') || 'asc'
    const search = url.searchParams.get('search') || ''

    // Get preview individuals
    const result = await getPreviewIndividuals(uploadId, {
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
    console.error('Error retrieving preview individuals:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
