import { json } from '@sveltejs/kit'
import { db } from '$lib/db/client.js'
import { people, users } from '$lib/db/schema.js'
import { eq, and } from 'drizzle-orm'
import { parseId, transformPersonToAPI, validatePersonData } from '$lib/server/personHelpers.js'
import { requireAuth } from '$lib/server/session.js'
import { verifyResourceOwnership } from '$lib/server/ownershipHelpers.js'

/**
 * GET /api/people/[id]
 * Returns a single person by ID (must belong to authenticated user)
 *
 * Authentication: Required
 * Ownership: User must own the person (403 if not)
 *
 * @param {Object} params - URL parameters containing id
 * @returns {Response} JSON of person or 404/403 if not found/forbidden
 */
export async function GET({ params, locals, ...event }) {
  try {
    // Require authentication (Issue #72)
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id

    // Use locals.db if provided (for testing), otherwise use singleton db
    const database = locals?.db || db

    // Validate ID
    const personId = parseId(params.id)
    if (personId === null) {
      return new Response('Invalid ID', { status: 400 })
    }

    // Query person by ID and user_id (Issue #72: Ownership Verification)
    const result = await database
      .select()
      .from(people)
      .where(and(eq(people.id, personId), eq(people.userId, userId)))
      .limit(1)

    // Check if person exists and belongs to user
    if (result.length === 0) {
      // Check if person exists at all (to differentiate 404 vs 403)
      const anyPerson = await database
        .select()
        .from(people)
        .where(eq(people.id, personId))
        .limit(1)

      if (anyPerson.length > 0) {
        // Person exists but doesn't belong to user
        return new Response('Forbidden: You do not have access to this person', { status: 403 })
      } else {
        // Person doesn't exist at all
        return new Response('Person not found', { status: 404 })
      }
    }

    const person = result[0]

    // Transform to API format
    const transformedPerson = transformPersonToAPI(person)

    return json(transformedPerson)
  } catch (error) {
    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }

    console.error('Error fetching person:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

/**
 * PUT /api/people/[id]
 * Updates an existing person by ID (must belong to authenticated user)
 *
 * Authentication: Required
 * Ownership: User must own the person (403 if not)
 *
 * @param {Object} params - URL parameters containing id
 * @param {Request} request - HTTP request with updated person data
 * @returns {Response} JSON of updated person or error
 */
export async function PUT({ params, request, locals, ...event }) {
  try {
    // Require authentication (Issue #72)
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id

    // Use locals.db if provided (for testing), otherwise use singleton db
    const database = locals?.db || db

    // Validate ID
    const personId = parseId(params.id)
    if (personId === null) {
      return new Response('Invalid ID', { status: 400 })
    }

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

    // Check if person exists and belongs to user (Issue #72: Ownership Verification)
    const existing = await database
      .select()
      .from(people)
      .where(and(eq(people.id, personId), eq(people.userId, userId)))
      .limit(1)

    if (existing.length === 0) {
      // Check if person exists at all (to differentiate 404 vs 403)
      const anyPerson = await database
        .select()
        .from(people)
        .where(eq(people.id, personId))
        .limit(1)

      if (anyPerson.length > 0) {
        // Person exists but doesn't belong to user
        return new Response('Forbidden: You do not have access to this person', { status: 403 })
      } else {
        // Person doesn't exist at all
        return new Response('Person not found', { status: 404 })
      }
    }

    // Update person
    // Story #77: Now includes photoUrl
    // Issue #121: Now includes birthSurname and nickname
    const updateData = {
      firstName: data.firstName,
      lastName: data.lastName,
      birthDate: data.birthDate !== undefined ? data.birthDate : null,
      deathDate: data.deathDate !== undefined ? data.deathDate : null,
      gender: data.gender !== undefined ? data.gender : null
    }

    // Only update photoUrl if it's explicitly provided in the request
    if (data.photoUrl !== undefined) {
      updateData.photoUrl = data.photoUrl
    }

    // Only update birthSurname if it's explicitly provided in the request (Issue #121)
    if (data.birthSurname !== undefined) {
      updateData.birthSurname = data.birthSurname
    }

    // Only update nickname if it's explicitly provided in the request (Issue #121)
    if (data.nickname !== undefined) {
      updateData.nickname = data.nickname
    }

    const result = await database
      .update(people)
      .set(updateData)
      .where(and(eq(people.id, personId), eq(people.userId, userId)))
      .returning()

    const updatedPerson = result[0]

    // Transform to API format
    const transformedPerson = transformPersonToAPI(updatedPerson)

    return json(transformedPerson)
  } catch (error) {
    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }

    console.error('Error updating person:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

/**
 * DELETE /api/people/[id]
 * Deletes a person by ID (must belong to authenticated user)
 * Cascade deletes relationships due to foreign key constraints
 *
 * Authentication: Required
 * Ownership: User must own the person (403 if not)
 * Story #83: BLOCKS deletion of user's own default person (403 Forbidden)
 *
 * @param {Object} params - URL parameters containing id
 * @returns {Response} 204 No Content on success, or error
 */
export async function DELETE({ params, locals, ...event }) {
  try {
    // Require authentication (Issue #72)
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id

    // Use locals.db if provided (for testing), otherwise use singleton db
    const database = locals?.db || db

    // Validate ID
    const personId = parseId(params.id)
    if (personId === null) {
      return new Response('Invalid ID', { status: 400 })
    }

    // Check if person exists and belongs to user (Issue #72: Ownership Verification)
    const existing = await database
      .select()
      .from(people)
      .where(and(eq(people.id, personId), eq(people.userId, userId)))
      .limit(1)

    if (existing.length === 0) {
      // Check if person exists at all (to differentiate 404 vs 403)
      const anyPerson = await database
        .select()
        .from(people)
        .where(eq(people.id, personId))
        .limit(1)

      if (anyPerson.length > 0) {
        // Person exists but doesn't belong to user
        return new Response('Forbidden: You do not have access to this person', { status: 403 })
      } else {
        // Person doesn't exist at all
        return new Response('Person not found', { status: 404 })
      }
    }

    // Story #83: Prevent deletion of user's own default person
    // Check if this person is the user's default person
    const [user] = await database
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (user && user.defaultPersonId === personId) {
      // HARD BLOCK: Cannot delete your own profile
      return new Response('Forbidden: Cannot delete your own profile. This is your default person in the family tree.', { status: 403 })
    }

    // Delete person (relationships will cascade delete due to foreign key)
    await database
      .delete(people)
      .where(and(eq(people.id, personId), eq(people.userId, userId)))

    // Return 204 No Content (no body)
    return new Response(null, { status: 204 })
  } catch (error) {
    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }

    console.error('Error deleting person:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
