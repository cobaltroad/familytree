/**
 * Facebook Graph API Client
 * Story #81: Auto-Create Default Person from Facebook Profile
 *
 * Provides functions to fetch user profile data from Facebook Graph API
 * and extract person data for creating default Person records.
 *
 * Facebook Graph API Documentation:
 * https://developers.facebook.com/docs/graph-api/reference/user
 *
 * Rate Limits:
 * - 200 calls per hour per user
 * - Handled via error responses (HTTP 429)
 */

import { getAuthConfig } from './config.js'

/**
 * Parses Facebook birthday format (MM/DD/YYYY or MM/DD) to YYYY-MM-DD
 *
 * Facebook provides birthdays in MM/DD/YYYY format when the user shares their birth year,
 * or MM/DD format when they hide their birth year.
 *
 * @param {string} facebookBirthday - Birthday in Facebook format (MM/DD/YYYY or MM/DD)
 * @returns {string|null} Birthday in YYYY-MM-DD format, or null if invalid/partial
 *
 * @example
 * parseFacebookBirthday('03/14/1990') // '1990-03-14'
 * parseFacebookBirthday('03/14')      // null (partial date)
 * parseFacebookBirthday('invalid')    // null
 */
export function parseFacebookBirthday(facebookBirthday) {
  if (!facebookBirthday || typeof facebookBirthday !== 'string') {
    return null
  }

  // Facebook format: MM/DD/YYYY or MM/DD
  const parts = facebookBirthday.split('/')

  // We need full date with year
  if (parts.length !== 3) {
    return null // Partial date (MM/DD) - can't use it
  }

  const [month, day, year] = parts

  // Validate parts are numbers
  const monthNum = parseInt(month, 10)
  const dayNum = parseInt(day, 10)
  const yearNum = parseInt(year, 10)

  if (isNaN(monthNum) || isNaN(dayNum) || isNaN(yearNum)) {
    return null
  }

  // Validate ranges
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
    return null
  }

  // Pad month and day with leading zeros
  const paddedMonth = String(monthNum).padStart(2, '0')
  const paddedDay = String(dayNum).padStart(2, '0')

  // Return in YYYY-MM-DD format
  const isoDate = `${year}-${paddedMonth}-${paddedDay}`

  // Validate it's a real calendar date
  const date = new Date(isoDate + 'T00:00:00Z')
  if (
    date.getUTCFullYear() !== yearNum ||
    date.getUTCMonth() !== monthNum - 1 ||
    date.getUTCDate() !== dayNum
  ) {
    return null // Invalid date (e.g., Feb 30)
  }

  return isoDate
}

/**
 * Normalizes Facebook gender to our system's gender values
 *
 * @param {string} facebookGender - Gender from Facebook ('male', 'female', 'custom', etc.)
 * @returns {string|null} Normalized gender ('male', 'female', 'other') or null
 */
function normalizeGender(facebookGender) {
  if (!facebookGender || typeof facebookGender !== 'string') {
    return null
  }

  const normalized = facebookGender.toLowerCase()

  // Map Facebook genders to our system
  if (normalized === 'male') return 'male'
  if (normalized === 'female') return 'female'
  // Facebook uses 'custom' for non-binary/other genders
  return 'other'
}

/**
 * Extracts person data from Facebook profile
 *
 * Handles edge cases:
 * - Single name (no last name) → uses "User" as placeholder
 * - Partial birthday (MM/DD) → returns null
 * - Missing gender → returns null
 * - Missing photo → returns null
 *
 * @param {Object} profile - Facebook profile object from Graph API
 * @returns {Object} Person data ready for database insertion
 *
 * @example
 * const profile = {
 *   first_name: 'John',
 *   last_name: 'Doe',
 *   birthday: '03/14/1990',
 *   gender: 'male',
 *   picture: { data: { url: 'https://...' } }
 * }
 * const personData = extractPersonDataFromProfile(profile)
 * // {
 * //   firstName: 'John',
 * //   lastName: 'Doe',
 * //   birthDate: '1990-03-14',
 * //   gender: 'male',
 * //   photoUrl: 'https://...'
 * // }
 */
