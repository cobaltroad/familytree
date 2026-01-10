/**
 * Layout Server Load Function Tests
 *
 * Tests for the server-side layout load function that exposes session data.
 * Following TDD methodology - these tests define the expected behavior.
 *
 * Test coverage:
 * - Load function returns session data
 * - Session is available to all pages via $page.data.session
 * - Handles authenticated and unauthenticated states
 * - Handles missing session gracefully
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { load } from '../../routes/+layout.server.js'

describe('Layout Server Load Function', () => {
  describe('Session Loading', () => {
    it('should return session data when user is authenticated', async () => {
      // Arrange: Mock authenticated event
      const mockSession = {
        user: {
          id: 'fb_12345',
          email: 'user@example.com',
          name: 'Test User',
          image: 'https://example.com/avatar.jpg',
          provider: 'facebook'
        },
        expires: '2025-01-27T00:00:00Z'
      }

      const event = {
        locals: {
          getSession: vi.fn().mockResolvedValue(mockSession)
        }
      }

      // Act: Call load function
      const result = await load(event)

      // Assert: Should return session data
      expect(result).toBeDefined()
      expect(result.session).toEqual(mockSession)
      expect(result.session.user.email).toBe('user@example.com')
    })

    it('should return null session when user is not authenticated', async () => {
      // Arrange: Mock unauthenticated event
      const event = {
        locals: {
          getSession: vi.fn().mockResolvedValue(null)
        }
      }

      // Act: Call load function
      const result = await load(event)

      // Assert: Should return null session
      expect(result).toBeDefined()
      expect(result.session).toBeNull()
    })

    it('should handle missing getSession function gracefully', async () => {
      // Arrange: Mock event without getSession
      const event = {
        locals: {}
      }

      // Act: Call load function
      const result = await load(event)

      // Assert: Should return null session
      expect(result).toBeDefined()
      expect(result.session).toBeNull()
    })

    it('should call event.locals.getSession once', async () => {
      // Arrange: Mock event with spy
      const getSessionSpy = vi.fn().mockResolvedValue({
        user: { id: 'test', email: 'test@example.com' }
      })

      const event = {
        locals: {
          getSession: getSessionSpy
        }
      }

      // Act: Call load function
      await load(event)

      // Assert: getSession should be called exactly once
      expect(getSessionSpy).toHaveBeenCalledTimes(1)
    })

    it('should handle getSession errors gracefully', async () => {
      // Arrange: Mock event with failing getSession
      const event = {
        locals: {
          getSession: vi.fn().mockRejectedValue(new Error('Session retrieval failed'))
        }
      }

      // Act: Call load function
      const result = await load(event)

      // Assert: Should return null session on error
      expect(result).toBeDefined()
      expect(result.session).toBeNull()
    })
  })

  describe('Data Structure', () => {
    it('should return object with session property', async () => {
      // Arrange
      const event = {
        locals: {
          getSession: vi.fn().mockResolvedValue({
            user: { id: 'test', email: 'test@example.com' }
          })
        }
      }

      // Act
      const result = await load(event)

      // Assert
      expect(result).toHaveProperty('session')
      expect(typeof result).toBe('object')
    })

    it('should include user data in session', async () => {
      // Arrange
      const mockSession = {
        user: {
          id: 'fb_test',
          email: 'test@example.com',
          name: 'Test User',
          image: 'https://example.com/avatar.jpg',
          provider: 'facebook'
        }
      }

      const event = {
        locals: {
          getSession: vi.fn().mockResolvedValue(mockSession)
        }
      }

      // Act
      const result = await load(event)

      // Assert
      expect(result.session).toBeDefined()
      expect(result.session.user).toBeDefined()
      expect(result.session.user.id).toBe('fb_test')
      expect(result.session.user.email).toBe('test@example.com')
      expect(result.session.user.name).toBe('Test User')
      expect(result.session.user.provider).toBe('facebook')
    })
  })

  describe('Integration', () => {
    it('should make session available via $page.data.session in components', async () => {
      // This test documents the expected usage pattern
      // In a Svelte component:
      // <script>
      //   import { page } from '$app/stores'
      //   $: session = $page.data.session
      //   $: user = session?.user
      // </script>

      // Arrange
      const mockSession = {
        user: {
          id: 'fb_component_test',
          email: 'component@example.com',
          name: 'Component User'
        }
      }

      const event = {
        locals: {
          getSession: vi.fn().mockResolvedValue(mockSession)
        }
      }

      // Act
      const result = await load(event)

      // Assert: Data structure matches $page.data expectations
      expect(result.session).toBeDefined()
      expect(result.session.user.email).toBe('component@example.com')
    })
  })

  describe('Story #82: Default Person ID Exposure', () => {
    it('should return defaultPersonId when user has one in session', async () => {
      // Arrange: Mock session with defaultPersonId
      const mockSession = {
        user: {
          id: 'fb_12345',
          email: 'user@example.com',
          name: 'Test User',
          defaultPersonId: 42
        }
      }

      const event = {
        locals: {
          getSession: vi.fn().mockResolvedValue(mockSession)
        }
      }

      // Act: Call load function
      const result = await load(event)

      // Assert: Should return defaultPersonId at top level
      expect(result).toBeDefined()
      expect(result.session).toEqual(mockSession)
      expect(result.defaultPersonId).toBe(42)
    })

    it('should return null defaultPersonId when user has no default person', async () => {
      // Arrange: Mock session without defaultPersonId
      const mockSession = {
        user: {
          id: 'fb_12345',
          email: 'user@example.com',
          name: 'Test User'
          // No defaultPersonId
        }
      }

      const event = {
        locals: {
          getSession: vi.fn().mockResolvedValue(mockSession)
        }
      }

      // Act: Call load function
      const result = await load(event)

      // Assert: Should return null defaultPersonId
      expect(result).toBeDefined()
      expect(result.session).toEqual(mockSession)
      expect(result.defaultPersonId).toBeNull()
    })

    it('should return null defaultPersonId when user is not authenticated', async () => {
      // Arrange: Mock unauthenticated event
      const event = {
        locals: {
          getSession: vi.fn().mockResolvedValue(null)
        }
      }

      // Act: Call load function
      const result = await load(event)

      // Assert: Should return null defaultPersonId
      expect(result).toBeDefined()
      expect(result.session).toBeNull()
      expect(result.defaultPersonId).toBeNull()
    })

    it('should make defaultPersonId available via $page.data.defaultPersonId', async () => {
      // This test documents the expected usage pattern
      // In a Svelte component:
      // <script>
      //   import { page } from '$app/stores'
      //   $: defaultPersonId = $page.data.defaultPersonId
      // </script>

      // Arrange: Mock session with defaultPersonId
      const mockSession = {
        user: {
          id: 'fb_82_test',
          email: 'story82@example.com',
          name: 'Story 82 User',
          defaultPersonId: 99
        }
      }

      const event = {
        locals: {
          getSession: vi.fn().mockResolvedValue(mockSession)
        }
      }

      // Act: Call load function
      const result = await load(event)

      // Assert: defaultPersonId should be accessible at top level
      expect(result.defaultPersonId).toBe(99)
      expect(result.session.user.defaultPersonId).toBe(99)
    })

    it('should handle missing session gracefully and return null defaultPersonId', async () => {
      // Arrange: Mock event without getSession
      const event = {
        locals: {}
      }

      // Act: Call load function
      const result = await load(event)

      // Assert: Should return null defaultPersonId
      expect(result).toBeDefined()
      expect(result.session).toBeNull()
      expect(result.defaultPersonId).toBeNull()
    })
  })
})
