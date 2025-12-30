import { json } from '@sveltejs/kit'
import { db } from '$lib/db/client.js'
import { users } from '$lib/db/schema.js'
import { eq } from 'drizzle-orm'
import { requireAuth } from '$lib/server/session.js'

/**
 * GET /api/user/settings
 * Returns current user's settings
 *
 * Authentication: Required
 *
 * @returns {Response} JSON of current user's settings
 */
export async function GET({ locals, ...event }) {
  try {
    // Require authentication
    const session = await requireAuth({ locals, ...event })
    const userId = session.user.id

    // Use locals.db if provided (for testing), otherwise use singleton db
    const database = locals?.db || db

    // Get user settings
    const result = await database
      .select()
      .from(users)
      .where(eq(users.id, userId))

    if (result.length === 0) {
      return new Response('User not found', { status: 404 })
    }

    const user = result[0]

    // Return settings
    return json({
      viewAllRecords: user.viewAllRecords
    })
  } catch (error) {
    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }

    console.error('Error fetching user settings:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

/**
 * PATCH /api/user/settings
 * Updates current user's settings
 *
 * Authentication: Required
 * Authorization: User can only update their own settings
 *
 * Request body:
 * {
 *   viewAllRecords: boolean  // Feature flag to bypass data isolation
 * }
 *
 * @param {Request} request - HTTP request with settings data in body
 * @returns {Response} JSON of updated settings with 200 status
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

    // Validate required fields
    if (typeof data.viewAllRecords !== 'boolean') {
      return new Response('viewAllRecords must be a boolean', { status: 400 })
    }

    // Update user settings
    const result = await database
      .update(users)
      .set({
        viewAllRecords: data.viewAllRecords
      })
      .where(eq(users.id, userId))
      .returning()

    if (result.length === 0) {
      return new Response('User not found', { status: 404 })
    }

    const updatedUser = result[0]

    // Return updated settings
    return json({
      viewAllRecords: updatedUser.viewAllRecords
    })
  } catch (error) {
    // Handle authentication errors
    if (error.name === 'AuthenticationError') {
      return new Response(error.message, { status: error.status })
    }

    console.error('Error updating user settings:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