export function extractPersonDataFromProfile(profile) {
  // Extract names
  const firstName = profile.first_name || profile.name || 'User'
  const lastName = profile.last_name || 'User' // Placeholder for single-name users

  // Extract and parse birthday
  const birthDate = profile.birthday ? parseFacebookBirthday(profile.birthday) : null

  // Extract and normalize gender
  const gender = profile.gender ? normalizeGender(profile.gender) : null

  // Extract photo URL
  const photoUrl = profile.picture?.data?.url || null

  return {
    firstName,
    lastName,
    birthDate,
    gender,
    photoUrl
  }
}

/**
 * Fetches user profile from Facebook Graph API
 *
 * Requests the following fields:
 * - first_name, last_name: For person name
 * - birthday: For birthDate (requires user_birthday permission)
 * - gender: For gender (requires user_gender permission)
 * - picture: For photoUrl
 *
 * @param {string} accessToken - Facebook access token from OAuth flow
 * @returns {Promise<Object>} Facebook profile object
 * @throws {Error} If access token is missing or API request fails
 *
 * @example
 * const profile = await fetchFacebookProfile(accessToken)
 * console.log(profile.first_name, profile.last_name)
 */
export async function fetchFacebookProfile(accessToken) {
  if (!accessToken || typeof accessToken !== 'string' || accessToken.trim() === '') {
    throw new Error('Access token is required')
  }

  // Get API version from config
  const config = getAuthConfig()
  const apiVersion = config.facebook.apiVersion || 'v19.0'

  // Build Graph API URL with fields
  const fields = [
    'id',
    'first_name',
    'last_name',
    'birthday', // Requires user_birthday permission
    'gender', // Requires user_gender permission
    'picture' // Returns nested object with URL
  ].join(',')

  const url = `https://graph.facebook.com/${apiVersion}/me?fields=${fields}&access_token=${accessToken}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(
        `Facebook Graph API error: ${response.status} ${response.statusText}`
      )
    }

    const profile = await response.json()
    return profile
  } catch (error) {
    // Wrap any error with a consistent message
    throw new Error(`Failed to fetch Facebook profile: ${error.message}`)
  }
}

/**
 * Fetches any user's profile from Facebook Graph API
 * Stories #78 and #80: Facebook Profile Picture Import and Data Pre-population
 *
 * Unlike fetchFacebookProfile() which fetches "me" (authenticated user),
 * this function fetches ANY user's public profile data by user ID or username.
 *
 * Requests the following fields:
 * - first_name, last_name: For person name
 * - birthday: For birthDate (only if user has made it public)
 * - gender: For gender (only if user has made it public)
 * - picture.type(large): For high-quality profile picture (always public)
 *
 * Privacy Handling:
 * - Profile pictures are always public with public_profile permission
 * - Birthday and gender may not be returned if user's privacy settings restrict them
 * - The function handles missing fields gracefully
 *
 * @param {string} accessToken - Facebook access token from OAuth flow
 * @param {string} userIdentifier - Facebook user ID (numeric) or username
 * @returns {Promise<Object>} Facebook profile object
 * @throws {Error} If access token or user identifier is missing, or API request fails
 *
 * @example
 * // Fetch by numeric user ID
 * const profile = await fetchFacebookUserProfile(accessToken, '123456789')
 *
 * @example
 * // Fetch by username
 * const profile = await fetchFacebookUserProfile(accessToken, 'zuck')
 *
 * @example
 * // Handle privacy-restricted fields
 * const profile = await fetchFacebookUserProfile(accessToken, '123')
 * // profile.birthday may be undefined if user hid it
 * // profile.gender may be undefined if user hid it
 * // profile.picture is always available
 */
export async function fetchFacebookUserProfile(accessToken, userIdentifier) {
  console.log('[FB-IMPORT] Graph Client: fetchFacebookUserProfile called')
  console.log('[FB-IMPORT] Graph Client: User identifier:', userIdentifier)
  console.log('[FB-IMPORT] Graph Client: Access token check:', {
    hasToken: !!accessToken,
    tokenPrefix: accessToken ? accessToken.substring(0, 10) + '...' : 'N/A',
    tokenLength: accessToken ? accessToken.length : 0
  })

  if (!accessToken || typeof accessToken !== 'string' || accessToken.trim() === '') {
    console.error('[FB-IMPORT] Graph Client: Access token is missing or invalid')
    throw new Error('Access token is required')
  }

  if (!userIdentifier || typeof userIdentifier !== 'string' || userIdentifier.trim() === '') {
    console.error('[FB-IMPORT] Graph Client: User identifier is missing or invalid')
    throw new Error('User identifier is required')
  }

  // Get API version from config
  const config = getAuthConfig()
  const apiVersion = config.facebook.apiVersion || 'v19.0'
  console.log('[FB-IMPORT] Graph Client: API version:', apiVersion)

  // Build Graph API URL with fields
  // Note: picture.type(large) requests a higher resolution profile picture
  const fields = [
    'id',
    'first_name',
    'last_name',
    'birthday', // Only returned if user made it public
    'gender', // Only returned if user made it public
    'picture.type(large)' // Profile pictures are always public
  ].join(',')

  console.log('[FB-IMPORT] Graph Client: Fields requested:', fields)

  const url = `https://graph.facebook.com/${apiVersion}/${userIdentifier}?fields=${fields}&access_token=${accessToken}`

  // Log URL without access token for security
  const urlWithoutToken = `https://graph.facebook.com/${apiVersion}/${userIdentifier}?fields=${fields}&access_token=***`
  console.log('[FB-IMPORT] Graph Client: Graph API URL (token hidden):', urlWithoutToken)

  try {
    console.log('[FB-IMPORT] Graph Client: Making fetch request to Facebook Graph API...')
    const response = await fetch(url)

    console.log('[FB-IMPORT] Graph Client: Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: {
        contentType: response.headers.get('content-type')
      }
    })

    if (!response.ok) {
      console.error('[FB-IMPORT] Graph Client: Response not OK')

      // Try to get error details from response body
      let errorBody
      try {
        errorBody = await response.json()
        console.error('[FB-IMPORT] Graph Client: Facebook error response body:', errorBody)
      } catch (e) {
        console.error('[FB-IMPORT] Graph Client: Could not parse error response as JSON')
        // If we can't parse the error, throw a generic error with status
        throw new Error(
          `Facebook Graph API error: ${response.status} ${response.statusText}`
        )
      }

      // Parse Facebook error codes for more specific error messages
      if (errorBody && errorBody.error) {
        const fbError = errorBody.error
        const errorCode = fbError.code
        const errorSubcode = fbError.error_subcode

        console.log('[FB-IMPORT] Graph Client: Facebook error code:', errorCode, 'subcode:', errorSubcode)

        // Error code 100: Various permission and access issues
        if (errorCode === 100) {
          // Subcode 33: Object does not exist or cannot be loaded
          if (errorSubcode === 33) {
            throw new Error('Facebook profile not found or inaccessible')
          }
          // Generic error code 100 (permission issues)
          throw new Error('Facebook profile not found or inaccessible')
        }

        // Error code 190: Invalid or expired OAuth token
        if (errorCode === 190) {
          throw new Error('Invalid access token')
        }

        // Error code 803: Username/alias does not exist
        if (errorCode === 803) {
          throw new Error('Facebook username does not exist')
        }

        // Other errors - include Facebook's message
        throw new Error(`Facebook API error: ${fbError.message}`)
      }

      // Fallback if error body doesn't have expected structure
      throw new Error(
        `Facebook Graph API error: ${response.status} ${response.statusText}`
      )
    }

    const profile = await response.json()
    console.log('[FB-IMPORT] Graph Client: Profile data received:', profile)
    return profile
  } catch (error) {
    // If the error is already one of our custom errors, re-throw it
    if (error.message.includes('Facebook profile not found') ||
        error.message.includes('Invalid access token') ||
        error.message.includes('Facebook username does not exist') ||
        error.message.includes('Facebook API error:')) {
      throw error
    }

    // Wrap network or other errors with a consistent message
    console.error('[FB-IMPORT] Graph Client: Error in fetch:', error)
    console.error('[FB-IMPORT] Graph Client: Error message:', error.message)
    console.error('[FB-IMPORT] Graph Client: Error stack:', error.stack)
    throw new Error(`Failed to fetch Facebook profile: ${error.message}`)
  }
}
