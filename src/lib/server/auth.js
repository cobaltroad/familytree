/**
 * Auth.js Configuration Module
 *
 * Provides Auth.js/SvelteKit Auth configuration with Facebook OAuth provider.
 * Integrates with the existing config module for environment variable management.
 *
 * Features:
 * - Facebook OAuth 2.0 authentication
 * - JWT-based session management (30-day sessions)
 * - Automatic user profile synchronization
 * - Secure cookie handling
 * - Error handling and validation
 */

import { getAuthConfig } from './config.js'
import { syncUserFromOAuth } from './userSync.js'

/**
 * Sign-in callback - syncs user data to database
 * Called when a user successfully authenticates with OAuth provider
 *
 * @param {Object} params - Callback parameters
 * @param {Object} params.user - User object from OAuth provider
 * @param {Object} params.account - Account object with provider details
 * @param {Object} params.profile - Full OAuth profile data
 * @returns {Promise<boolean>} True to allow sign in, false to reject
 */
export async function signInCallback({ user, account, profile }) {
  try {
    // Only sync for OAuth providers
    if (!account || account.type !== 'oauth') {
      return true // Allow sign in but don't sync
    }

    // Validate required user data
    if (!user.email) {
      console.error('Sign in rejected: user email is required')
      return false
    }

    // Prepare OAuth data for sync
    const oauthData = {
      provider: account.provider,
      providerUserId: account.providerAccountId || user.id,
      email: user.email,
      name: user.name || null,
      avatarUrl: user.image || null
    }

    // Sync user to database
    await syncUserFromOAuth(oauthData)

    // Allow sign in
    return true
  } catch (error) {
    // Log error but don't expose details to client
    console.error('Error syncing user during sign in:', error)

    // Reject sign in on error to prevent security issues
    return false
  }
}

/**
 * JWT callback - customizes JWT token creation
 * Adds user profile data to the token on sign in
 *
 * @param {Object} params - Callback parameters
 * @param {Object} params.token - Current JWT token
 * @param {Object} params.user - User object (only on sign in)
 * @param {Object} params.account - Account object (only on sign in)
 * @returns {Object} Updated JWT token
 */
export async function jwtCallback({ token, user, account }) {
  // On sign in, add user data to token
  if (user && account) {
    token.userId = user.id
    token.email = user.email
    token.name = user.name
    token.picture = user.image
    token.provider = account.provider
  }

  return token
}

/**
 * Session callback - customizes session object
 * Maps JWT token data to session object for client access
 *
 * @param {Object} params - Callback parameters
 * @param {Object} params.session - Current session object
 * @param {Object} params.token - JWT token
 * @returns {Object} Updated session object
 */
export async function sessionCallback({ session, token }) {
  // Add user data from token to session
  session.user = {
    id: token.userId,
    email: token.email,
    name: token.name,
    image: token.picture,
    provider: token.provider
  }

  return session
}

/**
 * Creates Facebook provider configuration
 *
 * @param {Object} envConfig - Environment configuration from getAuthConfig()
 * @returns {Object} Facebook provider configuration object
 */
export function createFacebookProviderConfig(envConfig) {
  // Parse scopes from comma-separated string
  const scopes = envConfig.facebook.scopes.split(',').map((s) => s.trim())

  return {
    id: 'facebook',
    name: 'Facebook',
    type: 'oauth',
    clientId: envConfig.facebook.appId,
    clientSecret: envConfig.facebook.appSecret,
    authorization: {
      params: {
        scope: scopes.join(',')
      }
    }
  }
}

/**
 * Creates and returns Auth.js configuration object
 * This function returns a plain configuration object that can be tested
 * without requiring SvelteKit runtime dependencies
 *
 * @returns {Object} Auth.js configuration with Facebook provider and callbacks
 * @throws {Error} If required environment variables are missing or invalid
 */
export function getAuthJsConfig() {
  // Load environment configuration
  const envConfig = getAuthConfig()

  // Create Facebook provider config
  const facebookProviderConfig = createFacebookProviderConfig(envConfig)

  // Configure Auth.js
  const config = {
    // Authentication providers
    providers: [facebookProviderConfig],

    // Session configuration
    session: {
      strategy: 'jwt',
      maxAge: 30 * 24 * 60 * 60 // 30 days in seconds
    },

    // Secret for encrypting tokens and cookies
    secret: envConfig.authSecret,

    // Cookie configuration
    cookies: {
      sessionToken: {
        name:
          process.env.NODE_ENV === 'production'
            ? '__Secure-authjs.session-token'
            : 'authjs.session-token',
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: process.env.NODE_ENV === 'production'
        }
      }
    },

    // Callbacks for customizing auth flow
    callbacks: {
      signIn: signInCallback,
      jwt: jwtCallback,
      session: sessionCallback
    }
  }

  return config
}

/**
 * Creates Auth.js handlers for SvelteKit
 * This is a factory function that creates the SvelteKitAuth instance
 * and returns the necessary handlers
 *
 * @returns {Object} Object containing SvelteKit Auth handlers and helpers
 * @returns {Function} returns.handle - SvelteKit handle hook for authentication
 * @returns {Function} returns.signIn - Helper function to sign in users
 * @returns {Function} returns.signOut - Helper function to sign out users
 * @returns {Function} returns.getSession - Helper function to get current session
 */
export async function createAuthHandlers() {
  // Dynamic import to avoid requiring SvelteKit environment in tests
  const { SvelteKitAuth } = await import('@auth/sveltekit')
  const Facebook = (await import('@auth/core/providers/facebook')).default

  const config = getAuthJsConfig()

  // Replace the plain config provider with actual Facebook provider
  config.providers = [
    Facebook({
      clientId: config.providers[0].clientId,
      clientSecret: config.providers[0].clientSecret,
      authorization: config.providers[0].authorization
    })
  ]

  // Create SvelteKitAuth instance
  const auth = SvelteKitAuth(config)

  return {
    handle: auth.handle,
    signIn: auth.signIn,
    signOut: auth.signOut,
    getSession: async (event) => {
      const session = await event.locals.getSession()
      return session
    }
  }
}
