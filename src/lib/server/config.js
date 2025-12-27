/**
 * Authentication Configuration Module
 *
 * Loads and validates Facebook OAuth configuration from environment variables.
 * This module ensures all required credentials are present and properly formatted
 * before the application starts.
 *
 * Required Environment Variables:
 * - FACEBOOK_APP_ID: Facebook application ID
 * - FACEBOOK_APP_SECRET: Facebook application secret key
 * - AUTH_SECRET: Session encryption key (minimum 32 characters)
 *
 * Optional Environment Variables:
 * - FACEBOOK_CALLBACK_URL: OAuth redirect URI (defaults to localhost:5173)
 * - FACEBOOK_API_VERSION: Facebook Graph API version (defaults to v19.0)
 * - FACEBOOK_SCOPES: Comma-separated OAuth scopes (defaults to email,public_profile,user_birthday,user_gender)
 */

// Configuration constants
const MIN_AUTH_SECRET_LENGTH = 32
const DEFAULT_CALLBACK_URL = 'http://localhost:5173/auth/callback/facebook'
const DEFAULT_API_VERSION = 'v19.0'
// Story #79: Added user_birthday and user_gender permissions for default person creation
const DEFAULT_SCOPES = 'email,public_profile,user_birthday,user_gender'

/**
 * Validates that a required environment variable exists and is not empty
 *
 * @param {string|undefined} value - The environment variable value
 * @param {string} name - The environment variable name
 * @throws {Error} If the variable is missing or empty
 */
function requireEnvVar(value, name) {
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
}

/**
 * Loads authentication configuration from environment variables
 *
 * @returns {Object} Configuration object with Facebook OAuth settings
 * @throws {Error} If required environment variables are missing or invalid
 */
export function getAuthConfig() {
  // Required environment variables
  const facebookAppId = process.env.FACEBOOK_APP_ID
  const facebookAppSecret = process.env.FACEBOOK_APP_SECRET
  const authSecret = process.env.AUTH_SECRET

  // Validate required variables
  requireEnvVar(facebookAppId, 'FACEBOOK_APP_ID')
  requireEnvVar(facebookAppSecret, 'FACEBOOK_APP_SECRET')
  requireEnvVar(authSecret, 'AUTH_SECRET')

  // Validate AUTH_SECRET length for security
  if (authSecret.length < MIN_AUTH_SECRET_LENGTH) {
    throw new Error('AUTH_SECRET must be at least 32 characters long for secure encryption')
  }

  // Optional environment variables with defaults
  const facebookCallbackUrl = process.env.FACEBOOK_CALLBACK_URL || DEFAULT_CALLBACK_URL
  const facebookApiVersion = process.env.FACEBOOK_API_VERSION || DEFAULT_API_VERSION
  const facebookScopes = process.env.FACEBOOK_SCOPES || DEFAULT_SCOPES

  // Build configuration object
  const config = {
    facebook: {
      appId: facebookAppId,
      appSecret: facebookAppSecret,
      callbackUrl: facebookCallbackUrl,
      apiVersion: facebookApiVersion,
      scopes: facebookScopes
    },
    authSecret: authSecret
  }

  // Validate configuration before returning
  validateAuthConfig(config)

  return config
}

/**
 * Validates that a required configuration field exists
 *
 * @param {any} value - The configuration value
 * @param {string} fieldName - The field name for error messages
 * @throws {Error} If the field is missing
 */
function requireConfigField(value, fieldName) {
  if (!value) {
    throw new Error(`Invalid configuration: missing ${fieldName}`)
  }
}

/**
 * Validates authentication configuration object
 *
 * @param {Object} config - Configuration object to validate
 * @returns {boolean} True if configuration is valid
 * @throws {Error} If configuration is invalid
 */
export function validateAuthConfig(config) {
  // Validate top-level structure
  requireConfigField(config.facebook, 'facebook config')
  requireConfigField(config.authSecret, 'authSecret')

  // Validate Facebook configuration
  requireConfigField(config.facebook.appId, 'facebook.appId')
  requireConfigField(config.facebook.appSecret, 'facebook.appSecret')
  requireConfigField(config.facebook.callbackUrl, 'facebook.callbackUrl')

  // Validate authSecret length
  if (config.authSecret.length < MIN_AUTH_SECRET_LENGTH) {
    throw new Error('Invalid configuration: authSecret must be at least 32 characters')
  }

  // Validate callback URL format
  try {
    new URL(config.facebook.callbackUrl)
  } catch (error) {
    throw new Error('Invalid configuration: facebook.callbackUrl must be a valid URL')
  }

  return true
}
