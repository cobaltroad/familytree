/**
 * SvelteKit Server Hooks
 *
 * Integrates Auth.js authentication with SvelteKit's request/response cycle.
 * This file is automatically loaded by SvelteKit and runs on every server request.
 *
 * Features:
 * - Adds authentication to all server requests
 * - Makes session data available via event.locals.getSession()
 * - Handles auth routes (/auth/signin, /auth/callback/*, etc.)
 * - Provides protection for server routes
 * - Automatic database recovery when user not found
 */

import { createAuthHandlers } from './lib/server/auth.js'
import { checkAndRecoverUser } from './lib/server/startupRecovery.js'

// Create auth handlers (this returns a promise)
const authHandlersPromise = createAuthHandlers()

// Track if we've already checked for recovery in this server instance
let recoveryChecked = false

/**
 * SvelteKit handle hook
 * Runs on every server request
 *
 * @param {Object} params - Hook parameters
 * @param {Object} params.event - SvelteKit request event
 * @param {Function} params.resolve - Function to resolve the request
 * @returns {Promise<Response>} The response
 */
export async function handle({ event, resolve }) {
  // Get the auth handlers
  const authHandlers = await authHandlersPromise

  // Wrap the resolve function to add recovery check
  const wrappedResolve = async (event) => {
    // Get session for this request
    const session = await event.locals.getSession()

    // Check and recover user if needed (only once per server instance on first authenticated request)
    if (!recoveryChecked && session?.user?.id) {
      recoveryChecked = true // Mark as checked to avoid repeated checks

      try {
        await checkAndRecoverUser(session)
      } catch (error) {
        console.error('Error during startup recovery check:', error)
        // Continue processing request even if recovery check fails
      }
    }

    // Continue with normal request processing
    return resolve(event)
  }

  // Use Auth.js handle to process the request with our wrapped resolver
  return authHandlers.handle({ event, resolve: wrappedResolve })
}
