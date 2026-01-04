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
  console.log('[GEDCOM Parse API] POST request received')
  console.log('[GEDCOM Parse API] params:', params)

  try {
    // Require authentication
    console.log('[GEDCOM Parse API] Checking authentication')
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id
    console.log('[GEDCOM Parse API] User authenticated, userId:', userId)

    const { uploadId } = params
    console.log('[GEDCOM Parse API] Upload ID:', uploadId)

    // Get uploaded file info
    console.log('[GEDCOM Parse API] Getting temp file info for uploadId:', uploadId)
    const fileInfo = await getTempFileInfo(uploadId)
    console.log('[GEDCOM Parse API] File info:', fileInfo)

    if (!fileInfo.exists) {
      console.error('[GEDCOM Parse API] Upload not found:', uploadId)
      return new Response('Upload not found', { status: 404 })
    }

    // Read file content
    console.log('[GEDCOM Parse API] Reading file content from:', fileInfo.filePath)
    const content = await fs.readFile(fileInfo.filePath, 'utf8')
    console.log('[GEDCOM Parse API] File content read, length:', content.length)

    // Parse GEDCOM file
    console.log('[GEDCOM Parse API] Calling parseGedcom')
    const parsed = await parseGedcom(content)
    console.log('[GEDCOM Parse API] Parse result:', {
      success: parsed.success,
      version: parsed.version,
      individualsCount: parsed.individuals?.length,
      familiesCount: parsed.families?.length,
      errorsCount: parsed.errors?.length
    })

    if (!parsed.success) {
      console.error('[GEDCOM Parse API] Parsing failed:', parsed.error)
      return new Response(parsed.error, { status: 400 })
    }

    // Extract statistics
    console.log('[GEDCOM Parse API] Extracting statistics')
    const statistics = extractStatistics(parsed)
    console.log('[GEDCOM Parse API] Statistics:', statistics)

    // Get existing people from database for duplicate detection
    console.log('[GEDCOM Parse API] Fetching existing people for user:', userId)
    const existingPeople = await db
      .select()
      .from(people)
      .where(eq(people.userId, userId))
    console.log('[GEDCOM Parse API] Existing people count:', existingPeople.length)

    // Find duplicates
    console.log('[GEDCOM Parse API] Finding duplicates')
    const duplicates = findDuplicates(parsed.individuals, existingPeople)
    console.log('[GEDCOM Parse API] Duplicates found:', duplicates.length)

    // Validate relationship consistency
    console.log('[GEDCOM Parse API] Validating relationship consistency')
    const { validateRelationshipConsistency } = await import('$lib/server/gedcomParser.js')
    const relationshipIssues = validateRelationshipConsistency(parsed)
    console.log('[GEDCOM Parse API] Relationship issues found:', relationshipIssues.length)

    // Store preview data for later use (Story #94)
    // This is a best-effort attempt - don't fail if storage fails
    try {
      console.log('[GEDCOM Parse API] Storing preview data')
      await storePreviewData(uploadId, userId, parsed, duplicates)
      console.log('[GEDCOM Parse API] Preview data stored successfully')
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
    console.log('[GEDCOM Parse API] Returning response:', {
      uploadId: response.uploadId,
      version: response.version,
      statisticsKeys: Object.keys(response.statistics),
      errorsCount: response.errors.length,
      duplicatesCount: response.duplicates.length,
      relationshipIssuesCount: response.relationshipIssues.length
    })
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
