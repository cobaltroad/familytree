import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchFacebookProfile,
  extractPersonDataFromProfile,
  parseFacebookBirthday
} from './facebookGraphClient.js'

/**
 * Test suite for Facebook Graph API Client
 * Story #81: Auto-Create Default Person from Facebook Profile
 *
 * Tests:
 * - fetchFacebookProfile() - Fetches user data from Facebook Graph API
 * - extractPersonDataFromProfile() - Extracts person data from Facebook profile
 * - parseFacebookBirthday() - Converts Facebook date format to YYYY-MM-DD
 */

describe('parseFacebookBirthday', () => {
  it('should parse MM/DD/YYYY format to YYYY-MM-DD', () => {
    expect(parseFacebookBirthday('03/14/1990')).toBe('1990-03-14')
    expect(parseFacebookBirthday('12/25/2000')).toBe('2000-12-25')
    expect(parseFacebookBirthday('01/01/1985')).toBe('1985-01-01')
  })

  it('should return null for MM/DD format (year not provided)', () => {
    // Facebook only provides MM/DD when user hides birth year
    expect(parseFacebookBirthday('03/14')).toBe(null)
    expect(parseFacebookBirthday('12/25')).toBe(null)
  })

  it('should return null for invalid formats', () => {
    expect(parseFacebookBirthday('1990-03-14')).toBe(null) // ISO format
    expect(parseFacebookBirthday('invalid')).toBe(null)
    expect(parseFacebookBirthday('')).toBe(null)
    expect(parseFacebookBirthday(null)).toBe(null)
    expect(parseFacebookBirthday(undefined)).toBe(null)
  })

  it('should handle edge cases', () => {
    expect(parseFacebookBirthday('02/29/2000')).toBe('2000-02-29') // Leap year
    expect(parseFacebookBirthday('13/01/2000')).toBe(null) // Invalid month
    expect(parseFacebookBirthday('01/32/2000')).toBe(null) // Invalid day
  })
})

describe('extractPersonDataFromProfile', () => {
  it('should extract complete person data from full profile', () => {
    const profile = {
      id: '123456789',
      name: 'John Doe',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      birthday: '03/14/1990',
      gender: 'male',
      picture: {
        data: {
          url: 'https://graph.facebook.com/v12.0/123456789/picture'
        }
      }
    }

    const result = extractPersonDataFromProfile(profile)

    expect(result).toEqual({
      firstName: 'John',
      lastName: 'Doe',
      birthDate: '1990-03-14',
      gender: 'male',
      photoUrl: 'https://graph.facebook.com/v12.0/123456789/picture'
    })
  })

  it('should handle single name (no last name)', () => {
    const profile = {
      id: '123456789',
      name: 'Madonna',
      first_name: 'Madonna'
      // No last_name field
    }

    const result = extractPersonDataFromProfile(profile)

    expect(result.firstName).toBe('Madonna')
    expect(result.lastName).toBe('User') // Default placeholder
  })

  it('should handle missing birthday', () => {
    const profile = {
      id: '123456789',
      first_name: 'John',
      last_name: 'Doe'
      // No birthday field
    }

    const result = extractPersonDataFromProfile(profile)

    expect(result.birthDate).toBe(null)
  })

  it('should handle partial birthday (MM/DD only)', () => {
    const profile = {
      id: '123456789',
      first_name: 'John',
      last_name: 'Doe',
      birthday: '03/14' // Year hidden by user
    }

    const result = extractPersonDataFromProfile(profile)

    expect(result.birthDate).toBe(null) // Can't use partial date
  })

  it('should handle missing gender', () => {
    const profile = {
      id: '123456789',
      first_name: 'John',
      last_name: 'Doe'
      // No gender field
    }

    const result = extractPersonDataFromProfile(profile)

    expect(result.gender).toBe(null)
  })

  it('should normalize Facebook gender values', () => {
    const testCases = [
      { input: 'male', expected: 'male' },
      { input: 'female', expected: 'female' },
      { input: 'Male', expected: 'male' }, // Normalize to lowercase
      { input: 'Female', expected: 'female' },
      { input: 'custom', expected: 'other' }, // Facebook custom gender
      { input: 'unknown', expected: 'other' }
    ]

    testCases.forEach(({ input, expected }) => {
      const profile = {
        id: '123',
        first_name: 'Test',
        last_name: 'User',
        gender: input
      }
      const result = extractPersonDataFromProfile(profile)
      expect(result.gender).toBe(expected)
    })
  })

  it('should handle missing photo', () => {
    const profile = {
      id: '123456789',
      first_name: 'John',
      last_name: 'Doe'
      // No picture field
    }

    const result = extractPersonDataFromProfile(profile)

    expect(result.photoUrl).toBe(null)
  })

  it('should extract nested picture URL', () => {
    const profile = {
      id: '123456789',
      first_name: 'John',
      last_name: 'Doe',
      picture: {
        data: {
          url: 'https://example.com/photo.jpg'
        }
      }
    }

    const result = extractPersonDataFromProfile(profile)

    expect(result.photoUrl).toBe('https://example.com/photo.jpg')
  })

  it('should handle minimal profile (only name)', () => {
    const profile = {
      id: '123456789',
      name: 'John Doe',
      first_name: 'John',
      last_name: 'Doe'
    }

    const result = extractPersonDataFromProfile(profile)

    expect(result).toEqual({
      firstName: 'John',
      lastName: 'Doe',
      birthDate: null,
      gender: null,
      photoUrl: null
    })
  })
})

describe('fetchFacebookProfile', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = vi.fn()
  })

  it('should fetch profile with correct fields', async () => {
    const mockProfile = {
      id: '123456789',
      first_name: 'John',
      last_name: 'Doe',
      birthday: '03/14/1990',
      gender: 'male',
      picture: {
        data: {
          url: 'https://example.com/photo.jpg'
        }
      }
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockProfile
    })

    const accessToken = 'test-access-token'
    const result = await fetchFacebookProfile(accessToken)

    // Verify fetch was called with correct URL
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://graph.facebook.com/v19.0/me')
    )

    // Verify fields parameter includes all required fields
    const callUrl = global.fetch.mock.calls[0][0]
    expect(callUrl).toContain('fields=')
    expect(callUrl).toContain('first_name')
    expect(callUrl).toContain('last_name')
    expect(callUrl).toContain('birthday')
    expect(callUrl).toContain('gender')
    expect(callUrl).toContain('picture')

    // Verify access token is in URL
    expect(callUrl).toContain(`access_token=${accessToken}`)

    expect(result).toEqual(mockProfile)
  })

  it('should handle network errors', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const accessToken = 'test-access-token'

    await expect(fetchFacebookProfile(accessToken)).rejects.toThrow('Failed to fetch Facebook profile')
  })

  it('should handle HTTP errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    })

    const accessToken = 'invalid-token'

    await expect(fetchFacebookProfile(accessToken)).rejects.toThrow('Failed to fetch Facebook profile')
  })

  it('should handle rate limiting', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests'
    })

    const accessToken = 'test-access-token'

    await expect(fetchFacebookProfile(accessToken)).rejects.toThrow('Failed to fetch Facebook profile')
  })

  it('should handle missing access token', async () => {
    await expect(fetchFacebookProfile(null)).rejects.toThrow('Access token is required')
    await expect(fetchFacebookProfile('')).rejects.toThrow('Access token is required')
    await expect(fetchFacebookProfile(undefined)).rejects.toThrow('Access token is required')
  })
})
