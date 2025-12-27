/**
 * Facebook Profile Import API Endpoint
 * Stories #78 and #80: Facebook Profile Picture Import and Data Pre-population
 *
 * POST /api/facebook/profile
 *
 * Fetches public profile data from Facebook Graph API for any user
 * and returns it in a format ready for Person record creation.
 *
 * Request body:
 * {
 *   facebookUrl: string // Facebook profile URL, user ID, or username
 * }
 *
 * Response (200):
 * {
 *   personData: {
 *     firstName: string,
 *     lastName: string,
 *     birthDate: string | null, // YYYY-MM-DD format
 *     gender: string | null, // 'male', 'female', 'other'
 *     photoUrl: string | null
 *   }
 * }
 *
 * Error responses:
 * - 401: Not authenticated
 * - 400: Invalid request
 * - 404: Facebook user not found
 * - 500: Server error
 *
 * Security:
 * - Requires authenticated user session
 * - Uses Facebook app access token (server-side only)
 * - Does not expose Facebook API credentials to client
 */

import { json } from '@sveltejs/kit'
import { parseFacebookProfileUrl } from '$lib/server/facebookProfileParser.js'
import { fetchFacebookUserProfile, extractPersonDataFromProfile } from '$lib/server/facebookGraphClient.js'
import { getAuthConfig } from '$lib/server/config.js'

/**
 * POST handler for Facebook profile import
 *
 * @param {Object} event - SvelteKit request event
 * @returns {Promise<Response>} JSON response with person data or error
 */
export async function POST(event) {
  try {
    // Check authentication
    const session = await event.locals.getSession()

    if (!session || !session.user) {
      return json({ error: 'Authentication required' }, { status: 401 })
    }

    // Parse request body
    let requestData
    try {
      requestData = await event.request.json()
    } catch (error) {
      return json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { facebookUrl } = requestData

    // Validate input
    if (!facebookUrl || typeof facebookUrl !== 'string' || facebookUrl.trim() === '') {
      return json({ error: 'facebookUrl must be a valid string' }, { status: 400 })
    }

    // Extract user ID or username from URL
    const userIdentifier = parseFacebookProfileUrl(facebookUrl)

    if (!userIdentifier) {
      return json(
        { error: 'Invalid Facebook profile URL. Please provide a valid Facebook profile URL, user ID, or username.' },
        { status: 400 }
      )
    }

    // Get Facebook app access token
    // For public profile data, we can use an app access token
    // Format: {app-id}|{app-secret}
    const config = getAuthConfig()
    const appAccessToken = `${config.facebook.appId}|${config.facebook.appSecret}`

    // Fetch Facebook profile
    let facebookProfile
    try {
      facebookProfile = await fetchFacebookUserProfile(appAccessToken, userIdentifier)
    } catch (error) {
      // Handle specific Facebook API errors
      if (error.message.includes('404')) {
        return json(
          { error: 'Facebook user not found. The profile may not exist or may have been deleted.' },
          { status: 404 }
        )
      }

      if (error.message.includes('403') || error.message.includes('permission')) {
        return json(
          { error: 'Permission denied. The profile may be private or restricted.' },
          { status: 403 }
        )
      }

      // Generic error
      return json(
        { error: `Failed to fetch Facebook profile: ${error.message}` },
        { status: 500 }
      )
    }

    // Extract person data from Facebook profile
    const personData = extractPersonDataFromProfile(facebookProfile)

    // Return person data
    return json({ personData }, { status: 200 })
  } catch (error) {
    // Catch-all error handler
    console.error('Error in POST /api/facebook/profile:', error)
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
