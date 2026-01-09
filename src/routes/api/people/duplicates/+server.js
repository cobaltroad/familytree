/**
 * GET /api/people/duplicates
 * Returns all duplicate pairs within the authenticated user's people records
 *
 * Story #108: Duplicate Detection Service (Foundation)
 *
 * Authentication: Required
 * Data Isolation: Behavior depends on view_all_records flag:
 *   - When false (default): Only detects duplicates within current user's records
 *   - When true: Detects duplicates across ALL users' records (for debugging/admin)
 *
 * Query Parameters:
 *   - threshold: Confidence threshold (0-100, default: 70)
 *   - limit: Maximum number of duplicate pairs to return (default: unlimited)
 *
 * @returns {Response} JSON array of duplicate pairs with confidence scores
 */

import { json } from '@sveltejs/kit'
import { db } from '$lib/db/client.js'
import { people, users } from '$lib/db/schema.js'
import { eq } from 'drizzle-orm'
import { requireAuth } from '$lib/server/session.js'
import { findAllDuplicates } from '$lib/server/duplicateDetection.js'
import { transformPeopleToAPI } from '$lib/server/personHelpers.js'

export async function GET({ locals, url, ...event }) {
  try {
    // Require authentication
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id

    // Use locals.db if provided (for testing), otherwise use singleton db
    const database = locals?.db || db

    // Parse query parameters
    const thresholdParam = url?.searchParams?.get('threshold')
    const threshold = thresholdParam ? parseInt(thresholdParam, 10) : 70

    const limitParam = url?.searchParams?.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : null

    // Validate threshold
    if (isNaN(threshold) || threshold < 0 || threshold > 100) {
      return new Response('Invalid threshold parameter (must be 0-100)', { status: 400 })
    }

    // Validate limit
    if (limit !== null && (isNaN(limit) || limit < 1)) {
      return new Response('Invalid limit parameter (must be positive integer)', { status: 400 })
    }

    // Check user's view_all_records flag
    let viewAllRecords = false
    try {
      const currentUserResult = await database
        .select()
        .from(users)
        .where(eq(users.id, userId))

      if (currentUserResult.length > 0) {
        viewAllRecords = currentUserResult[0].viewAllRecords || false
      }
    } catch (error) {
      // If users table doesn't exist (e.g., in some tests), default to false
      viewAllRecords = false
    }

    // Query people based on flag
    let userPeople
    if (viewAllRecords) {
      // View ALL records from all users (bypassing data isolation)
      userPeople = await database
        .select()
        .from(people)
    } else {
      // View only own records (default behavior - data isolation)
      userPeople = await database
        .select()
        .from(people)
        .where(eq(people.userId, userId))
    }

    // Transform to API format
    const transformedPeople = transformPeopleToAPI(userPeople)

    // Find all duplicate pairs
    let duplicates = findAllDuplicates(transformedPeople, threshold)

    // Apply limit if specified
    if (limit !== null) {
      duplicates = duplicates.slice(0, limit)
    }

    return json(duplicates)
  } catch (error) {
    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }

    console.error('Error finding duplicates:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
