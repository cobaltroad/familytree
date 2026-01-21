/**
 * GEDCOM Parse API Endpoint
 * Story #93: GEDCOM File Parsing and Validation
 *
 * POST /api/gedcom/parse/:uploadId
 *
 * Parses an uploaded GEDCOM file and returns:
 * - Parsing statistics (individuals, families, date range)
 * - Validation errors
 * - Duplicate detection results
 * - Relationship consistency issues
 */

import { json } from '@sveltejs/kit'
import { requireAuth } from '$lib/server/session.js'
import { getTempFileInfo } from '$lib/server/gedcomStorage.js'
import { parseGedcom, extractStatistics } from '$lib/server/gedcomParser.js'
import { findDuplicates } from '$lib/server/duplicateDetection.js'
import { storePreviewData } from '$lib/server/gedcomPreview.js'
import { promises as fs } from 'fs'
import { db } from '$lib/db/client.js'
import { people } from '$lib/db/schema.js'
import { eq } from 'drizzle-orm'

/**
 * POST /api/gedcom/parse/:uploadId
 * Parse a GEDCOM file and return validation results
 *
 * Authentication: Required
 *
 * @param {Request} request - HTTP request
 * @param {Object} locals - SvelteKit locals (contains session)
 * @param {Object} params - Route parameters (uploadId)
 * @returns {Response} JSON with parsing results or error
 */
export async function POST({ request, locals, params, ...event }) {

  try {
    // Require authentication
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id

    const { uploadId } = params

    // Get uploaded file info
    const fileInfo = await getTempFileInfo(uploadId)

    if (!fileInfo.exists) {
      console.error('[GEDCOM Parse API] Upload not found:', uploadId)
      return new Response('Upload not found', { status: 404 })
    }

    // Read file content
    const content = await fs.readFile(fileInfo.filePath, 'utf8')

    // Parse GEDCOM file
    const parsed = await parseGedcom(content)

    if (!parsed.success) {
      console.error('[GEDCOM Parse API] Parsing failed:', parsed.error)
      return new Response(parsed.error, { status: 400 })
    }

    // Extract statistics
    const statistics = extractStatistics(parsed)

    // Get existing people from database for duplicate detection
    const existingPeople = await db
      .select()
      .from(people)
      .where(eq(people.userId, userId))

    // Find duplicates
    const duplicates = findDuplicates(parsed.individuals, existingPeople)

    // Validate relationship consistency
    const { validateRelationshipConsistency } = await import('$lib/server/gedcomParser.js')
    const relationshipIssues = validateRelationshipConsistency(parsed)

    // Store preview data for later use (Story #94)
    // This is a best-effort attempt - don't fail if storage fails
    try {
      await storePreviewData(uploadId, userId, parsed, duplicates)
    } catch (storageError) {
      console.warn('[GEDCOM Parse API] Failed to store preview data:', storageError)
    }

    // Return results
    const response = {
      uploadId,
      version: parsed.version,
      statistics,
      errors: parsed.errors || [],
      duplicates,
      relationshipIssues
    }
    return json(response)
  } catch (error) {
    console.error('[GEDCOM Parse API] Error caught in main try-catch:', error)
    console.error('[GEDCOM Parse API] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })

    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      console.error('[GEDCOM Parse API] Authentication error:', error.message)
      return new Response(error.message, { status: error.status })
    }

    console.error('[GEDCOM Parse API] Returning 500 Internal Server Error')
    return new Response('Internal Server Error', { status: 500 })
  }
}
