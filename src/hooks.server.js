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
 */

import { createAuthHandlers } from './lib/server/auth.js'

// Create auth handlers (this returns a promise)
const authHandlersPromise = createAuthHandlers()

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

  // Use Auth.js handle to process the request
  return authHandlers.handle({ event, resolve })
}
