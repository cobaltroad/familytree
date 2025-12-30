import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '../../../../../routes/api/facebook/profile/+server.js'
import * as facebookGraphClient from '$lib/server/facebookGraphClient.js'
import * as facebookProfileParser from '$lib/server/facebookProfileParser.js'

/**
 * Test suite for Facebook Profile Import API Endpoint
 * Stories #78 and #80: Facebook Profile Picture Import and Data Pre-population
 *
 * Tests the /api/facebook/profile endpoint that allows fetching
 * any Facebook user's public profile data for import into Person records.
 *
 * Endpoint: POST /api/facebook/profile
 * Request body: { facebookUrl: string }
 * Response: { personData: { firstName, lastName, birthDate, gender, photoUrl } }
 *
 * Security:
 * - Requires authenticated user session
 * - Uses server-side Facebook app credentials
 * - Validates Facebook profile URLs
 */

describe('POST /api/facebook/profile', () => {
  let mockEvent

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Mock SvelteKit request event
    mockEvent = {
      request: {
        json: vi.fn()
      },
      locals: {
        getSession: vi.fn()
      }
    }

    // Spy on Facebook client functions
    vi.spyOn(facebookProfileParser, 'parseFacebookProfileUrl')
    vi.spyOn(facebookGraphClient, 'fetchFacebookUserProfile')
    vi.spyOn(facebookGraphClient, 'extractPersonDataFromProfile')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('authentication', () => {
    it('should require authenticated session', async () => {
      // No session (user not logged in)
      mockEvent.locals.getSession.mockResolvedValue(null)
      mockEvent.request.json.mockResolvedValue({ facebookUrl: 'facebook.com/zuck' })

      const response = await POST(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })
  })

  describe('input validation', () => {
    beforeEach(() => {
      // Mock authenticated session with access token (required for Facebook API calls)
      mockEvent.locals.getSession.mockResolvedValue({
        user: {
          id: 1,
          accessToken: 'mock-facebook-access-token-12345'
        }
      })
    })

    it('should require facebookUrl parameter', async () => {
      mockEvent.request.json.mockResolvedValue({})

      const response = await POST(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('facebookUrl')
    })

    it('should validate facebookUrl is a string', async () => {
      mockEvent.request.json.mockResolvedValue({ facebookUrl: 123 })

      const response = await POST(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('facebookUrl must be a valid string')
    })

    it('should reject empty facebookUrl', async () => {
      mockEvent.request.json.mockResolvedValue({ facebookUrl: '' })

      const response = await POST(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('facebookUrl must be a valid string')
    })

    it('should reject invalid Facebook URLs', async () => {
      mockEvent.request.json.mockResolvedValue({ facebookUrl: 'https://twitter.com/user' })

      const response = await POST(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid Facebook profile URL')
    })
  })

  describe('profile fetching', () => {
    beforeEach(() => {
      // Mock authenticated session with access token (required for Facebook API calls)
      mockEvent.locals.getSession.mockResolvedValue({
        user: {
          id: 1,
          accessToken: 'mock-facebook-access-token-12345'
        }
      })
    })

    it('should fetch profile by Facebook URL and return person data', async () => {
      mockEvent.request.json.mockResolvedValue({ facebookUrl: 'facebook.com/zuck' })

      // Mock URL parser
      facebookProfileParser.parseFacebookProfileUrl.mockReturnValue('zuck')

      // Mock Facebook Graph API client
      const mockFacebookProfile = {
        id: '4',
        first_name: 'Mark',
        last_name: 'Zuckerberg',
        birthday: '05/14/1984',
        gender: 'male',
        picture: {
          data: {
            url: 'https://example.com/zuck.jpg'
          }
        }
      }

      facebookGraphClient.fetchFacebookUserProfile.mockResolvedValue(mockFacebookProfile)
      facebookGraphClient.extractPersonDataFromProfile.mockReturnValue({
        firstName: 'Mark',
        lastName: 'Zuckerberg',
        birthDate: '1984-05-14',
        gender: 'male',
        photoUrl: 'https://example.com/zuck.jpg'
      })

      const response = await POST(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.personData).toBeDefined()
      expect(data.personData.firstName).toBe('Mark')
      expect(data.personData.lastName).toBe('Zuckerberg')
      expect(data.personData.birthDate).toBe('1984-05-14')
      expect(data.personData.gender).toBe('male')
      expect(data.personData.photoUrl).toBe('https://example.com/zuck.jpg')
    })

    it('should handle numeric Facebook user IDs', async () => {
      mockEvent.request.json.mockResolvedValue({ facebookUrl: '987654321' })

      facebookProfileParser.parseFacebookProfileUrl.mockReturnValue('987654321')
      facebookGraphClient.fetchFacebookUserProfile.mockResolvedValue({
        id: '987654321',
        first_name: 'Test',
        last_name: 'User'
      })
      facebookGraphClient.extractPersonDataFromProfile.mockReturnValue({
        firstName: 'Test',
        lastName: 'User',
        birthDate: null,
        gender: null,
        photoUrl: null
      })

      const response = await POST(mockEvent)

      expect(response.status).toBe(200)
    })

    it('should handle profile.php URLs', async () => {
      mockEvent.request.json.mockResolvedValue({
        facebookUrl: 'facebook.com/profile.php?id=123456789'
      })

      facebookProfileParser.parseFacebookProfileUrl.mockReturnValue('123456789')
      facebookGraphClient.fetchFacebookUserProfile.mockResolvedValue({
        id: '123456789',
        first_name: 'Test',
        last_name: 'User'
      })
      facebookGraphClient.extractPersonDataFromProfile.mockReturnValue({
        firstName: 'Test',
        lastName: 'User',
        birthDate: null,
        gender: null,
        photoUrl: null
      })

      const response = await POST(mockEvent)

      expect(response.status).toBe(200)
    })

    it('should handle privacy-restricted fields gracefully', async () => {
      mockEvent.request.json.mockResolvedValue({ facebookUrl: 'facebook.com/privateuser' })

      facebookProfileParser.parseFacebookProfileUrl.mockReturnValue('privateuser')

      // Mock profile with restricted birthday/gender
      const mockFacebookProfile = {
        id: '123',
        first_name: 'Private',
        last_name: 'User',
        picture: {
          data: {
            url: 'https://example.com/photo.jpg'
          }
        }
        // No birthday or gender
      }

      facebookGraphClient.fetchFacebookUserProfile.mockResolvedValue(mockFacebookProfile)
      facebookGraphClient.extractPersonDataFromProfile.mockReturnValue({
        firstName: 'Private',
        lastName: 'User',
        birthDate: null,
        gender: null,
        photoUrl: 'https://example.com/photo.jpg'
      })

      const response = await POST(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.personData.firstName).toBe('Private')
      expect(data.personData.lastName).toBe('User')
      expect(data.personData.birthDate).toBe(null)
      expect(data.personData.gender).toBe(null)
      expect(data.personData.photoUrl).toBe('https://example.com/photo.jpg')
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      // Mock authenticated session with access token (required for Facebook API calls)
      mockEvent.locals.getSession.mockResolvedValue({
        user: {
          id: 1,
          accessToken: 'mock-facebook-access-token-12345'
        }
      })
    })

    it('should handle Facebook API user not found errors', async () => {
      mockEvent.request.json.mockResolvedValue({ facebookUrl: 'facebook.com/nonexistent' })

      facebookProfileParser.parseFacebookProfileUrl.mockReturnValue('nonexistent')
      facebookGraphClient.fetchFacebookUserProfile.mockRejectedValue(
        new Error('Facebook Graph API error: 404 Not Found')
      )

      const response = await POST(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('Facebook user not found')
    })

    it('should handle Facebook API permission errors', async () => {
      mockEvent.request.json.mockResolvedValue({ facebookUrl: 'facebook.com/restricteduser' })

      facebookProfileParser.parseFacebookProfileUrl.mockReturnValue('restricteduser')
      facebookGraphClient.fetchFacebookUserProfile.mockRejectedValue(
        new Error('Facebook Graph API error: 403 Forbidden')
      )

      const response = await POST(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.toLowerCase()).toContain('permission')
    })

    it('should handle network errors', async () => {
      mockEvent.request.json.mockResolvedValue({ facebookUrl: 'facebook.com/zuck' })

      facebookProfileParser.parseFacebookProfileUrl.mockReturnValue('zuck')
      facebookGraphClient.fetchFacebookUserProfile.mockRejectedValue(
        new Error('Network error')
      )

      const response = await POST(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to fetch Facebook profile')
    })

    it('should handle invalid JSON in request', async () => {
      mockEvent.request.json.mockRejectedValue(new Error('Invalid JSON'))

      const response = await POST(mockEvent)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid request')
    })
  })

})
