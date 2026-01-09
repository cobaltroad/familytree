import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getAuthConfig, validateAuthConfig } from './config.js'

describe('Auth Configuration', () => {
  let originalEnv

  beforeEach(() => {
    // Save original environment variables
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv
  })

  describe('getAuthConfig', () => {
    it('should load Facebook OAuth configuration from environment variables', () => {
      // Arrange
      process.env.FACEBOOK_APP_ID = '1226075142824729'
      process.env.FACEBOOK_APP_SECRET = 'fffd3c97ffe11383db34eff40605b067'
      process.env.AUTH_SECRET = 'test-secret-key-32-characters-long'
      process.env.FACEBOOK_CALLBACK_URL = 'http://localhost:5173/auth/callback/facebook'

      // Act
      const config = getAuthConfig()

      // Assert
      expect(config).toBeDefined()
      expect(config.facebook).toBeDefined()
      expect(config.facebook.appId).toBe('1226075142824729')
      expect(config.facebook.appSecret).toBe('fffd3c97ffe11383db34eff40605b067')
      expect(config.facebook.callbackUrl).toBe('http://localhost:5173/auth/callback/facebook')
      expect(config.authSecret).toBe('test-secret-key-32-characters-long')
    })

    it('should use default callback URL if not provided', () => {
      // Arrange
      process.env.FACEBOOK_APP_ID = '1226075142824729'
      process.env.FACEBOOK_APP_SECRET = 'fffd3c97ffe11383db34eff40605b067'
      process.env.AUTH_SECRET = 'test-secret-key-32-characters-long'
      delete process.env.FACEBOOK_CALLBACK_URL

      // Act
      const config = getAuthConfig()

      // Assert
      expect(config.facebook.callbackUrl).toBe('http://localhost:5173/auth/callback/facebook')
    })

    it('should load Facebook API version from environment or use default', () => {
      // Arrange
      process.env.FACEBOOK_APP_ID = '1226075142824729'
      process.env.FACEBOOK_APP_SECRET = 'fffd3c97ffe11383db34eff40605b067'
      process.env.AUTH_SECRET = 'test-secret-key-32-characters-long'
      process.env.FACEBOOK_API_VERSION = 'v19.0'

      // Act
      const config = getAuthConfig()

      // Assert
      expect(config.facebook.apiVersion).toBe('v19.0')
    })

    it('should use default API version if not provided', () => {
      // Arrange
      process.env.FACEBOOK_APP_ID = '1226075142824729'
      process.env.FACEBOOK_APP_SECRET = 'fffd3c97ffe11383db34eff40605b067'
      process.env.AUTH_SECRET = 'test-secret-key-32-characters-long'
      delete process.env.FACEBOOK_API_VERSION

      // Act
      const config = getAuthConfig()

      // Assert
      expect(config.facebook.apiVersion).toBe('v19.0')
    })

    it('should load Facebook scopes from environment or use default', () => {
      // Arrange
      process.env.FACEBOOK_APP_ID = '1226075142824729'
      process.env.FACEBOOK_APP_SECRET = 'fffd3c97ffe11383db34eff40605b067'
      process.env.AUTH_SECRET = 'test-secret-key-32-characters-long'
      process.env.FACEBOOK_SCOPES = 'email,public_profile,user_birthday'

      // Act
      const config = getAuthConfig()

      // Assert
      expect(config.facebook.scopes).toBe('email,public_profile,user_birthday')
    })

    it('should use default scopes if not provided', () => {
      // Arrange
      process.env.FACEBOOK_APP_ID = '1226075142824729'
      process.env.FACEBOOK_APP_SECRET = 'fffd3c97ffe11383db34eff40605b067'
      process.env.AUTH_SECRET = 'test-secret-key-32-characters-long'
      delete process.env.FACEBOOK_SCOPES

      // Act
      const config = getAuthConfig()

      // Assert (defaults now include user_birthday and user_gender per Issue #79)
      expect(config.facebook.scopes).toBe('email,public_profile,user_birthday,user_gender')
    })

    it('should throw error when FACEBOOK_APP_ID is missing', () => {
      // Arrange
      delete process.env.FACEBOOK_APP_ID
      process.env.FACEBOOK_APP_SECRET = 'fffd3c97ffe11383db34eff40605b067'
      process.env.AUTH_SECRET = 'test-secret-key-32-characters-long'

      // Act & Assert
      expect(() => getAuthConfig()).toThrow('Missing required environment variable: FACEBOOK_APP_ID')
    })

    it('should throw error when FACEBOOK_APP_SECRET is missing', () => {
      // Arrange
      process.env.FACEBOOK_APP_ID = '1226075142824729'
      delete process.env.FACEBOOK_APP_SECRET
      process.env.AUTH_SECRET = 'test-secret-key-32-characters-long'

      // Act & Assert
      expect(() => getAuthConfig()).toThrow('Missing required environment variable: FACEBOOK_APP_SECRET')
    })

    it('should throw error when AUTH_SECRET is missing', () => {
      // Arrange
      process.env.FACEBOOK_APP_ID = '1226075142824729'
      process.env.FACEBOOK_APP_SECRET = 'fffd3c97ffe11383db34eff40605b067'
      delete process.env.AUTH_SECRET

      // Act & Assert
      expect(() => getAuthConfig()).toThrow('Missing required environment variable: AUTH_SECRET')
    })

    it('should throw error when FACEBOOK_APP_ID is empty string', () => {
      // Arrange
      process.env.FACEBOOK_APP_ID = ''
      process.env.FACEBOOK_APP_SECRET = 'fffd3c97ffe11383db34eff40605b067'
      process.env.AUTH_SECRET = 'test-secret-key-32-characters-long'

      // Act & Assert
      expect(() => getAuthConfig()).toThrow('Missing required environment variable: FACEBOOK_APP_ID')
    })

    it('should throw error when FACEBOOK_APP_SECRET is empty string', () => {
      // Arrange
      process.env.FACEBOOK_APP_ID = '1226075142824729'
      process.env.FACEBOOK_APP_SECRET = ''
      process.env.AUTH_SECRET = 'test-secret-key-32-characters-long'

      // Act & Assert
      expect(() => getAuthConfig()).toThrow('Missing required environment variable: FACEBOOK_APP_SECRET')
    })

    it('should throw error when AUTH_SECRET is empty string', () => {
      // Arrange
      process.env.FACEBOOK_APP_ID = '1226075142824729'
      process.env.FACEBOOK_APP_SECRET = 'fffd3c97ffe11383db34eff40605b067'
      process.env.AUTH_SECRET = ''

      // Act & Assert
      expect(() => getAuthConfig()).toThrow('Missing required environment variable: AUTH_SECRET')
    })

    it('should throw error when AUTH_SECRET is too short (less than 32 characters)', () => {
      // Arrange
      process.env.FACEBOOK_APP_ID = '1226075142824729'
      process.env.FACEBOOK_APP_SECRET = 'fffd3c97ffe11383db34eff40605b067'
      process.env.AUTH_SECRET = 'too-short'

      // Act & Assert
      expect(() => getAuthConfig()).toThrow('AUTH_SECRET must be at least 32 characters long for secure encryption')
    })

    it('should accept AUTH_SECRET with exactly 32 characters', () => {
      // Arrange
      process.env.FACEBOOK_APP_ID = '1226075142824729'
      process.env.FACEBOOK_APP_SECRET = 'fffd3c97ffe11383db34eff40605b067'
      process.env.AUTH_SECRET = '12345678901234567890123456789012' // exactly 32 chars

      // Act
      const config = getAuthConfig()

      // Assert
      expect(config.authSecret).toBe('12345678901234567890123456789012')
    })

    it('should accept AUTH_SECRET with more than 32 characters', () => {
      // Arrange
      process.env.FACEBOOK_APP_ID = '1226075142824729'
      process.env.FACEBOOK_APP_SECRET = 'fffd3c97ffe11383db34eff40605b067'
      process.env.AUTH_SECRET = '123456789012345678901234567890123456789012345678' // 48 chars

      // Act
      const config = getAuthConfig()

      // Assert
      expect(config.authSecret).toBe('123456789012345678901234567890123456789012345678')
    })
  })

  describe('validateAuthConfig', () => {
    it('should return true for valid configuration', () => {
      // Arrange
      const validConfig = {
        facebook: {
          appId: '1226075142824729',
          appSecret: 'fffd3c97ffe11383db34eff40605b067',
          callbackUrl: 'http://localhost:5173/auth/callback/facebook',
          apiVersion: 'v19.0',
          scopes: 'email,public_profile'
        },
        authSecret: 'test-secret-key-32-characters-long'
      }

      // Act
      const result = validateAuthConfig(validConfig)

      // Assert
      expect(result).toBe(true)
    })

    it('should throw error when facebook config is missing', () => {
      // Arrange
      const invalidConfig = {
        authSecret: 'test-secret-key-32-characters-long'
      }

      // Act & Assert
      expect(() => validateAuthConfig(invalidConfig)).toThrow('Invalid configuration: missing facebook config')
    })

    it('should throw error when appId is missing', () => {
      // Arrange
      const invalidConfig = {
        facebook: {
          appSecret: 'fffd3c97ffe11383db34eff40605b067',
          callbackUrl: 'http://localhost:5173/auth/callback/facebook'
        },
        authSecret: 'test-secret-key-32-characters-long'
      }

      // Act & Assert
      expect(() => validateAuthConfig(invalidConfig)).toThrow('Invalid configuration: missing facebook.appId')
    })

    it('should throw error when appSecret is missing', () => {
      // Arrange
      const invalidConfig = {
        facebook: {
          appId: '1226075142824729',
          callbackUrl: 'http://localhost:5173/auth/callback/facebook'
        },
        authSecret: 'test-secret-key-32-characters-long'
      }

      // Act & Assert
      expect(() => validateAuthConfig(invalidConfig)).toThrow('Invalid configuration: missing facebook.appSecret')
    })

    it('should throw error when authSecret is missing', () => {
      // Arrange
      const invalidConfig = {
        facebook: {
          appId: '1226075142824729',
          appSecret: 'fffd3c97ffe11383db34eff40605b067',
          callbackUrl: 'http://localhost:5173/auth/callback/facebook'
        }
      }

      // Act & Assert
      expect(() => validateAuthConfig(invalidConfig)).toThrow('Invalid configuration: missing authSecret')
    })

    it('should throw error when authSecret is too short', () => {
      // Arrange
      const invalidConfig = {
        facebook: {
          appId: '1226075142824729',
          appSecret: 'fffd3c97ffe11383db34eff40605b067',
          callbackUrl: 'http://localhost:5173/auth/callback/facebook'
        },
        authSecret: 'short'
      }

      // Act & Assert
      expect(() => validateAuthConfig(invalidConfig)).toThrow('Invalid configuration: authSecret must be at least 32 characters')
    })

    it('should throw error when callbackUrl is missing', () => {
      // Arrange
      const invalidConfig = {
        facebook: {
          appId: '1226075142824729',
          appSecret: 'fffd3c97ffe11383db34eff40605b067'
        },
        authSecret: 'test-secret-key-32-characters-long'
      }

      // Act & Assert
      expect(() => validateAuthConfig(invalidConfig)).toThrow('Invalid configuration: missing facebook.callbackUrl')
    })

    it('should throw error when callbackUrl is not a valid URL', () => {
      // Arrange
      const invalidConfig = {
        facebook: {
          appId: '1226075142824729',
          appSecret: 'fffd3c97ffe11383db34eff40605b067',
          callbackUrl: 'not-a-valid-url'
        },
        authSecret: 'test-secret-key-32-characters-long'
      }

      // Act & Assert
      expect(() => validateAuthConfig(invalidConfig)).toThrow('Invalid configuration: facebook.callbackUrl must be a valid URL')
    })

    it('should accept http URLs for development', () => {
      // Arrange
      const validConfig = {
        facebook: {
          appId: '1226075142824729',
          appSecret: 'fffd3c97ffe11383db34eff40605b067',
          callbackUrl: 'http://localhost:5173/auth/callback/facebook',
          apiVersion: 'v19.0',
          scopes: 'email,public_profile'
        },
        authSecret: 'test-secret-key-32-characters-long'
      }

      // Act
      const result = validateAuthConfig(validConfig)

      // Assert
      expect(result).toBe(true)
    })

    it('should accept https URLs for production', () => {
      // Arrange
      const validConfig = {
        facebook: {
          appId: '1226075142824729',
          appSecret: 'fffd3c97ffe11383db34eff40605b067',
          callbackUrl: 'https://example.com/auth/callback/facebook',
          apiVersion: 'v19.0',
          scopes: 'email,public_profile'
        },
        authSecret: 'test-secret-key-32-characters-long'
      }

      // Act
      const result = validateAuthConfig(validConfig)

      // Assert
      expect(result).toBe(true)
    })
  })
})
