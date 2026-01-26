/**
 * GET /api/people/duplicates
 * Returns all duplicate pairs within the people records
 *
 * Story #108: Duplicate Detection Service (Foundation)
 *
 * Query Parameters:
 *   - threshold: Confidence threshold (0-100, default: 70)
 *   - limit: Maximum number of duplicate pairs to return (default: unlimited)
 *
 * @returns {Response} JSON array of duplicate pairs with confidence scores
 */

import { json } from '@sveltejs/kit'
import { db } from '$lib/db/client.js'
import { people } from '$lib/db/schema.js'
import { findAllDuplicates } from '$lib/server/duplicateDetection.js'
import { transformPeopleToAPI } from '$lib/server/personHelpers.js'

export async function GET({ locals, url }) {
  try {
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

    // Query all people
    const allPeople = await database
      .select()
      .from(people)

    // Transform to API format
    const transformedPeople = transformPeopleToAPI(allPeople)

    // Find all duplicate pairs
    let duplicates = findAllDuplicates(transformedPeople, threshold)

    // Apply limit if specified
    if (limit !== null) {
      duplicates = duplicates.slice(0, limit)
    }

    return json(duplicates)
  } catch (error) {
    console.error('Error finding duplicates:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
