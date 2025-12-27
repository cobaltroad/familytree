/**
 * Unit tests for session helper utilities
 *
 * Tests helper functions for managing authentication sessions.
 * Follows TDD methodology: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getSession,
  requireAuth,
  getUserFromSession,
  isAuthenticated
} from './session.js'

describe('Session Helper Utilities', () => {
  describe('getSession()', () => {
    it('should get session from event.locals', async () => {
      const mockEvent = {
        locals: {
          getSession: vi.fn().mockResolvedValue({
            user: {
              id: 'user-123',
              email: 'test@example.com',
              name: 'Test User'
            }
          })
        }
      }

      const session = await getSession(mockEvent)

      expect(session).toBeDefined()
      expect(session.user).toBeDefined()
      expect(session.user.id).toBe('user-123')
      expect(mockEvent.locals.getSession).toHaveBeenCalled()
    })

    it('should return null when no session exists', async () => {
      const mockEvent = {
        locals: {
          getSession: vi.fn().mockResolvedValue(null)
        }
      }

      const session = await getSession(mockEvent)

      expect(session).toBeNull()
    })

    it('should handle missing getSession method', async () => {
      const mockEvent = {
        locals: {}
      }

      const session = await getSession(mockEvent)

      expect(session).toBeNull()
    })

    it('should handle errors from getSession gracefully', async () => {
      const mockEvent = {
        locals: {
          getSession: vi.fn().mockRejectedValue(new Error('Session error'))
        }
      }

      await expect(getSession(mockEvent)).rejects.toThrow('Session error')
    })
  })

  describe('getUserFromSession()', () => {
    it('should extract user from session', async () => {
      const mockEvent = {
        locals: {
          getSession: vi.fn().mockResolvedValue({
            user: {
              id: 'user-123',
              email: 'test@example.com',
              name: 'Test User',
              provider: 'facebook'
            }
          })
        }
      }

      const user = await getUserFromSession(mockEvent)

      expect(user).toBeDefined()
      expect(user.id).toBe('user-123')
      expect(user.email).toBe('test@example.com')
      expect(user.name).toBe('Test User')
      expect(user.provider).toBe('facebook')
    })

    it('should return null when no session exists', async () => {
      const mockEvent = {
        locals: {
          getSession: vi.fn().mockResolvedValue(null)
        }
      }

      const user = await getUserFromSession(mockEvent)

      expect(user).toBeNull()
    })

    it('should return null when session has no user', async () => {
      const mockEvent = {
        locals: {
          getSession: vi.fn().mockResolvedValue({})
        }
      }

      const user = await getUserFromSession(mockEvent)

      expect(user).toBeNull()
    })

    it('should handle missing event.locals', async () => {
      const mockEvent = {}

      const user = await getUserFromSession(mockEvent)

      expect(user).toBeNull()
    })
  })

  describe('isAuthenticated()', () => {
    it('should return true when user is authenticated', async () => {
      const mockEvent = {
        locals: {
          getSession: vi.fn().mockResolvedValue({
            user: {
              id: 'user-123',
              email: 'test@example.com'
            }
          })
        }
      }

      const authenticated = await isAuthenticated(mockEvent)

      expect(authenticated).toBe(true)
    })

    it('should return false when no session exists', async () => {
      const mockEvent = {
        locals: {
          getSession: vi.fn().mockResolvedValue(null)
        }
      }

      const authenticated = await isAuthenticated(mockEvent)

      expect(authenticated).toBe(false)
    })

    it('should return false when session has no user', async () => {
      const mockEvent = {
        locals: {
          getSession: vi.fn().mockResolvedValue({})
        }
      }

      const authenticated = await isAuthenticated(mockEvent)

      expect(authenticated).toBe(false)
    })

    it('should return false when user has no id', async () => {
      const mockEvent = {
        locals: {
          getSession: vi.fn().mockResolvedValue({
            user: {
              email: 'test@example.com'
            }
          })
        }
      }

      const authenticated = await isAuthenticated(mockEvent)

      expect(authenticated).toBe(false)
    })

    it('should handle missing event.locals', async () => {
      const mockEvent = {}

      const authenticated = await isAuthenticated(mockEvent)

      expect(authenticated).toBe(false)
    })
  })

  describe('requireAuth()', () => {
    it('should return session when user is authenticated', async () => {
      const mockEvent = {
        locals: {
          getSession: vi.fn().mockResolvedValue({
            user: {
              id: 'user-123',
              email: 'test@example.com',
              name: 'Test User'
            }
          })
        }
      }

      const session = await requireAuth(mockEvent)

      expect(session).toBeDefined()
      expect(session.user.id).toBe('user-123')
    })

    it('should throw error when not authenticated', async () => {
      const mockEvent = {
        locals: {
          getSession: vi.fn().mockResolvedValue(null)
        }
      }

      await expect(requireAuth(mockEvent)).rejects.toThrow('Authentication required')
    })

    it('should throw error when session has no user', async () => {
      const mockEvent = {
        locals: {
          getSession: vi.fn().mockResolvedValue({})
        }
      }

      await expect(requireAuth(mockEvent)).rejects.toThrow('Authentication required')
    })

    it('should throw error with custom message', async () => {
      const mockEvent = {
        locals: {
          getSession: vi.fn().mockResolvedValue(null)
        }
      }

      await expect(requireAuth(mockEvent, 'Admin access required')).rejects.toThrow(
        'Admin access required'
      )
    })

    it('should include 401 status code in error', async () => {
      const mockEvent = {
        locals: {
          getSession: vi.fn().mockResolvedValue(null)
        }
      }

      try {
        await requireAuth(mockEvent)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error.message).toBe('Authentication required')
        expect(error.status).toBe(401)
      }
    })

    it('should handle missing event.locals', async () => {
      const mockEvent = {}

      await expect(requireAuth(mockEvent)).rejects.toThrow('Authentication required')
    })
  })

  describe('Integration scenarios', () => {
    it('should work in API route handlers', async () => {
      // Simulate an API route handler
      const mockEvent = {
        locals: {
          getSession: vi.fn().mockResolvedValue({
            user: {
              id: 'user-123',
              email: 'test@example.com'
            }
          })
        },
        request: new Request('http://localhost:5173/api/people')
      }

      const user = await getUserFromSession(mockEvent)

      expect(user).toBeDefined()
      expect(user.id).toBe('user-123')
    })

    it('should protect server routes with requireAuth', async () => {
      // Simulate an unauthenticated request to protected route
      const mockEvent = {
        locals: {
          getSession: vi.fn().mockResolvedValue(null)
        },
        request: new Request('http://localhost:5173/api/admin')
      }

      await expect(requireAuth(mockEvent)).rejects.toThrow('Authentication required')
    })

    it('should allow checking authentication status without throwing', async () => {
      const mockEvent = {
        locals: {
          getSession: vi.fn().mockResolvedValue(null)
        }
      }

      // isAuthenticated should return false without throwing
      const authenticated = await isAuthenticated(mockEvent)

      expect(authenticated).toBe(false)
    })

    it('should provide user data for authenticated requests', async () => {
      const mockEvent = {
        locals: {
          getSession: vi.fn().mockResolvedValue({
            user: {
              id: 'user-123',
              email: 'test@example.com',
              name: 'Test User',
              image: 'https://example.com/avatar.jpg',
              provider: 'facebook'
            }
          })
        }
      }

      const user = await getUserFromSession(mockEvent)

      expect(user.id).toBe('user-123')
      expect(user.email).toBe('test@example.com')
      expect(user.name).toBe('Test User')
      expect(user.image).toBe('https://example.com/avatar.jpg')
      expect(user.provider).toBe('facebook')
    })
  })

  describe('Error handling', () => {
    it('should handle session retrieval errors', async () => {
      const mockEvent = {
        locals: {
          getSession: vi.fn().mockRejectedValue(new Error('Database error'))
        }
      }

      await expect(getSession(mockEvent)).rejects.toThrow('Database error')
    })

    it('should create meaningful error for unauthorized access', async () => {
      const mockEvent = {
        locals: {
          getSession: vi.fn().mockResolvedValue(null)
        }
      }

      try {
        await requireAuth(mockEvent)
      } catch (error) {
        expect(error.message).toBe('Authentication required')
        expect(error.status).toBe(401)
      }
    })

    it('should allow custom error messages for different contexts', async () => {
      const mockEvent = {
        locals: {
          getSession: vi.fn().mockResolvedValue(null)
        }
      }

      await expect(requireAuth(mockEvent, 'You must be logged in to view this page')).rejects.toThrow(
        'You must be logged in to view this page'
      )
    })
  })
})
