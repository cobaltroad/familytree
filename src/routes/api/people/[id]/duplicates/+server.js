/**
 * GET /api/people/[id]/duplicates
 * Returns duplicate candidates for a specific person
 *
 * Story #108: Duplicate Detection Service (Foundation)
 *
 * Authentication: Required
 * Data Isolation: Behavior depends on view_all_records flag:
 *   - When false (default): Only searches for duplicates within current user's records
 *   - When true: Searches for duplicates across ALL users' records (for debugging/admin)
 *
 * Query Parameters:
 *   - threshold: Confidence threshold (0-100, default: 70)
 *   - limit: Maximum number of duplicate candidates to return (default: unlimited)
 *
 * @returns {Response} JSON array of potential duplicate persons with confidence scores
 */

import { json } from '@sveltejs/kit'
import { db } from '$lib/db/client.js'
import { people, users } from '$lib/db/schema.js'
import { eq } from 'drizzle-orm'
import { requireAuth } from '$lib/server/session.js'
import { findDuplicatesForPerson } from '$lib/server/duplicateDetection.js'
import { transformPeopleToAPI, transformPersonToAPI } from '$lib/server/personHelpers.js'

export async function GET({ locals, url, params, ...event }) {
  try {
    // Require authentication
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id

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

    // Find the target person
    const targetPersonResult = await database
      .select()
      .from(people)
      .where(eq(people.id, personId))

    if (targetPersonResult.length === 0) {
      return new Response('Person not found', { status: 404 })
    }

    const targetPerson = targetPersonResult[0]

    // Enforce data isolation: user can only access their own people
    if (!viewAllRecords && targetPerson.userId !== userId) {
      return new Response('Person not found', { status: 404 })
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
    const transformedTarget = transformPersonToAPI(targetPerson)

    // Find duplicates for this specific person
    let duplicates = findDuplicatesForPerson(transformedTarget, transformedPeople, threshold)

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

    console.error('Error finding duplicates for person:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
