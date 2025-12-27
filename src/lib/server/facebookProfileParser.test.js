import { describe, it, expect } from 'vitest'
import { parseFacebookProfileUrl } from './facebookProfileParser.js'

/**
 * Test suite for Facebook Profile URL Parser
 * Stories #78 and #80: Facebook Profile Picture Import and Data Pre-population
 *
 * Tests parsing various Facebook profile URL formats to extract user ID or username.
 *
 * Supported URL formats:
 * - facebook.com/username
 * - facebook.com/profile.php?id=12345
 * - m.facebook.com/username (mobile)
 * - www.facebook.com/username
 * - facebook.com/people/name/12345
 * - http:// and https://
 */

describe('parseFacebookProfileUrl', () => {
  describe('username-based URLs', () => {
    it('should parse facebook.com/username', () => {
      expect(parseFacebookProfileUrl('facebook.com/zuck')).toBe('zuck')
      expect(parseFacebookProfileUrl('facebook.com/john.doe')).toBe('john.doe')
      expect(parseFacebookProfileUrl('facebook.com/user123')).toBe('user123')
    })

    it('should parse https://facebook.com/username', () => {
      expect(parseFacebookProfileUrl('https://facebook.com/zuck')).toBe('zuck')
      expect(parseFacebookProfileUrl('https://facebook.com/jane.smith')).toBe('jane.smith')
    })

    it('should parse http://facebook.com/username', () => {
      expect(parseFacebookProfileUrl('http://facebook.com/zuck')).toBe('zuck')
    })

    it('should parse www.facebook.com/username', () => {
      expect(parseFacebookProfileUrl('www.facebook.com/zuck')).toBe('zuck')
      expect(parseFacebookProfileUrl('https://www.facebook.com/zuck')).toBe('zuck')
    })

    it('should parse m.facebook.com/username (mobile)', () => {
      expect(parseFacebookProfileUrl('m.facebook.com/zuck')).toBe('zuck')
      expect(parseFacebookProfileUrl('https://m.facebook.com/zuck')).toBe('zuck')
    })

    it('should handle trailing slash', () => {
      expect(parseFacebookProfileUrl('facebook.com/zuck/')).toBe('zuck')
      expect(parseFacebookProfileUrl('https://facebook.com/zuck/')).toBe('zuck')
    })

    it('should ignore query parameters after username', () => {
      expect(parseFacebookProfileUrl('facebook.com/zuck?fref=search')).toBe('zuck')
      expect(parseFacebookProfileUrl('facebook.com/zuck?ref=bookmarks')).toBe('zuck')
    })
  })

  describe('numeric ID-based URLs', () => {
    it('should parse profile.php?id=12345', () => {
      expect(parseFacebookProfileUrl('facebook.com/profile.php?id=12345')).toBe('12345')
      expect(parseFacebookProfileUrl('https://facebook.com/profile.php?id=100000123456789')).toBe('100000123456789')
    })

    it('should parse profile.php with multiple query parameters', () => {
      expect(parseFacebookProfileUrl('facebook.com/profile.php?id=12345&fref=search')).toBe('12345')
      expect(parseFacebookProfileUrl('facebook.com/profile.php?fref=search&id=12345')).toBe('12345')
    })

    it('should handle www and mobile versions with profile.php', () => {
      expect(parseFacebookProfileUrl('www.facebook.com/profile.php?id=12345')).toBe('12345')
      expect(parseFacebookProfileUrl('m.facebook.com/profile.php?id=12345')).toBe('12345')
    })
  })

  describe('people URLs', () => {
    it('should parse facebook.com/people/name/12345', () => {
      expect(parseFacebookProfileUrl('facebook.com/people/John-Doe/12345')).toBe('12345')
      expect(parseFacebookProfileUrl('https://facebook.com/people/Jane-Smith/100000123456789')).toBe('100000123456789')
    })

    it('should handle trailing slash in people URLs', () => {
      expect(parseFacebookProfileUrl('facebook.com/people/John-Doe/12345/')).toBe('12345')
    })
  })

  describe('direct user ID input', () => {
    it('should accept numeric user ID directly', () => {
      expect(parseFacebookProfileUrl('12345')).toBe('12345')
      expect(parseFacebookProfileUrl('100000123456789')).toBe('100000123456789')
    })

    it('should accept username directly (no URL)', () => {
      expect(parseFacebookProfileUrl('zuck')).toBe('zuck')
      expect(parseFacebookProfileUrl('john.doe')).toBe('john.doe')
    })
  })

  describe('error handling', () => {
    it('should return null for invalid inputs', () => {
      expect(parseFacebookProfileUrl(null)).toBe(null)
      expect(parseFacebookProfileUrl(undefined)).toBe(null)
      expect(parseFacebookProfileUrl('')).toBe(null)
      expect(parseFacebookProfileUrl('   ')).toBe(null)
    })

    it('should return null for non-Facebook URLs', () => {
      expect(parseFacebookProfileUrl('https://twitter.com/user')).toBe(null)
      expect(parseFacebookProfileUrl('https://google.com')).toBe(null)
    })

    it('should return null for Facebook URLs without identifiable user', () => {
      expect(parseFacebookProfileUrl('https://facebook.com')).toBe(null)
      expect(parseFacebookProfileUrl('https://facebook.com/')).toBe(null)
      expect(parseFacebookProfileUrl('https://facebook.com/pages')).toBe(null)
    })

    it('should return null for reserved paths', () => {
      // These are Facebook reserved paths, not user profiles
      expect(parseFacebookProfileUrl('facebook.com/help')).toBe(null)
      expect(parseFacebookProfileUrl('facebook.com/privacy')).toBe(null)
      expect(parseFacebookProfileUrl('facebook.com/policies')).toBe(null)
      expect(parseFacebookProfileUrl('facebook.com/pages')).toBe(null)
      expect(parseFacebookProfileUrl('facebook.com/groups')).toBe(null)
    })
  })

  describe('edge cases', () => {
    it('should handle URLs with fragments', () => {
      expect(parseFacebookProfileUrl('facebook.com/zuck#about')).toBe('zuck')
      expect(parseFacebookProfileUrl('facebook.com/zuck#photos')).toBe('zuck')
    })

    it('should handle mixed case URLs', () => {
      expect(parseFacebookProfileUrl('Facebook.com/zuck')).toBe('zuck')
      expect(parseFacebookProfileUrl('FACEBOOK.COM/zuck')).toBe('zuck')
    })

    it('should handle usernames with dots, dashes, and numbers', () => {
      expect(parseFacebookProfileUrl('facebook.com/john.doe.123')).toBe('john.doe.123')
      expect(parseFacebookProfileUrl('facebook.com/user-name-123')).toBe('user-name-123')
    })
  })
})
