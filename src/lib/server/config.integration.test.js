import { describe, it, expect } from 'vitest'
import { getAuthConfig } from './config.js'

/**
 * Integration tests for Facebook OAuth configuration
 *
 * These tests verify that the configuration module correctly loads
 * environment variables from the .env file in a real environment.
 *
 * Note: These tests will only pass if the .env file is properly configured.
 */
describe('Auth Configuration Integration', () => {
  describe('Real Environment Configuration', () => {
    it('should load Facebook OAuth configuration from .env file', () => {
      // Act - Load configuration from actual environment
      const config = getAuthConfig()

      // Assert - Verify all required fields are present
      expect(config).toBeDefined()
      expect(config.facebook).toBeDefined()
      expect(config.facebook.appId).toBeDefined()
      expect(config.facebook.appSecret).toBeDefined()
      expect(config.facebook.callbackUrl).toBeDefined()
      expect(config.facebook.apiVersion).toBeDefined()
      expect(config.facebook.scopes).toBeDefined()
      expect(config.authSecret).toBeDefined()
    })

    it('should load correct Facebook App ID from .env', () => {
      // Act
      const config = getAuthConfig()

      // Assert - Verify the expected Facebook App ID
      expect(config.facebook.appId).toBe('1226075142824729')
    })

    it('should load correct Facebook App Secret from .env', () => {
      // Act
      const config = getAuthConfig()

      // Assert - Verify the expected Facebook App Secret
      expect(config.facebook.appSecret).toBe('fffd3c97ffe11383db34eff40605b067')
    })

    it('should have AUTH_SECRET with at least 32 characters', () => {
      // Act
      const config = getAuthConfig()

      // Assert - Verify AUTH_SECRET meets security requirements
      expect(config.authSecret).toBeDefined()
      expect(config.authSecret.length).toBeGreaterThanOrEqual(32)
    })

    it('should use default callback URL', () => {
      // Act
      const config = getAuthConfig()

      // Assert - Verify default callback URL for development
      expect(config.facebook.callbackUrl).toBe('http://localhost:5173/auth/callback/facebook')
    })

    it('should use default API version', () => {
      // Act
      const config = getAuthConfig()

      // Assert - Verify default API version
      expect(config.facebook.apiVersion).toBe('v19.0')
    })

    it('should use default scopes', () => {
      // Act
      const config = getAuthConfig()

      // Assert - Verify default scopes
      expect(config.facebook.scopes).toBe('email,public_profile')
    })

    it('should return a valid configuration object structure', () => {
      // Act
      const config = getAuthConfig()

      // Assert - Verify object structure
      expect(config).toHaveProperty('facebook')
      expect(config).toHaveProperty('authSecret')
      expect(config.facebook).toHaveProperty('appId')
      expect(config.facebook).toHaveProperty('appSecret')
      expect(config.facebook).toHaveProperty('callbackUrl')
      expect(config.facebook).toHaveProperty('apiVersion')
      expect(config.facebook).toHaveProperty('scopes')
    })

    it('should have a valid callback URL format', () => {
      // Act
      const config = getAuthConfig()

      // Assert - Verify callback URL is a valid URL
      expect(() => new URL(config.facebook.callbackUrl)).not.toThrow()

      const url = new URL(config.facebook.callbackUrl)
      expect(url.protocol).toMatch(/^https?:$/)
      expect(url.pathname).toBe('/auth/callback/facebook')
    })

    it('should have non-empty configuration values', () => {
      // Act
      const config = getAuthConfig()

      // Assert - Verify no empty strings
      expect(config.facebook.appId.trim()).not.toBe('')
      expect(config.facebook.appSecret.trim()).not.toBe('')
      expect(config.facebook.callbackUrl.trim()).not.toBe('')
      expect(config.facebook.apiVersion.trim()).not.toBe('')
      expect(config.facebook.scopes.trim()).not.toBe('')
      expect(config.authSecret.trim()).not.toBe('')
    })
  })
})
