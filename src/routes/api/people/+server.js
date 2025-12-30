import { json } from '@sveltejs/kit'
import { db } from '$lib/db/client.js'
import { people, users } from '$lib/db/schema.js'
import { eq } from 'drizzle-orm'
import { transformPeopleToAPI, validatePersonData, transformPersonToAPI } from '$lib/server/personHelpers.js'
import { requireAuth } from '$lib/server/session.js'

/**
 * GET /api/people
 * Returns people from the database for the authenticated user
 *
 * Authentication: Required
 * Data Isolation: Behavior depends on view_all_records flag:
 *   - When false (default): Only returns people belonging to current user
 *   - When true: Returns ALL people from all users (for debugging/admin)
 *
 * @returns {Response} JSON array of people
 */
export async function GET({ locals, ...event }) {
  try {
    // Require authentication (Issue #72)
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id

    // Use locals.db if provided (for testing), otherwise use singleton db
    const database = locals?.db || db

    // Check user's view_all_records flag (with fallback for tests without users table)
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

    // Query based on flag
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

    return json(transformedPeople)
  } catch (error) {
    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }

    console.error('Error fetching people:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

/**
 * POST /api/people
 * Creates a new person in the database for the authenticated user
 *
 * Authentication: Required
 * Data Association: Automatically assigns person to current user
 *
 * @param {Request} request - HTTP request with person data in body
 * @returns {Response} JSON of created person with 201 status
 */
export async function POST({ request, locals, ...event }) {
  try {
    // Require authentication (Issue #72)
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id

    // Use locals.db if provided (for testing), otherwise use singleton db
    const database = locals?.db || db

    // Parse request body
    let data
    try {
      data = await request.json()
    } catch (jsonError) {
      // Handle JSON parsing errors
      return new Response('Invalid JSON', { status: 400 })
    }

    // Validate required fields
    const validation = validatePersonData(data)
    if (!validation.valid) {
      return new Response(validation.error, { status: 400 })
    }

    // Insert person into database with user_id (Issue #72: Data Association)
    // Story #77: Now includes photoUrl
    const result = await database
      .insert(people)
      .values({
        firstName: data.firstName,
        lastName: data.lastName,
        birthDate: data.birthDate || null,
        deathDate: data.deathDate || null,
        gender: data.gender || null,
        photoUrl: data.photoUrl || null,
        userId: userId
      })
      .returning()

    const newPerson = result[0]

    // Transform to API format
    const transformedPerson = transformPersonToAPI(newPerson)

    return json(transformedPerson, { status: 201 })
  } catch (error) {
    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }

    console.error('Error creating person:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
