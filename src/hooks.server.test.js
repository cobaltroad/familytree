/**
 * Unit tests for SvelteKit server hooks
 *
 * Tests the integration of Auth.js with SvelteKit's hooks system.
 * Follows TDD methodology: RED -> GREEN -> REFACTOR
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// We'll need to mock the auth module since it uses dynamic imports
vi.mock('./lib/server/auth.js', async () => {
  const mockHandle = vi.fn(async ({ event, resolve }) => {
    // Simulate Auth.js adding session to event.locals
    event.locals.getSession = vi.fn(async () => ({
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User'
      }
    }))
    return resolve(event)
  })

  return {
    createAuthHandlers: vi.fn(() =>
      Promise.resolve({
        handle: mockHandle,
        signIn: vi.fn(),
        signOut: vi.fn(),
        getSession: vi.fn()
      })
    )
  }
})

describe('SvelteKit Server Hooks', () => {
  let handle

  beforeEach(async () => {
    // Clear all mocks before each test
    vi.clearAllMocks()

    // Import the handle function
    const module = await import('./hooks.server.js')
    handle = module.handle
  })

  describe('handle hook', () => {
    it('should be defined and be a function', () => {
      expect(handle).toBeDefined()
      expect(typeof handle).toBe('function')
    })

    it('should add session to event.locals', async () => {
      const mockEvent = {
        request: new Request('http://localhost:5173/'),
        locals: {}
      }

      const mockResolve = vi.fn((event) => Promise.resolve(new Response('OK')))

      await handle({ event: mockEvent, resolve: mockResolve })

      expect(mockEvent.locals.getSession).toBeDefined()
      expect(typeof mockEvent.locals.getSession).toBe('function')
    })

    it('should allow getting session from event.locals', async () => {
      const mockEvent = {
        request: new Request('http://localhost:5173/'),
        locals: {}
      }

      const mockResolve = vi.fn((event) => Promise.resolve(new Response('OK')))

      await handle({ event: mockEvent, resolve: mockResolve })

      const session = await mockEvent.locals.getSession()

      expect(session).toBeDefined()
      expect(session.user).toBeDefined()
      expect(session.user.id).toBe('test-user-123')
    })

    it('should call resolve with the event', async () => {
      const mockEvent = {
        request: new Request('http://localhost:5173/'),
        locals: {}
      }

      const mockResolve = vi.fn((event) => Promise.resolve(new Response('OK')))

      await handle({ event: mockEvent, resolve: mockResolve })

      expect(mockResolve).toHaveBeenCalledWith(mockEvent)
    })

    it('should return the response from resolve', async () => {
      const mockEvent = {
        request: new Request('http://localhost:5173/'),
        locals: {}
      }

      const expectedResponse = new Response('Test Response')
      const mockResolve = vi.fn(() => Promise.resolve(expectedResponse))

      const response = await handle({ event: mockEvent, resolve: mockResolve })

      expect(response).toBe(expectedResponse)
    })

    it('should handle requests to auth routes', async () => {
      const mockEvent = {
        request: new Request('http://localhost:5173/auth/signin'),
        locals: {}
      }

      const mockResolve = vi.fn((event) => Promise.resolve(new Response('OK')))

      const response = await handle({ event: mockEvent, resolve: mockResolve })

      expect(response).toBeDefined()
      expect(mockResolve).toHaveBeenCalled()
    })

    it('should handle requests to API routes', async () => {
      const mockEvent = {
        request: new Request('http://localhost:5173/api/people'),
        locals: {}
      }

      const mockResolve = vi.fn((event) => Promise.resolve(new Response('OK')))

      const response = await handle({ event: mockEvent, resolve: mockResolve })

      expect(response).toBeDefined()
      expect(mockResolve).toHaveBeenCalled()
    })

    it('should handle requests to static routes', async () => {
      const mockEvent = {
        request: new Request('http://localhost:5173/'),
        locals: {}
      }

      const mockResolve = vi.fn((event) => Promise.resolve(new Response('OK')))

      const response = await handle({ event: mockEvent, resolve: mockResolve })

      expect(response).toBeDefined()
      expect(mockResolve).toHaveBeenCalled()
    })
  })

  describe('Session Management', () => {
    it('should provide getSession helper in event.locals', async () => {
      const mockEvent = {
        request: new Request('http://localhost:5173/'),
        locals: {}
      }

      const mockResolve = vi.fn((event) => Promise.resolve(new Response('OK')))

      await handle({ event: mockEvent, resolve: mockResolve })

      expect(mockEvent.locals.getSession).toBeDefined()
    })

    it('should return session with user data when authenticated', async () => {
      const mockEvent = {
        request: new Request('http://localhost:5173/'),
        locals: {}
      }

      const mockResolve = vi.fn((event) => Promise.resolve(new Response('OK')))

      await handle({ event: mockEvent, resolve: mockResolve })

      const session = await mockEvent.locals.getSession()

      expect(session.user.id).toBe('test-user-123')
      expect(session.user.email).toBe('test@example.com')
      expect(session.user.name).toBe('Test User')
    })
  })

  describe('Error Handling', () => {
    it('should handle errors from resolve gracefully', async () => {
      const mockEvent = {
        request: new Request('http://localhost:5173/'),
        locals: {}
      }

      const mockResolve = vi.fn(() => Promise.reject(new Error('Test error')))

      await expect(handle({ event: mockEvent, resolve: mockResolve })).rejects.toThrow(
        'Test error'
      )
    })

    it('should propagate errors up the stack', async () => {
      const mockEvent = {
        request: new Request('http://localhost:5173/'),
        locals: {}
      }

      const mockResolve = vi.fn(() => {
        throw new Error('Synchronous error')
      })

      await expect(handle({ event: mockEvent, resolve: mockResolve })).rejects.toThrow(
        'Synchronous error'
      )
    })
  })

  describe('Hook Composition', () => {
    it('should be composable with other hooks', async () => {
      const mockEvent = {
        request: new Request('http://localhost:5173/'),
        locals: {}
      }

      // Simulate another hook
      const otherHook = async ({ event, resolve }) => {
        event.locals.customData = 'test'
        return resolve(event)
      }

      const mockResolve = vi.fn((event) => Promise.resolve(new Response('OK')))

      // First apply our auth handle
      await handle({ event: mockEvent, resolve: mockResolve })

      // Then apply another hook
      await otherHook({ event: mockEvent, resolve: mockResolve })

      // Both should have added data to locals
      expect(mockEvent.locals.getSession).toBeDefined()
      expect(mockEvent.locals.customData).toBe('test')
    })
  })
})
