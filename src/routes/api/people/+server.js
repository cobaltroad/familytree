import { json } from '@sveltejs/kit'
import { db } from '$lib/db/client.js'
import { people } from '$lib/db/schema.js'
import { eq } from 'drizzle-orm'
import { transformPeopleToAPI, validatePersonData, transformPersonToAPI } from '$lib/server/personHelpers.js'
import { requireAuth } from '$lib/server/session.js'

/**
 * GET /api/people
 * Returns all people from the database for the authenticated user
 *
 * Authentication: Required
 * Data Isolation: Only returns people belonging to the current user
 *
 * @returns {Response} JSON array of user's people
 */
export async function GET({ locals, ...event }) {
  try {
    // Require authentication (Issue #72)
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id

    // Use locals.db if provided (for testing), otherwise use singleton db
    const database = locals?.db || db

    // Query only people belonging to the current user (Issue #72: Data Isolation)
    const userPeople = await database
      .select()
      .from(people)
      .where(eq(people.userId, userId))

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
