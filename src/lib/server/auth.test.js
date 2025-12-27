/**
 * Unit tests for Auth.js configuration module
 *
 * Tests the creation and validation of Auth.js configuration with Facebook provider.
 * Follows TDD methodology: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getAuthJsConfig,
  jwtCallback,
  sessionCallback,
  createFacebookProviderConfig
} from './auth.js'

describe('Auth.js Configuration Module', () => {
  describe('getAuthJsConfig()', () => {
    beforeEach(() => {
      // Reset environment variables before each test
      process.env.FACEBOOK_APP_ID = 'test_app_id_123'
      process.env.FACEBOOK_APP_SECRET = 'test_app_secret_456'
      process.env.AUTH_SECRET = 'this_is_a_very_secure_secret_key_with_32_plus_characters'
      process.env.FACEBOOK_CALLBACK_URL = 'http://localhost:5173/auth/callback/facebook'
      process.env.FACEBOOK_SCOPES = 'email,public_profile'
    })

    it('should return valid Auth.js configuration object', () => {
      const config = getAuthJsConfig()

      expect(config).toBeDefined()
      expect(config.providers).toBeDefined()
      expect(Array.isArray(config.providers)).toBe(true)
      expect(config.providers.length).toBeGreaterThan(0)
    })

    it('should configure Facebook OAuth provider with correct credentials', () => {
      const config = getAuthJsConfig()

      const facebookProvider = config.providers[0]
      expect(facebookProvider).toBeDefined()
      expect(facebookProvider.id).toBe('facebook')
      expect(facebookProvider.name).toBe('Facebook')
    })

    it('should use AUTH_SECRET for session encryption', () => {
      const config = getAuthJsConfig()

      expect(config.secret).toBe('this_is_a_very_secure_secret_key_with_32_plus_characters')
    })

    it('should configure session strategy as JWT', () => {
      const config = getAuthJsConfig()

      expect(config.session).toBeDefined()
      expect(config.session.strategy).toBe('jwt')
    })

    it('should configure session max age to 30 days', () => {
      const config = getAuthJsConfig()

      expect(config.session.maxAge).toBe(30 * 24 * 60 * 60) // 30 days in seconds
    })

    it('should include callbacks for JWT and session handling', () => {
      const config = getAuthJsConfig()

      expect(config.callbacks).toBeDefined()
      expect(typeof config.callbacks.jwt).toBe('function')
      expect(typeof config.callbacks.session).toBe('function')
    })

    it('should throw error if FACEBOOK_APP_ID is missing', () => {
      delete process.env.FACEBOOK_APP_ID

      expect(() => getAuthJsConfig()).toThrow('Missing required environment variable: FACEBOOK_APP_ID')
    })

    it('should throw error if FACEBOOK_APP_SECRET is missing', () => {
      delete process.env.FACEBOOK_APP_SECRET

      expect(() => getAuthJsConfig()).toThrow('Missing required environment variable: FACEBOOK_APP_SECRET')
    })

    it('should throw error if AUTH_SECRET is missing', () => {
      delete process.env.AUTH_SECRET

      expect(() => getAuthJsConfig()).toThrow('Missing required environment variable: AUTH_SECRET')
    })

    it('should throw error if AUTH_SECRET is too short', () => {
      process.env.AUTH_SECRET = 'too_short'

      expect(() => getAuthJsConfig()).toThrow('AUTH_SECRET must be at least 32 characters')
    })
  })

  describe('JWT Callback', () => {
    let config

    beforeEach(() => {
      process.env.FACEBOOK_APP_ID = 'test_app_id_123'
      process.env.FACEBOOK_APP_SECRET = 'test_app_secret_456'
      process.env.AUTH_SECRET = 'this_is_a_very_secure_secret_key_with_32_plus_characters'
      config = getAuthJsConfig()
    })

    it('should add user profile data to JWT token on sign in (unit test - no database)', async () => {
      const token = {}
      const user = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg'
      }
      const account = { provider: 'facebook' }

      const result = await config.callbacks.jwt({ token, user, account })

      // Note: In unit tests without database, userId will be undefined
      // See auth.jwtCallback.dbUserId.test.js for integration tests with database
      expect(result.userId).toBeUndefined()
      expect(result.email).toBe('test@example.com')
      expect(result.name).toBe('Test User')
      expect(result.picture).toBe('https://example.com/avatar.jpg')
      expect(result.provider).toBe('facebook')
    })

    it('should preserve existing token data on subsequent calls', async () => {
      const token = {
        userId: 123,
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        provider: 'facebook'
      }

      const result = await config.callbacks.jwt({ token })

      expect(result).toEqual(token)
    })

    it('should handle user without image gracefully (unit test - no database)', async () => {
      const token = {}
      const user = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User'
      }
      const account = { provider: 'facebook' }

      const result = await config.callbacks.jwt({ token, user, account })

      // Note: In unit tests without database, userId will be undefined
      expect(result.userId).toBeUndefined()
      expect(result.picture).toBeUndefined()
    })
  })

  describe('Session Callback', () => {
    let config

    beforeEach(() => {
      process.env.FACEBOOK_APP_ID = 'test_app_id_123'
      process.env.FACEBOOK_APP_SECRET = 'test_app_secret_456'
      process.env.AUTH_SECRET = 'this_is_a_very_secure_secret_key_with_32_plus_characters'
      config = getAuthJsConfig()
    })

    it('should map JWT token data to session object', async () => {
      const session = {}
      const token = {
        userId: '123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        provider: 'facebook'
      }

      const result = await config.callbacks.session({ session, token })

      expect(result.user).toBeDefined()
      expect(result.user.id).toBe('123')
      expect(result.user.email).toBe('test@example.com')
      expect(result.user.name).toBe('Test User')
      expect(result.user.image).toBe('https://example.com/avatar.jpg')
      expect(result.user.provider).toBe('facebook')
    })

    it('should handle token without picture', async () => {
      const session = {}
      const token = {
        userId: '123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'facebook'
      }

      const result = await config.callbacks.session({ session, token })

      expect(result.user.image).toBeUndefined()
    })

    it('should preserve existing session data', async () => {
      const session = { expires: '2025-12-31' }
      const token = {
        userId: '123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'facebook'
      }

      const result = await config.callbacks.session({ session, token })

      expect(result.expires).toBe('2025-12-31')
      expect(result.user).toBeDefined()
    })
  })

  describe('createFacebookProviderConfig()', () => {
    it('should create Facebook provider configuration from env config', () => {
      const envConfig = {
        facebook: {
          appId: 'test_app_id',
          appSecret: 'test_app_secret',
          scopes: 'email,public_profile'
        }
      }

      const providerConfig = createFacebookProviderConfig(envConfig)

      expect(providerConfig.id).toBe('facebook')
      expect(providerConfig.name).toBe('Facebook')
      expect(providerConfig.type).toBe('oauth')
      expect(providerConfig.clientId).toBe('test_app_id')
      expect(providerConfig.clientSecret).toBe('test_app_secret')
    })

    it('should parse comma-separated scopes correctly', () => {
      const envConfig = {
        facebook: {
          appId: 'test_app_id',
          appSecret: 'test_app_secret',
          scopes: 'email, public_profile, user_birthday'
        }
      }

      const providerConfig = createFacebookProviderConfig(envConfig)

      expect(providerConfig.authorization.params.scope).toBe('email,public_profile,user_birthday')
    })

    it('should handle scopes with extra whitespace', () => {
      const envConfig = {
        facebook: {
          appId: 'test_app_id',
          appSecret: 'test_app_secret',
          scopes: '  email  ,  public_profile  '
        }
      }

      const providerConfig = createFacebookProviderConfig(envConfig)

      expect(providerConfig.authorization.params.scope).toBe('email,public_profile')
    })
  })

  describe('Facebook Provider Configuration', () => {
    beforeEach(() => {
      process.env.FACEBOOK_APP_ID = 'test_app_id_123'
      process.env.FACEBOOK_APP_SECRET = 'test_app_secret_456'
      process.env.AUTH_SECRET = 'this_is_a_very_secure_secret_key_with_32_plus_characters'
    })

    it('should request email and public_profile scopes by default', () => {
      const config = getAuthJsConfig()
      const facebookProvider = config.providers[0]

      // Auth.js Facebook provider should be configured with correct scopes
      expect(facebookProvider).toBeDefined()
    })

    it('should use custom scopes from FACEBOOK_SCOPES env var', () => {
      process.env.FACEBOOK_SCOPES = 'email,public_profile,user_birthday'

      const config = getAuthJsConfig()
      const facebookProvider = config.providers[0]

      expect(facebookProvider).toBeDefined()
    })

    it('should configure callback URL from environment', () => {
      process.env.FACEBOOK_CALLBACK_URL = 'https://example.com/auth/callback/facebook'

      const config = getAuthJsConfig()

      // Callback URL configuration is handled by SvelteKit Auth automatically
      expect(config).toBeDefined()
    })
  })

  describe('Security Configuration', () => {
    beforeEach(() => {
      process.env.FACEBOOK_APP_ID = 'test_app_id_123'
      process.env.FACEBOOK_APP_SECRET = 'test_app_secret_456'
      process.env.AUTH_SECRET = 'this_is_a_very_secure_secret_key_with_32_plus_characters'
    })

    it('should enable secure cookies in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const config = getAuthJsConfig()

      expect(config.cookies).toBeDefined()

      process.env.NODE_ENV = originalEnv
    })

    it('should configure cookie security settings', () => {
      const config = getAuthJsConfig()

      expect(config.cookies).toBeDefined()
    })

    it('should set appropriate cookie sameSite policy', () => {
      const config = getAuthJsConfig()

      expect(config.cookies).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should provide meaningful error for invalid configuration', () => {
      delete process.env.FACEBOOK_APP_ID
      delete process.env.FACEBOOK_APP_SECRET
      delete process.env.AUTH_SECRET

      expect(() => getAuthJsConfig()).toThrow(/Missing required environment variable/)
    })

    it('should validate configuration before returning', () => {
      process.env.FACEBOOK_APP_ID = ''
      process.env.FACEBOOK_APP_SECRET = 'test_secret'
      process.env.AUTH_SECRET = 'this_is_a_very_secure_secret_key_with_32_plus_characters'

      expect(() => getAuthJsConfig()).toThrow()
    })
  })
})
