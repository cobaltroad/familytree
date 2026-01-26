import { json } from '@sveltejs/kit'
import { db } from '$lib/db/client.js'
import { people } from '$lib/db/schema.js'
import { eq } from 'drizzle-orm'
import { parseId, transformPersonToAPI, validatePersonData } from '$lib/server/personHelpers.js'

/**
 * GET /api/people/[id]
 * Returns a single person by ID
 *
 * @param {Object} params - URL parameters containing id
 * @returns {Response} JSON of person or 404 if not found
 */
export async function GET({ params, locals }) {
  try {
    // Use locals.db if provided (for testing), otherwise use singleton db
    const database = locals?.db || db

    // Validate ID
    const personId = parseId(params.id)
    if (personId === null) {
      return new Response('Invalid ID', { status: 400 })
    }

    // Query person by ID
    const result = await database
      .select()
      .from(people)
      .where(eq(people.id, personId))
      .limit(1)

    // Check if person exists
    if (result.length === 0) {
      return new Response('Person not found', { status: 404 })
    }

    const person = result[0]

    // Transform to API format
    const transformedPerson = transformPersonToAPI(person)

    return json(transformedPerson)
  } catch (error) {
    console.error('Error fetching person:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

/**
 * PUT /api/people/[id]
 * Updates an existing person by ID
 *
 * @param {Object} params - URL parameters containing id
 * @param {Request} request - HTTP request with updated person data
 * @returns {Response} JSON of updated person or error
 */
export async function PUT({ params, request, locals }) {
  try {
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

    // Check if person exists
    const existing = await database
      .select()
      .from(people)
      .where(eq(people.id, personId))
      .limit(1)

    if (existing.length === 0) {
      return new Response('Person not found', { status: 404 })
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
      .where(eq(people.id, personId))
      .returning()

    const updatedPerson = result[0]

    // Transform to API format
    const transformedPerson = transformPersonToAPI(updatedPerson)

    return json(transformedPerson)
  } catch (error) {
    console.error('Error updating person:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

/**
 * DELETE /api/people/[id]
 * Deletes a person by ID
 * Cascade deletes relationships due to foreign key constraints
 *
 * @param {Object} params - URL parameters containing id
 * @returns {Response} 204 No Content on success, or error
 */
export async function DELETE({ params, locals }) {
  try {
    // Use locals.db if provided (for testing), otherwise use singleton db
    const database = locals?.db || db

    // Validate ID
    const personId = parseId(params.id)
    if (personId === null) {
      return new Response('Invalid ID', { status: 400 })
    }

    // Check if person exists
    const existing = await database
      .select()
      .from(people)
      .where(eq(people.id, personId))
      .limit(1)

    if (existing.length === 0) {
      return new Response('Person not found', { status: 404 })
    }

    // Delete person (relationships will cascade delete due to foreign key)
    await database
      .delete(people)
      .where(eq(people.id, personId))

    // Return 204 No Content (no body)
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting person:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
