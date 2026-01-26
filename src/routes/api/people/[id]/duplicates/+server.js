/**
 * GET /api/people/[id]/duplicates
 * Returns duplicate candidates for a specific person
 *
 * Story #108: Duplicate Detection Service (Foundation)
 *
 * Query Parameters:
 *   - threshold: Confidence threshold (0-100, default: 70)
 *   - limit: Maximum number of duplicate candidates to return (default: unlimited)
 *
 * @returns {Response} JSON array of potential duplicate persons with confidence scores
 */

import { json } from '@sveltejs/kit'
import { db } from '$lib/db/client.js'
import { people } from '$lib/db/schema.js'
import { eq } from 'drizzle-orm'
import { findDuplicatesForPerson } from '$lib/server/duplicateDetection.js'
import { transformPeopleToAPI, transformPersonToAPI } from '$lib/server/personHelpers.js'

export async function GET({ locals, url, params }) {
  try {
    // Use locals.db if provided (for testing), otherwise use singleton db
    const database = locals?.db || db

    // Parse person ID
    const personId = parseInt(params.id, 10)
    if (isNaN(personId)) {
      return new Response('Invalid person ID', { status: 400 })
    }

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

    // Find the target person
    const targetPersonResult = await database
      .select()
      .from(people)
      .where(eq(people.id, personId))

    if (targetPersonResult.length === 0) {
      return new Response('Person not found', { status: 404 })
    }

    const targetPerson = targetPersonResult[0]

    // Query all people
    const allPeople = await database
      .select()
      .from(people)

    // Transform to API format
    const transformedPeople = transformPeopleToAPI(allPeople)
    const transformedTarget = transformPersonToAPI(targetPerson)

    // Find duplicates for this specific person
    let duplicates = findDuplicatesForPerson(transformedTarget, transformedPeople, threshold)

    // Apply limit if specified
    if (limit !== null) {
      duplicates = duplicates.slice(0, limit)
    }

    return json(duplicates)
  } catch (error) {
    console.error('Error finding duplicates for person:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
