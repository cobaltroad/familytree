import { json } from '@sveltejs/kit'
import { db } from '$lib/db/client.js'
import { people } from '$lib/db/schema.js'
import { transformPeopleToAPI, validatePersonData, transformPersonToAPI } from '$lib/server/personHelpers.js'

/**
 * GET /api/people
 * Returns all people from the database
 *
 * @returns {Response} JSON array of all people
 */
export async function GET({ locals }) {
  try {
    // Use locals.db if provided (for testing), otherwise use singleton db
    const database = locals?.db || db

    // Query all people from database
    const allPeople = await database.select().from(people)

    // Transform to API format
    const transformedPeople = transformPeopleToAPI(allPeople)

    return json(transformedPeople)
  } catch (error) {
    console.error('Error fetching people:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

/**
 * POST /api/people
 * Creates a new person in the database
 *
 * @param {Request} request - HTTP request with person data in body
 * @returns {Response} JSON of created person with 201 status
 */
export async function POST({ request, locals }) {
  try {
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

    // Insert person into database
    const result = await database
      .insert(people)
      .values({
        firstName: data.firstName,
        lastName: data.lastName,
        birthDate: data.birthDate || null,
        deathDate: data.deathDate || null,
        gender: data.gender || null
      })
      .returning()

    const newPerson = result[0]

    // Transform to API format
    const transformedPerson = transformPersonToAPI(newPerson)

    return json(transformedPerson, { status: 201 })
  } catch (error) {
    console.error('Error creating person:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
