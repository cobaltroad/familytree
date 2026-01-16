import { json } from '@sveltejs/kit'
import { db } from '$lib/db/client.js'
import { users, people } from '$lib/db/schema.js'
import { eq } from 'drizzle-orm'
import { requireAuth } from '$lib/server/session.js'

/**
 * PATCH /api/user/default-person
 * Updates the authenticated user's default person ID
 *
 * Authentication: Required
 * Authorization: User can only update their own default person
 *
 * Request body:
 * {
 *   personId: number  // ID of person to set as default
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   personId: number
 * }
 *
 * Status codes:
 * - 200: Successfully updated default person
 * - 400: Invalid request (missing personId, invalid type, or invalid JSON)
 * - 401: Not authenticated
 * - 404: Person not found
 * - 500: Internal server error
 *
 * @param {Request} request - HTTP request with personId in body
 * @returns {Response} JSON response with success status and personId
 */
export async function PATCH({ request, locals, ...event }) {
  try {
    // Require authentication
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id

    // Use locals.db if provided (for testing), otherwise use singleton db
    const database = locals?.db || db

    // Parse request body
    let data
    try {
      data = await request.json()
    } catch (jsonError) {
      return new Response('Invalid JSON', { status: 400 })
    }

    const { personId } = data

    // Validate personId is provided
    if (personId === undefined || personId === null) {
      return new Response('personId is required', { status: 400 })
    }

    // Validate personId is a number
    if (typeof personId !== 'number' || !Number.isInteger(personId)) {
      return new Response('personId must be a number', { status: 400 })
    }

    // Verify person exists
    const personResult = await database
      .select()
      .from(people)
      .where(eq(people.id, personId))

    if (personResult.length === 0) {
      return new Response('Person not found', { status: 404 })
    }

    // Update user's default_person_id
    const result = await database
      .update(users)
      .set({
        defaultPersonId: personId
      })
      .where(eq(users.id, userId))
      .returning()

    if (result.length === 0) {
      return new Response('User not found', { status: 404 })
    }

    // Return success response
    return json({
      success: true,
      personId: personId
    })
  } catch (error) {
    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }

    console.error('Error updating default person:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
