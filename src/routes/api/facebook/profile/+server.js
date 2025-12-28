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

/**
 * POST handler for Facebook profile import
 *
 * @param {Object} event - SvelteKit request event
 * @returns {Promise<Response>} JSON response with person data or error
 */
export async function POST(event) {
  console.log('[FB-IMPORT] API Endpoint: POST /api/facebook/profile received')

  try {
    // Check authentication
    const session = await event.locals.getSession()
    console.log('[FB-IMPORT] API Endpoint: Session retrieved:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userName: session?.user?.name
    })

    if (!session || !session.user) {
      console.error('[FB-IMPORT] API Endpoint: No session or user')
      return json({ error: 'Authentication required' }, { status: 401 })
    }

    // Parse request body
    let requestData
    try {
      requestData = await event.request.json()
      console.log('[FB-IMPORT] API Endpoint: Request body parsed:', requestData)
    } catch (error) {
      console.error('[FB-IMPORT] API Endpoint: Failed to parse request body:', error)
      return json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { facebookUrl } = requestData
    console.log('[FB-IMPORT] API Endpoint: Facebook URL from request:', facebookUrl)

    // Validate input
    if (!facebookUrl || typeof facebookUrl !== 'string' || facebookUrl.trim() === '') {
      console.error('[FB-IMPORT] API Endpoint: Invalid facebookUrl:', { facebookUrl, type: typeof facebookUrl })
      return json({ error: 'facebookUrl must be a valid string' }, { status: 400 })
    }

    // Extract user ID or username from URL
    console.log('[FB-IMPORT] API Endpoint: Parsing Facebook URL...')
    const userIdentifier = parseFacebookProfileUrl(facebookUrl)
    console.log('[FB-IMPORT] API Endpoint: Parsed user identifier:', userIdentifier)

    if (!userIdentifier) {
      console.error('[FB-IMPORT] API Endpoint: Failed to parse user identifier from URL')
      return json(
        { error: 'Invalid Facebook profile URL. Please provide a valid Facebook profile URL, user ID, or username.' },
        { status: 400 }
      )
    }

    // Get user's OAuth access token from session
    // The user must be authenticated via Facebook OAuth to use this endpoint
    // We use their access token to make Graph API calls on their behalf
    const userAccessToken = session.user.accessToken
    console.log('[FB-IMPORT] API Endpoint: Access token check:', {
      hasAccessToken: !!userAccessToken,
      tokenPrefix: userAccessToken ? userAccessToken.substring(0, 10) + '...' : 'N/A',
      tokenLength: userAccessToken ? userAccessToken.length : 0
    })

    if (!userAccessToken) {
      console.error('[FB-IMPORT] API Endpoint: No access token in session')
      return json(
        { error: 'Facebook authentication required. Please sign in with Facebook to import profiles.' },
        { status: 401 }
      )
    }

    // Fetch Facebook profile
    console.log('[FB-IMPORT] API Endpoint: Calling fetchFacebookUserProfile...')
    let facebookProfile
    try {
      facebookProfile = await fetchFacebookUserProfile(userAccessToken, userIdentifier)
      console.log('[FB-IMPORT] API Endpoint: Facebook profile fetched successfully:', facebookProfile)
    } catch (error) {
      console.error('[FB-IMPORT] API Endpoint: Error fetching Facebook profile:', error)
      console.error('[FB-IMPORT] API Endpoint: Error message:', error.message)
      console.error('[FB-IMPORT] API Endpoint: Error stack:', error.stack)

      // Handle specific error messages from facebookGraphClient
      if (error.message.includes('Facebook profile not found or inaccessible')) {
        return json(
          {
            error: 'Facebook profile not found or inaccessible. The username may not exist, may have been changed, or the profile privacy settings prevent access. Please verify the Facebook URL and try again.'
          },
          { status: 404 }
        )
      }

      if (error.message.includes('Facebook username does not exist')) {
        return json(
          {
            error: 'This Facebook username does not exist. The username may have been changed or deleted. Please verify the URL and try again.'
          },
          { status: 404 }
        )
      }

      if (error.message.includes('Invalid access token')) {
        return json(
          {
            error: 'Your Facebook session has expired. Please sign out and sign in again with Facebook to continue importing profiles.'
          },
          { status: 401 }
        )
      }

      // Handle legacy error message patterns (backwards compatibility)
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
    console.log('[FB-IMPORT] API Endpoint: Extracting person data from profile...')
    const personData = extractPersonDataFromProfile(facebookProfile)
    console.log('[FB-IMPORT] API Endpoint: Extracted person data:', personData)

    // Return person data
    console.log('[FB-IMPORT] API Endpoint: Returning success response')
    return json({ personData }, { status: 200 })
  } catch (error) {
    // Catch-all error handler
    console.error('[FB-IMPORT] API Endpoint: Catch-all error handler triggered')
    console.error('[FB-IMPORT] API Endpoint: Error:', error)
    console.error('[FB-IMPORT] API Endpoint: Error message:', error.message)
    console.error('[FB-IMPORT] API Endpoint: Error stack:', error.stack)
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
