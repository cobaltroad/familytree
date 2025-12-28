import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchFacebookProfile,
  fetchFacebookUserProfile,
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

describe('fetchFacebookUserProfile', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = vi.fn()
  })

  it('should fetch any user profile by user ID with correct fields', async () => {
    const mockProfile = {
      id: '987654321',
      first_name: 'Jane',
      last_name: 'Smith',
      birthday: '06/15/1985',
      gender: 'female',
      picture: {
        data: {
          url: 'https://example.com/jane-photo.jpg'
        }
      }
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockProfile,
      headers: {
        get: (name) => 'application/json'
      }
    })

    const accessToken = 'test-access-token'
    const userId = '987654321'
    const result = await fetchFacebookUserProfile(accessToken, userId)

    // Verify fetch was called with correct URL for specific user
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`https://graph.facebook.com/v19.0/${userId}`)
    )

    // Verify fields parameter includes all required fields
    const callUrl = global.fetch.mock.calls[0][0]
    expect(callUrl).toContain('fields=')
    expect(callUrl).toContain('first_name')
    expect(callUrl).toContain('last_name')
    expect(callUrl).toContain('birthday')
    expect(callUrl).toContain('gender')
    expect(callUrl).toContain('picture.type(large)')

    // Verify access token is in URL
    expect(callUrl).toContain(`access_token=${accessToken}`)

    expect(result).toEqual(mockProfile)
  })

  it('should fetch user profile by username', async () => {
    const mockProfile = {
      id: '100000123456789',
      first_name: 'Mark',
      last_name: 'Zuckerberg',
      picture: {
        data: {
          url: 'https://example.com/zuck-photo.jpg'
        }
      }
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockProfile,
      headers: {
        get: (name) => 'application/json'
      }
    })

    const accessToken = 'test-access-token'
    const username = 'zuck'
    const result = await fetchFacebookUserProfile(accessToken, username)

    // Verify fetch was called with username
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`https://graph.facebook.com/v19.0/${username}`)
    )

    expect(result).toEqual(mockProfile)
  })

  it('should request large profile picture', async () => {
    const mockProfile = {
      id: '123',
      first_name: 'Test',
      picture: {
        data: {
          url: 'https://example.com/large-photo.jpg'
        }
      }
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockProfile,
      headers: {
        get: (name) => 'application/json'
      }
    })

    await fetchFacebookUserProfile('token', '123')

    const callUrl = global.fetch.mock.calls[0][0]
    expect(callUrl).toContain('picture.type(large)')
  })

  it('should handle privacy-restricted fields gracefully', async () => {
    // User has restricted birthday and gender from public access
    const mockProfile = {
      id: '123456789',
      first_name: 'Private',
      last_name: 'User',
      picture: {
        data: {
          url: 'https://example.com/photo.jpg'
        }
      }
      // No birthday or gender fields returned
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockProfile,
      headers: {
        get: (name) => 'application/json'
      }
    })

    const result = await fetchFacebookUserProfile('token', '123456789')

    expect(result).toEqual(mockProfile)
    expect(result.birthday).toBeUndefined()
    expect(result.gender).toBeUndefined()
  })

  it('should handle user not found errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    })

    await expect(fetchFacebookUserProfile('token', 'invalid-user')).rejects.toThrow(
      'Failed to fetch Facebook profile'
    )
  })

  it('should handle permission errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden'
    })

    await expect(fetchFacebookUserProfile('token', '123')).rejects.toThrow(
      'Failed to fetch Facebook profile'
    )
  })

  it('should handle network errors', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    await expect(fetchFacebookUserProfile('token', '123')).rejects.toThrow(
      'Failed to fetch Facebook profile'
    )
  })

  it('should handle missing access token', async () => {
    await expect(fetchFacebookUserProfile(null, '123')).rejects.toThrow('Access token is required')
    await expect(fetchFacebookUserProfile('', '123')).rejects.toThrow('Access token is required')
    await expect(fetchFacebookUserProfile(undefined, '123')).rejects.toThrow(
      'Access token is required'
    )
  })

  it('should handle missing user identifier', async () => {
    await expect(fetchFacebookUserProfile('token', null)).rejects.toThrow('User identifier is required')
    await expect(fetchFacebookUserProfile('token', '')).rejects.toThrow('User identifier is required')
    await expect(fetchFacebookUserProfile('token', undefined)).rejects.toThrow(
      'User identifier is required'
    )
  })

  it('should handle Facebook error code 100 subcode 33 (object does not exist)', async () => {
    const errorResponse = {
      error: {
        message: "Object with ID 'kenna.holman.98' does not exist, cannot be loaded due to missing permissions",
        type: 'OAuthException',
        code: 100,
        error_subcode: 33,
        fbtrace_id: 'AbCdEfGhIjK'
      }
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => errorResponse,
      headers: {
        get: (name) => 'application/json'
      }
    })

    await expect(fetchFacebookUserProfile('token', 'kenna.holman.98')).rejects.toThrow(
      'Facebook profile not found or inaccessible'
    )
  })

  it('should handle Facebook error code 100 with missing permissions', async () => {
    const errorResponse = {
      error: {
        message: 'Permissions error',
        type: 'OAuthException',
        code: 100,
        fbtrace_id: 'AbCdEfGhIjK'
      }
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => errorResponse,
      headers: {
        get: (name) => 'application/json'
      }
    })

    await expect(fetchFacebookUserProfile('token', 'someuser')).rejects.toThrow(
      'Facebook profile not found or inaccessible'
    )
  })

  it('should handle Facebook error code 803 (object alias does not exist)', async () => {
    const errorResponse = {
      error: {
        message: "The alias you requested does not exist",
        type: 'OAuthException',
        code: 803,
        fbtrace_id: 'AbCdEfGhIjK'
      }
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => errorResponse,
      headers: {
        get: (name) => 'application/json'
      }
    })

    await expect(fetchFacebookUserProfile('token', 'invalid.username')).rejects.toThrow(
      'Facebook username does not exist'
    )
  })

  it('should handle invalid OAuth token error', async () => {
    const errorResponse = {
      error: {
        message: 'Invalid OAuth access token',
        type: 'OAuthException',
        code: 190,
        fbtrace_id: 'AbCdEfGhIjK'
      }
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => errorResponse,
      headers: {
        get: (name) => 'application/json'
      }
    })

    await expect(fetchFacebookUserProfile('invalid-token', '123')).rejects.toThrow(
      'Invalid access token'
    )
  })

  it('should handle usernames with special characters (dots and numbers)', async () => {
    const mockProfile = {
      id: '100012345678901',
      first_name: 'Kenna',
      last_name: 'Holman',
      picture: {
        data: {
          url: 'https://example.com/kenna-photo.jpg'
        }
      }
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockProfile,
      headers: {
        get: (name) => 'application/json'
      }
    })

    const result = await fetchFacebookUserProfile('token', 'kenna.holman.98')

    // Verify username is passed correctly (should be URL-encoded if needed)
    const callUrl = global.fetch.mock.calls[0][0]
    expect(callUrl).toContain('kenna.holman.98')
    expect(result).toEqual(mockProfile)
  })
})
