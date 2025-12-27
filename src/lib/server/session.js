/**
 * Session Helper Utilities
 *
 * Provides helper functions for managing authentication sessions in SvelteKit.
 * These utilities make it easy to check authentication status and access user data
 * throughout the application.
 *
 * Features:
 * - Get current session from request event
 * - Extract user data from session
 * - Check authentication status
 * - Protect routes with requireAuth
 */

/**
 * Gets the current session from the request event
 *
 * @param {Object} event - SvelteKit request event
 * @returns {Promise<Object|null>} Session object or null if not authenticated
 * @throws {Error} If session retrieval fails
 *
 * @example
 * const session = await getSession(event)
 * if (session) {
 *   console.log('User:', session.user)
 * }
 */
export async function getSession(event) {
  // Check if event.locals.getSession exists
  if (!event.locals || typeof event.locals.getSession !== 'function') {
    return null
  }

  // Get session from Auth.js
  const session = await event.locals.getSession()
  return session
}

/**
 * Extracts user data from session
 *
 * @param {Object} event - SvelteKit request event
 * @returns {Promise<Object|null>} User object or null if not authenticated
 *
 * @example
 * const user = await getUserFromSession(event)
 * if (user) {
 *   console.log('User ID:', user.id)
 *   console.log('Email:', user.email)
 * }
 */
export async function getUserFromSession(event) {
  const session = await getSession(event)

  // Return user if session exists and has user data
  if (session && session.user) {
    return session.user
  }

  return null
}

/**
 * Checks if the current request is authenticated
 *
 * @param {Object} event - SvelteKit request event
 * @returns {Promise<boolean>} True if authenticated, false otherwise
 *
 * @example
 * if (await isAuthenticated(event)) {
 *   // User is logged in
 * } else {
 *   // User is not logged in
 * }
 */
export async function isAuthenticated(event) {
  const user = await getUserFromSession(event)

  // User is authenticated if they have an id
  return user !== null && user.id !== undefined
}

/**
 * Authentication error class
 * Includes HTTP status code for proper error handling
 */
class AuthenticationError extends Error {
  constructor(message, status = 401) {
    super(message)
    this.name = 'AuthenticationError'
    this.status = status
  }
}

/**
 * Requires authentication for a route
 * Throws an error if not authenticated
 *
 * @param {Object} event - SvelteKit request event
 * @param {string} message - Custom error message (optional)
 * @returns {Promise<Object>} Session object if authenticated
 * @throws {AuthenticationError} If not authenticated (status 401)
 *
 * @example
 * // In a server route
 * export async function GET(event) {
 *   const session = await requireAuth(event)
 *   // Continue with authenticated user
 *   return json({ user: session.user })
 * }
 *
 * @example
 * // With custom error message
 * export async function POST(event) {
 *   const session = await requireAuth(event, 'You must be logged in to create a post')
 *   // Continue with authenticated user
 * }
 */
export async function requireAuth(event, message = 'Authentication required') {
  const session = await getSession(event)

  // Check if session exists and has user data
  if (!session || !session.user || !session.user.id) {
    throw new AuthenticationError(message, 401)
  }

  return session
}
