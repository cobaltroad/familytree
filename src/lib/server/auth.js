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
import { syncUserFromOAuth, findUserByProviderAndId, getUserById } from './userSync.js'
import { shouldCreateDefaultPerson, createDefaultPersonFromProfile } from './defaultPerson.js'

/**
 * Sign-in callback - syncs user data to database and creates default person
 * Called when a user successfully authenticates with OAuth provider
 *
 * Story #81: Now creates default Person from Facebook profile on first login
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
    const syncedUser = await syncUserFromOAuth(oauthData)

    // Story #81: Auto-create default person from Facebook profile on first login
    // Only for Facebook provider (where we have additional profile data)
    if (account.provider === 'facebook' && profile) {
      try {
        // Check if user needs a default person
        if (await shouldCreateDefaultPerson(syncedUser.id)) {
          // Create Person from Facebook profile (ONE TIME ONLY)
          await createDefaultPersonFromProfile(syncedUser.id, profile)
          console.log('Created default person for user:', syncedUser.id)
        }
      } catch (error) {
        // Log error but don't block sign-in if default person creation fails
        console.error('Error creating default person:', error)
        // Still allow sign in - user can manually add themselves later
      }
    }

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
 * IMPORTANT: Uses database user ID, not OAuth provider's user ID
 * This ensures foreign key constraints work correctly (e.g., people.userId -> users.id)
 *
 * @param {Object} params - Callback parameters
 * @param {Object} params.token - Current JWT token
 * @param {Object} params.user - User object (only on sign in)
 * @param {Object} params.account - Account object (only on sign in)
 * @returns {Promise<Object>} Updated JWT token
 */
export async function jwtCallback({ token, user, account }) {
  // On sign in, add user data to token
  if (user && account) {
    // Look up the user in the database to get the database ID
    // The user.id from OAuth is the provider's ID (e.g., Facebook user ID)
    // We need the database user.id for foreign key relationships
    const providerUserId = account.providerAccountId || user.id
    const dbUser = await findUserByProviderAndId(account.provider, providerUserId)

    // If user found in database, use database ID
    // Otherwise, leave userId undefined (indicates sync error)
    if (dbUser) {
      token.userId = dbUser.id // Database ID (numeric)
    }

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
 * Story #82: Fetches user's defaultPersonId from database and adds to session
 * This allows components to access defaultPersonId for default focus in tree views
 *
 * @param {Object} params - Callback parameters
 * @param {Object} params.session - Current session object
 * @param {Object} params.token - JWT token
 * @returns {Promise<Object>} Updated session object
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

  // Story #82: Fetch defaultPersonId from database
  // Only fetch if we have a valid userId
  if (token.userId) {
    try {
      const dbUser = await getUserById(token.userId)
      if (dbUser && dbUser.defaultPersonId) {
        session.user.defaultPersonId = dbUser.defaultPersonId
      }
    } catch (error) {
      // Log error but don't block session creation
      console.error('Error fetching defaultPersonId in session callback:', error)
      // defaultPersonId will be undefined, which is fine (falls back to first root person)
    }
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
